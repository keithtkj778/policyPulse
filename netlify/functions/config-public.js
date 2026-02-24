/**
 * Public (client-safe) config. Returns only values safe to expose to the browser.
 * Used for pixel ID and optional fallback CTA URL — no tokens or keys.
 */

const { getEnv } = require('./config');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Max-Age': '86400',
            },
            body: '',
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const pixelId = getEnv('FACEBOOK_PIXEL_ID') || '';
    const offerFallbackUrl = getEnv('OFFER_FALLBACK_URL') || '';

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300',
        },
        body: JSON.stringify({
            pixelId,
            offerFallbackUrl,
        }),
    };
};
