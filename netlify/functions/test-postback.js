/** GET: calls postback with sample conversion params; returns postback response. */
const fetch = require('node-fetch');
const { SITE_URL } = require('./config');

exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        const testData = {
            s1: 'AFFILIATE_ID',
            s2: `session_${Date.now()}`,
            s3: 'fb.1.test.fbp.placeholder',
            s4: 'fb.1.test.fbc.placeholder',
            s5: 'Mozilla/5.0 (compatible; TestPostback/1.0)',
            OFFID: 'TEST123',
            IP: '192.168.1.1',
            RATE: '50.00',
            SALE: '7.00',
            CONVERSION_ID: `test_conv_${Date.now()}`,
        };

        const base = (SITE_URL || 'https://policypulse.online').replace(/\/$/, '');
        const postbackUrl = `${base}/.netlify/functions/postback`;
        const queryString = new URLSearchParams(testData).toString();
        const response = await fetch(`${postbackUrl}?${queryString}`);
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
