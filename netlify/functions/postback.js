/*
================================================================================
MAXBOUNTY CONVERSION POSTBACK FUNCTION
================================================================================
Purpose: Receives conversion notifications from MaxBounty and fires Facebook Lead events
When Used: Called by MaxBounty when a user converts (completes the offer)
Process: 1. Receives conversion data from MaxBounty callback
         2. Extracts fbp, fbc, user_agent from URL parameters
         3. Uses MaxBounty's IP address directly
         4. Fires Lead event to Facebook Conversions API
Data Flow: MaxBounty → This Function → Facebook CAPI → Facebook Events Manager
================================================================================
*/

const fetch = require('node-fetch');
const { buildUserData } = require('./facebook-lib');

/*
================================================================================
MAXBOUNTY CALLBACK URL - COPY THIS TO MAXBOUNTY DASHBOARD:
================================================================================
https://policypulse.online/.netlify/functions/postback?s1=#S1#&s2=#S2#&s3=#S3#&s4=#S4#&s5=#S5#&OFFID=#OFFID#&IP=#IP#&RATE=#RATE#&SALE=#SALE#&CONVERSION_ID=#CONVERSION_ID#

Instructions:
1. Go to MaxBounty Dashboard
2. Navigate to your campaign settings
3. Find "Callbacks" or "Postbacks" section
4. Paste the URL above
5. Save settings

Parameter Mapping:
- #S1# = MaxBounty Affiliate ID (765749)
- #S2# = MaxBounty Session ID (auto-generated)
- #S3# = Facebook Browser ID (fbp) - appended by go-firstquote.js
- #S4# = Facebook Click ID (fbc) - appended by go-firstquote.js
- #S5# = User Agent String - appended by go-firstquote.js
- #OFFID# = Campaign ID
- #IP# = User IP Address from MaxBounty (used directly)
- #RATE# = Commission Rate
- #SALE# = Sale Amount
- #CONVERSION_ID# = Conversion ID
================================================================================
*/

// Note: Facebook API configuration is now handled in facebook-capi.js function

