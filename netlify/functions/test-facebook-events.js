/** GET: sends test events to Facebook CAPI with test_event_code (shows in Test Events tab). */
const { sendFacebookEvents, buildUserData } = require('./facebook-lib');
const { FACEBOOK_PIXEL_ID, FACEBOOK_ACCESS_TOKEN, SITE_URL } = require('./config');

exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        const testEventCode = 'TEST92722';
        
        // Derive client IP and user agent from the incoming request (like index.html does via get-ip)
        const clientIpHeader = event.headers['client-ip'] || event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || '';
        const clientIp = (clientIpHeader || '').split(',')[0].trim() || 'unknown';
        const clientUserAgent = event.headers['user-agent'] || 'unknown';

        // Build three events to mimic your site: PageView, CTAClicked, Lead
        const now = Math.floor(Date.now() / 1000);
        const testUserData = buildUserData({
            fbp: 'fb.1.1234567890.1234567890',
            fbc: 'fb.1.1234567890.1234567890',
            clientIp: clientIp,
            clientUserAgent: clientUserAgent
        });

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
            event_source_url: SITE_URL || 'https://your-site.netlify.app',
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
            event_source_url: SITE_URL || 'https://your-site.netlify.app',
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
            event_source_url: SITE_URL || 'https://your-site.netlify.app',
            event_id: `test_lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        const testEvent = {
            data: [pageViewEvent, ctaClickedEvent, leadEvent],
            // Test event code must be at root level
            test_event_code: testEventCode
        };

        console.log('Sending test event via shared lib with test code:', testEventCode);
        console.log('Test event data:', JSON.stringify(testEvent, null, 2));

        const result = await sendFacebookEvents({
            pixelId: FACEBOOK_PIXEL_ID,
            accessToken: FACEBOOK_ACCESS_TOKEN,
            payload: testEvent
        });

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
