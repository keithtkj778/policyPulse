/** MaxBounty conversion postback: receives callback, maps s3→fbp, s4→fbc, s5→user_agent, fires Lead to CAPI. */
/** Callback URL for dashboard: {SITE_URL}/.netlify/functions/postback?s1=#S1#&s2=#S2#&s3=#S3#&s4=#S4#&s5=#S5#&OFFID=#OFFID#&IP=#IP#&RATE=#RATE#&SALE=#SALE#&CONVERSION_ID=#CONVERSION_ID# */

const fetch = require('node-fetch');
const { SITE_URL } = require('./config');

exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    const hasParams = event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0;
    if (!hasParams) return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, message: 'No params (health check)' }) };

    try {
        const { s1, s2, s3, s4, s5, OFFID, IP, RATE, SALE, CONVERSION_ID } = event.queryStringParameters || {};
        const fbp = s3;
        const fbc = s4;
        const userAgent = s5 || 'MaxBounty Postback';
        const userIP = IP;

        await fireFacebookPixelLead({
            fbp, fbc, campaignId: OFFID, ip: userIP, userAgent, rate: RATE, sale: SALE, conversionId: CONVERSION_ID
        });

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
        console.error('🚨 [postback] CRITICAL ERROR: Exception processing MaxBounty postback', {
            error: error.message,
            stack: error.stack,
            query_params: event.queryStringParameters,
            timestamp: new Date().toISOString()
        });
        
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

async function fireFacebookPixelLead(trackingData) {
    try {
        const eventData = {
            event_name: 'Lead',
            _fbp: trackingData.fbp || '',
            fbc: trackingData.fbc || '',
            client_ip_address: trackingData.ip || 'unknown',
            client_user_agent: trackingData.userAgent || 'MaxBounty Postback',
            value: trackingData.sale || 7,
            event_id: trackingData.conversionId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        const capiUrl = `${SITE_URL.replace(/\/$/, '')}/.netlify/functions/facebook-capi`;
        const response = await fetch(capiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        if (!response.ok) console.error('[postback] CAPI error', response.status, await response.text());
    } catch (error) {
        console.error('[postback] fireFacebookPixelLead error:', error.message);
    }
}
