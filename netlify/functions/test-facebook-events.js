/*
================================================================================
FACEBOOK EVENTS TEST FUNCTION
================================================================================
Purpose: Tests Facebook Conversions API directly with test event code
When Used: For verifying Facebook CAPI setup with Events Manager test code
Process: 1. Sends test event directly to Facebook with test_event_code
         2. Uses test code TEST50276 for Facebook Events Manager validation
         3. Returns success/failure response
Facebook Integration: Sends to Facebook's API directly, not through our CAPI function
================================================================================
*/

const fetch = require('node-fetch');

// Facebook Pixel API configuration
const FACEBOOK_PIXEL_ID = '1601325491243806';
const FACEBOOK_ACCESS_TOKEN = 'EAAZA3IukzApIBP59YeDce8KudQBnfwRU8mV5n0lkTBrfnyKlvjQj8qwniiBOBEyQWasssZAYohRmqOEvQVq9Aj6P10gSKuUqmvkZBl75qyBQjZAbegV4eZBfUGucKBrktvVoXWXc6xGEMaP5hlZBOXHLhN0ijFlGbOkUO2RvBGIbCYefdqMNwIsr9BAYt56wZDZD';

// Facebook Conversions API endpoint
const FACEBOOK_CONVERSIONS_API = `https://graph.facebook.com/v18.0/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;

exports.handler = async (event, context) => {
    // Set function timeout
    context.callbackWaitsForEmptyEventLoop = false;
    
    try {
        // Test event code from Facebook Events Manager
        const testEventCode = 'TEST50276';
        
        // Test data with the test event code
        const testEvent = {
            data: [{
                event_name: 'PageView',
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'website',
                user_data: {
                    client_ip_address: '192.168.1.1',
                    client_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    fbp: 'fb.1.1234567890.1234567890',
                    fbc: 'fb.1.1234567890.1234567890'
                },
                custom_data: {
                    content_name: 'Health Insurance Lead Test',
                    content_category: 'Health Insurance',
                    value: 0,
                    currency: 'USD'
                },
                event_source_url: 'https://policypulse.online',
                event_id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }],
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
