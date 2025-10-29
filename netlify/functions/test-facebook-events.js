/*
================================================================================
FACEBOOK EVENTS TEST FUNCTION (DIRECT TO FB + TEST CODE)
================================================================================
Purpose: Send a DIRECT server event to Facebook's Conversions API using a test_event_code.
When to Use: To validate in Facebook Events Manager > Test Events that your Pixel receives server events.

How it works:
1) Sends a PageView directly to Facebook's /events endpoint (bypasses our CAPI function)
2) Includes test_event_code = TEST98765 so it appears in the Test Events tab
3) Verifies Pixel ID + Access Token are valid and accepted by Facebook

How to trigger:
- Browser: https://policypulse.online/.netlify/functions/test-facebook-events
- Terminal: curl https://policypulse.online/.netlify/functions/test-facebook-events

Notes:
- APPEARS in the Test Events stream (because test_event_code is included)
- Does NOT validate our facebook-capi function path; it talks to Facebook directly
================================================================================
*/

const fetch = require('node-fetch');

// Facebook Pixel API configuration
const FACEBOOK_PIXEL_ID = '2268409500330056';
const FACEBOOK_ACCESS_TOKEN = 'EAAQbjZBojicsBP85ZCvTbiLMQ6WA9RIlnNZCiDILZAdZAZCaqDYvVhYbqIiZBCUlZBksVpD5oi7ocZCNqjVsliyKrUKZBpaERiKi57PT9VlmyV4zulVOdPM1SlSUVibrevaf5zWUfSesinCRQureCXLPmjuqqUMKZBOq67RUooj0DRSaDcECmEa4x7QN2TuC4POcf4ilQZDZD';

// Facebook Conversions API endpoint
const FACEBOOK_CONVERSIONS_API = `https://graph.facebook.com/v18.0/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;

exports.handler = async (event, context) => {
    // Set function timeout
    context.callbackWaitsForEmptyEventLoop = false;
    
    try {
        // Test event code from Facebook Events Manager
        const testEventCode = 'TEST98765';
        
        // Build three events to mimic your site: PageView, CTAClicked, Lead
        const now = Math.floor(Date.now() / 1000);
        const testUserData = {
            client_ip_address: '192.168.1.1',
            client_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            fbp: 'fb.1.1234567890.1234567890',
            fbc: 'fb.1.1234567890.1234567890'
        };

        const pageViewEvent = {
            event_name: 'PageView',
            event_time: now,
            action_source: 'website',
            user_data: testUserData,
            custom_data: {
                content_name: 'Health Insurance Lead',
                content_category: 'Health Insurance',
                value: 0,
                currency: 'USD',
                primary_angle: 'one_bill_away'
            },
            event_source_url: 'https://policypulse.online',
            event_id: `test_pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        const ctaClickedEvent = {
            event_name: 'CTAClicked',
            event_time: now,
            action_source: 'website',
            user_data: testUserData,
            custom_data: {
                content_name: 'Health Insurance Lead',
                content_category: 'Health Insurance',
                value: 3,
                currency: 'USD',
                primary_angle: 'one_bill_away',
                page_duration: 5,
                conversion_trigger: 'direct_cta'
            },
            event_source_url: 'https://policypulse.online',
            event_id: `test_cta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        const leadEvent = {
            event_name: 'Lead',
            event_time: now,
            action_source: 'website',
            user_data: testUserData,
            custom_data: {
                content_name: 'Health Insurance Lead',
                content_category: 'Health Insurance',
                value: 7,
                currency: 'USD',
                primary_angle: 'one_bill_away',
                page_duration: 12,
                conversion_trigger: 'test_lead'
            },
            event_source_url: 'https://policypulse.online',
            event_id: `test_lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        const testEvent = {
            data: [pageViewEvent, ctaClickedEvent, leadEvent],
            // Test event code must be at root level
            test_event_code: testEventCode
        };

        console.log('Sending test event to Facebook with test code:', testEventCode);
        console.log('Test event data:', JSON.stringify(testEvent, null, 2));

        // Send test event to Facebook Conversions API
        const response = await fetch(FACEBOOK_CONVERSIONS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testEvent)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Test event sent successfully:', result);
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Test event sent to Facebook Conversions API',
                    test_event_code: testEventCode,
                    facebook_response: result,
                    instructions: [
                        '1. Keep the Facebook Events Manager Test Events tab open',
                        '2. Check if the test event appears in the Test Events tab',
                        '3. Verify the event shows "Server" as the source',
                        '4. If successful, your CAPI setup is working correctly!'
                    ]
                })
            };
        } else {
            const error = await response.text();
            console.error('Test event failed:', error);
            
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Test event failed',
                    details: error,
                    test_event_code: testEventCode
                })
            };
        }

    } catch (error) {
        console.error('Error in test function:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
