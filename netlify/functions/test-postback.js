/*
================================================================================
POSTBACK TEST FUNCTION
================================================================================
Purpose: Tests the MaxBounty postback function with sample conversion data
When Used: For debugging and verifying postback function works correctly
Process: 1. Sends test conversion data to postback function
         2. Simulates MaxBounty callback with sample parameters
         3. Returns response for verification
Test Data: Uses sample fbp, fbc, IP, and conversion data for testing
================================================================================
*/

const fetch = require('node-fetch');

/*
================================================================================
MAXBOUNTY POSTBACK TEST RECEIVER (LOCAL ECHO)
================================================================================
Purpose: Simple endpoint to simulate/inspect incoming MaxBounty postbacks.
When to Use: To verify MaxBounty can reach your callback URL and sends expected params.

How it works:
1) Accepts any GET query params and returns them in JSON (echo)
2) Does NOT forward to Facebook; this is for inspection only

How to trigger:
- Browser: https://policypulse.online/.netlify/functions/test-postback?s1=foo&s4=fbp&s5=fbc
- MaxBounty: Temporarily use this URL in dashboard to test connectivity

Notes:
- For real conversions, use /.netlify/functions/postback which forwards to Facebook CAPI
================================================================================
*/

exports.handler = async (event, context) => {
    // Set function timeout
    context.callbackWaitsForEmptyEventLoop = false;
    
    // Log the incoming request
    console.log('Test postback received:', {
        method: event.httpMethod,
        queryString: event.queryStringParameters,
        headers: event.headers
    });

    try {
        // Simulate MaxBounty postback data with real fbp/fbc from your test
        const testData = {
            s1: '765749',  // MaxBounty affiliate ID
            s2: '328562336',  // MaxBounty session ID
            s3: 'fb.1.1754991234622.302113103515532984',  // fbp (from your logs)
            s4: 'fb.1.1756275347512.IwY2xjawMbgeJleHRuA2FlbQIxMQBicmlkETFuSFFFVkxWMGNzZ0N2c3dPAR5w-fxcaeJomPWG4o4Y65J2rFLHgCieWA3ORBBNjt2-xsUF0KblTtdwEvj_9g_aem_LMUebldVbtLLM0qDw5oOmw',  // fbc (from your logs)
            s5: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',  // user agent
            OFFID: 'TEST123',  // Campaign ID
            IP: '58.185.11.2',  // Real IP (from your logs)
            RATE: '50.00',  // Commission rate
            SALE: '7.00',  // Sale amount
            CONVERSION_ID: `test_conv_${Date.now()}`  // Conversion ID
        };

        // Call the actual postback function
        const postbackUrl = 'https://policypulse.online/.netlify/functions/postback';
        const queryString = new URLSearchParams(testData).toString();
        const fullUrl = `${postbackUrl}?${queryString}`;

        console.log('Calling postback with test data:', fullUrl);

        const response = await fetch(fullUrl);
        const result = await response.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'Test postback completed - Lead event should appear in Facebook Events Manager',
                test_data: testData,
                postback_response: result,
                instructions: [
                    '1. Check Facebook Events Manager → Events tab',
                    '2. Look for Lead event with source "Server"',
                    '3. Verify conversion data matches test data',
                    '4. Event should appear within 1-2 minutes'
                ]
            })
        };

    } catch (error) {
        console.error('Test postback error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Test postback failed',
                message: error.message
            })
        };
    }
};
