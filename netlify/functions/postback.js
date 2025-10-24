const fetch = require('node-fetch');

// Facebook Pixel API configuration
const FACEBOOK_PIXEL_ID = 'YOUR_PIXEL_ID'; // Replace with your actual pixel ID
const FACEBOOK_ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'; // Replace with your access token

// Facebook Conversions API endpoint
const FACEBOOK_CONVERSIONS_API = `https://graph.facebook.com/v18.0/${FACEBOOK_PIXEL_ID}/events`;

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
            s1,      // Original angle parameter
            s2,      // Original Facebook pixel ID (fbp)
            s3,      // Original Facebook click ID (fbc)
            s4,      // Additional tracking data
            s5,      // Additional tracking data
            OFFID,   // Campaign ID
            IP,      // User IP address
            RATE,    // Commission rate
            SALE,    // Sale amount
            CONVERSION_ID // Conversion ID
        } = event.queryStringParameters || {};

        console.log('Extracted tracking data:', {
            angle: s1,
            fbp: s2,
            fbc: s3,
            campaignId: OFFID,
            ip: IP,
            rate: RATE,
            sale: SALE,
            conversionId: CONVERSION_ID
        });

        // Validate required parameters
        if (!s1 || !s2 || !s3) {
            console.log('Missing required tracking parameters');
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing required parameters' })
            };
        }

        // Fire Facebook Pixel Lead event
        await fireFacebookPixelLead({
            fbp: s2,           // Facebook pixel ID
            fbc: s3,           // Facebook click ID
            angle: s1,         // Original angle
            campaignId: OFFID,
            ip: IP,
            rate: RATE,
            sale: SALE,
            conversionId: CONVERSION_ID
        });

        // Fire additional tracking events
        await fireAdditionalTracking({
            angle: s1,
            fbp: s2,
            fbc: s3,
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
                    angle: s1,
                    fbp: s2,
                    fbc: s3,
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
                    client_user_agent: 'MaxBounty Postback',
                    fbp: trackingData.fbp,
                    fbc: trackingData.fbc
                },
                custom_data: {
                    content_name: `Health Insurance Lead - ${trackingData.angle}`,
                    content_category: 'Health Insurance',
                    value: trackingData.sale || 0,
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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FACEBOOK_ACCESS_TOKEN}`
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
            angle: trackingData.angle,
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
