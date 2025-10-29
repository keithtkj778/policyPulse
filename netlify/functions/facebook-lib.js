const fetch = require('node-fetch');

// Standardized user data builder - ensures all files use same structure
function buildUserData({ fbp, fbc, clientIp, clientUserAgent }) {
    return {
        client_ip_address: clientIp ? clientIp.split(',')[0].trim() : 'unknown',
        client_user_agent: clientUserAgent || 'unknown',
        fbp: fbp || '',
        fbc: fbc || ''
    };
}

async function sendFacebookEvents({ pixelId, accessToken, payload }) {
    if (!pixelId || !accessToken) {
        throw new Error('Missing Facebook Pixel ID or Access Token');
    }
    const endpoint = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        const err = new Error(`Facebook CAPI error: ${errorText}`);
        err.status = response.status;
        throw err;
    }

    return response.json();
}

module.exports = {
    sendFacebookEvents,
    buildUserData
};


