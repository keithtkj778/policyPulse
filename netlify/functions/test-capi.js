/*
================================================================================
CAPI PIPELINE TEST FUNCTION (VIA OUR ENDPOINT, NO TEST CODE)
================================================================================
Purpose: Test our Netlify function pipeline by calling /.netlify/functions/facebook-capi with sample event data.
When to Use: To verify our endpoint accepts POST and forwards to Facebook successfully.

How it works:
1) Sends a PageView to our facebook-capi endpoint (not directly to Facebook)
2) Does NOT include test_event_code; may NOT show in Facebook Test Events tab
3) Useful to validate our function route, auth, payload structure, and error handling

How to trigger:
- Browser: https://policypulse.online/.netlify/functions/test-capi
- Terminal: curl https://policypulse.online/.netlify/functions/test-capi

Notes:
- Does NOT appear in Test Events (no test_event_code)
- Use test-facebook-events function if you need to see events in Test Events
================================================================================
*/

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Set function timeout
    context.callbackWaitsForEmptyEventLoop = false;
    
    try {
        // Test data
        const testEvent = {
            event_name: 'PageView',
            _fbp: 'fb.1.1234567890.1234567890',
            fbc: 'fb.1.1234567890.1234567890',
            client_ip_address: '192.168.1.1',
            client_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            page_url: 'https://policypulse.online',
            primary_angle: 'test'
        };

        console.log('Testing Facebook CAPI function with data:', testEvent);

        // Call our CAPI function
        const response = await fetch('https://policypulse.online/.netlify/functions/facebook-capi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testEvent)
        });

        const result = await response.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'CAPI test completed',
                test_data: testEvent,
                capi_response: result
            })
        };

    } catch (error) {
        console.error('Error testing CAPI:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Test failed',
                message: error.message
            })
        };
    }
};
