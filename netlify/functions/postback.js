const fetch = require('node-fetch');
const { getTrackingData, deleteTrackingData } = require('./redis-cache');

/*
================================================================================
MAXBOUNTY CALLBACK URL - COPY THIS TO MAXBOUNTY DASHBOARD:
================================================================================
https://policypulse.online/.netlify/functions/postback?s1=#S1#&s2=#S2#&s3=#S3#&s4=#S4#&s5=#S5#&s6=#S6#&s7=#S7#&OFFID=#OFFID#&IP=#IP#&RATE=#RATE#&SALE=#SALE#&CONVERSION_ID=#CONVERSION_ID#

Instructions:
1. Go to MaxBounty Dashboard
2. Navigate to your campaign settings
3. Find "Callbacks" or "Postbacks" section
4. Paste the URL above
5. Save settings

Parameter Mapping:
- #S1# = MaxBounty Affiliate ID (765749)
- #S2# = MaxBounty Session ID (328562336)
- #S3# = Your Angle (one_bill_away, family_shield, etc.)
- #S4# = Your Facebook Pixel ID (fb.1.1234567890.1234567890)
- #S5# = Your Facebook Click ID (fb.1.1234567890.1234567890)
- #S6# = Your Real User IP Address
- #S7# = Your Real User Agent
- #OFFID# = Campaign ID
- #IP# = MaxBounty IP Address
- #RATE# = Commission Rate
- #SALE# = Sale Amount
- #CONVERSION_ID# = Conversion ID
================================================================================
*/

// Facebook Pixel API configuration
const FACEBOOK_PIXEL_ID = 'YOUR_NEW_PIXEL_ID'; // Replace with your new pixel ID
const FACEBOOK_ACCESS_TOKEN = 'EAAZA3IukzApIBP59YeDce8KudQBnfwRU8mV5n0lkTBrfnyKlvjQj8qwniiBOBEyQWasssZAYohRmqOEvQVq9Aj6P10gSKuUqmvkZBl75qyBQjZAbegV4eZBfUGucKBrktvVoXWXc6xGEMaP5hlZBOXHLhN0ijFlGbOkUO2RvBGIbCYefdqMNwIsr9BAYt56wZDZD'; // Replace with your new access token

// Facebook Conversions API endpoint
const FACEBOOK_CONVERSIONS_API = `https://graph.facebook.com/v18.0/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;

exports.handler = async (event, context) => {
    // Set function timeout
    context.callbackWaitsForEmptyEventLoop = false;
    
    // Log the incoming request
    console.log('MaxBounty postback received:', {
        method: event.httpMethod,
        queryString: event.queryStringParameters,
        headers: event.headers,
        body: event.body
    });

    try {
        // Extract MaxBounty callback parameters
        const {
            s1,      // MaxBounty affiliate ID (765749)
            s2,      // MaxBounty session ID (328562336)
            s3,      // Our angle parameter
            s4,      // Our Facebook pixel ID (fbp)
            s5,      // Our Facebook click ID (fbc)
            s6,      // Our real user IP address (from MaxBounty postback)
            s7,      // Our real user agent (from MaxBounty postback)
            OFFID,   // Campaign ID
            IP,      // MaxBounty's IP address
            RATE,    // Commission rate
            SALE,    // Sale amount
            CONVERSION_ID // Conversion ID
        } = event.queryStringParameters || {};

        // Map to our tracking variables
        const fbp = s4;    // Our fbp is in s4
        const fbc = s5;    // Our fbc is in s5
        
        // Try to get real user data from Redis cache
        let userIP = IP;    // Default to MaxBounty's IP
        let userAgent = 'MaxBounty Postback';    // Default user agent
        
        if (fbp && fbc) {
            const cachedData = await getTrackingData(fbp, fbc);
            if (cachedData) {
                userIP = cachedData.userIP || IP;
                userAgent = cachedData.userAgent || 'MaxBounty Postback';
                console.log('Retrieved real user data from cache:', { userIP, userAgent });
                
                // Clean up cache after use
                await deleteTrackingData(fbp, fbc);
            } else {
                console.log('No cached data found, using MaxBounty data');
            }
        }

        console.log('Extracted tracking data:', {
            fbp: fbp,
            fbc: fbc,
            maxBountyAffiliateId: s1,
            maxBountySessionId: s2,
            campaignId: OFFID,
            ip: IP,
            rate: RATE,
            sale: SALE,
            conversionId: CONVERSION_ID
        });

        // Validate required parameters
        if (!fbp || !fbc) {
            console.log('Missing required tracking parameters');
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing required parameters' })
            };
        }

        // Fire Facebook Pixel Lead event
        await fireFacebookPixelLead({
            fbp: fbp,          // Facebook pixel ID (from s4)
            fbc: fbc,          // Facebook click ID (from s5)
            campaignId: OFFID,
            ip: userIP,        // Real user IP (from s6)
            userAgent: userAgent, // Real user agent (from s7)
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
        console.error('Error processing postback:', error);
        
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

// Fire Facebook Pixel Lead event via Conversions API
async function fireFacebookPixelLead(trackingData) {
    try {
        const eventData = {
            data: [{
                event_name: 'Lead',
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'website',
                user_data: {
                    client_ip_address: trackingData.ip,
                    client_user_agent: trackingData.userAgent,
                    fbp: trackingData.fbp,
                    fbc: trackingData.fbc
                },
                custom_data: {
                    content_name: 'Health Insurance Lead',
                    content_category: 'Health Insurance',
                    value: trackingData.sale || 7,  // Default $50 per lead if no sale amount
                    currency: 'USD'
                },
                event_source_url: 'https://policypulse.online',
                event_id: trackingData.conversionId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }]
        };

        console.log('Firing Facebook Pixel Lead event:', eventData);

        const response = await fetch(FACEBOOK_CONVERSIONS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Facebook Pixel Lead event fired successfully:', result);
        } else {
            const error = await response.text();
            console.error('Facebook Pixel Lead event failed:', error);
        }

    } catch (error) {
        console.error('Error firing Facebook Pixel Lead event:', error);
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
