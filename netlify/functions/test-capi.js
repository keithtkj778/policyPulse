/** GET: sends a test PageView to facebook-capi (no test_event_code). */
const fetch = require('node-fetch');
const { SITE_URL } = require('./config');

exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        const testEvent = {
            event_name: 'PageView',
            _fbp: 'fb.1.1234567890.1234567890',
            fbc: 'fb.1.1234567890.1234567890',
            client_ip_address: '192.168.1.1',
            client_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            page_url: SITE_URL || 'https://policypulse.online',
            primary_angle: 'test'
        };
        const base = (SITE_URL || 'https://policypulse.online').replace(/\/$/, '');
        const response = await fetch(`${base}/.netlify/functions/facebook-capi`, {
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