exports.handler = async (event, context) => {
    // Set function timeout
    context.callbackWaitsForEmptyEventLoop = false;
    
    // Log the incoming request with key info
    const hasParams = event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0;
    console.log(`✅ [postback] MaxBounty postback received: ${event.httpMethod}`, {
        has_params: hasParams,
        param_count: hasParams ? Object.keys(event.queryStringParameters).length : 0,
        user_agent: event.headers['user-agent']?.substring(0, 50) || 'unknown',
        ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown'
    });

    if (!hasParams) {
        console.warn('⚠️  [postback] WARN: No query parameters received - likely a verification/health check call');
    }

    try {
        // Extract MaxBounty callback parameters
        const {
            s1,      // MaxBounty affiliate ID (765749)
            s2,      // MaxBounty session ID (auto-generated)
            s3,      // Facebook Browser ID (fbp) - appended by go-firstquote.js
            s4,      // Facebook Click ID (fbc) - appended by go-firstquote.js
            s5,      // User Agent String - appended by go-firstquote.js
            OFFID,   // Campaign ID
            IP,      // User IP Address from MaxBounty
            RATE,    // Commission rate
            SALE,    // Sale amount
            CONVERSION_ID // Conversion ID
        } = event.queryStringParameters || {};

        // Map to our tracking variables
        const fbp = s3;    // Facebook Browser ID from s3
        const fbc = s4;    // Facebook Click ID from s4
        const userAgent = s5 || 'MaxBounty Postback';  // User Agent from s5
        const userIP = IP; // Use MaxBounty's IP parameter directly

        console.log(`📊 [postback] Extracted conversion data:`, {
            affiliate_id: s1 || 'MISSING',
            session_id: s2 || 'MISSING',
            fbp: fbp ? `${fbp.substring(0, 20)}...` : '❌ MISSING',
            fbc: fbc ? `${fbc.substring(0, 20)}...` : '❌ MISSING',
            user_agent: userAgent !== 'MaxBounty Postback' ? '✅ present' : '⚠️ missing',
            campaign_id: OFFID || 'MISSING',
            conversion_id: CONVERSION_ID || 'MISSING',
            ip: IP || 'MISSING',
            rate: RATE || 'MISSING',
            sale: SALE || 'MISSING'
        });

        // Log warning if tracking parameters are missing (but still proceed to send)
        if (!fbp || !fbc) {
            console.warn(`⚠️  [postback] RED FLAG: Missing fbp/fbc for conversion! Will send with reduced match quality`, {
                has_fbp: !!fbp,
                has_fbc: !!fbc,
                has_ip: !!userIP && userIP !== 'unknown',
                has_user_agent: userAgent !== 'MaxBounty Postback'
            });
        } else {
            console.log(`✅ [postback] All tracking params present - good match quality expected`);
        }

        if (!s1) {
            console.warn(`⚠️  [postback] WARN: Missing MaxBounty affiliate ID (s1) - cannot verify source`);
        }

        // Fire Facebook Pixel Lead event via our CAPI function (always send, even if fbp/fbc missing)
        await fireFacebookPixelLead({
            fbp: fbp,          // Facebook Browser ID (from s3)
            fbc: fbc,          // Facebook Click ID (from s4)
            campaignId: OFFID,
            ip: userIP,        // User IP from MaxBounty's IP parameter
            userAgent: userAgent, // User agent from s5 (appended by go-firstquote.js)
            rate: RATE,
            sale: SALE,
            conversionId: CONVERSION_ID
        });

        // Fire additional tracking events
        await fireAdditionalTracking({
            fbp: fbp,
            fbc: fbc,
            campaignId: OFFID,
            ip: IP,
            rate: RATE,
            sale: SALE,
            conversionId: CONVERSION_ID
        });

        // Return success response
        console.log(`✅ [postback] Conversion processing complete`, {
            conversion_id: CONVERSION_ID,
            campaign_id: OFFID,
            rate: RATE,
            sale: SALE
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            body: JSON.stringify({
                success: true,
                message: 'Conversion tracked successfully',
                data: {
                    fbp: fbp,
                    fbc: fbc,
                    campaignId: OFFID,
                    conversionId: CONVERSION_ID
                }
            })
        };

    } catch (error) {
        console.error('🚨 [postback] CRITICAL ERROR: Exception processing MaxBounty postback', {
            error: error.message,
            stack: error.stack,
            query_params: event.queryStringParameters,
            timestamp: new Date().toISOString()
        });
        
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

// Fire Facebook Pixel Lead event via our CAPI function
async function fireFacebookPixelLead(trackingData) {
    try {
        const eventData = {
            event_name: 'Lead',
            _fbp: trackingData.fbp || '',  // Empty string if missing (Facebook will match using IP/user agent)
            fbc: trackingData.fbc || '',    // Empty string if missing
            client_ip_address: trackingData.ip || 'unknown',
            client_user_agent: trackingData.userAgent || 'MaxBounty Postback',
            value: trackingData.sale || 7,  // Default $7 per lead if no sale amount
            event_id: trackingData.conversionId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        console.log(`📤 [postback] Sending Lead event to Facebook CAPI`, {
            event_id: eventData.event_id,
            has_fbp: !!eventData._fbp && eventData._fbp !== '',
            has_fbc: !!eventData.fbc && eventData.fbc !== '',
            has_ip: eventData.client_ip_address !== 'unknown',
            value: eventData.value
        });

        // Call our internal CAPI function
        const response = await fetch('https://policypulse.online/.netlify/functions/facebook-capi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ [postback] SUCCESS: Lead event sent to Facebook`, {
                event_id: result.event_id,
                facebook_response: result.facebook_response
            });
        } else {
            const error = await response.text();
            console.error(`🚨 [postback] ERROR: Failed to send Lead event to Facebook CAPI`, {
                status: response.status,
                error: error.substring(0, 500),
                event_data: {
                    event_id: eventData.event_id,
                    has_fbp: !!eventData._fbp
                }
            });
        }

    } catch (error) {
        console.error('🚨 [postback] CRITICAL ERROR: Exception while sending Lead event to CAPI', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}

// Fire additional tracking events (GTM, Stape, etc.)
async function fireAdditionalTracking(trackingData) {
    try {
        // Log conversion for analytics
        console.log('Conversion tracked:', {
            timestamp: new Date().toISOString(),
            fbp: trackingData.fbp,
            fbc: trackingData.fbc,
            campaignId: trackingData.campaignId,
            ip: trackingData.ip,
            rate: trackingData.rate,
            sale: trackingData.sale,
            conversionId: trackingData.conversionId
        });

        // Here you can add additional tracking services:
        // - Google Analytics
        // - Stape server
        // - Custom analytics
        // - Email notifications
        // - Slack notifications
        // - Database logging

    } catch (error) {
        console.error('Error in additional tracking:', error);
    }
}
