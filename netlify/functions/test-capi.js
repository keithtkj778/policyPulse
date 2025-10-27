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
