const fetch = require('node-fetch');

// Helper function to check if IP is IPv6
const isIPv6 = (ip) => {
    if (!ip) return false;
    // IPv6 contains colons (and may contain IPv4 in mapped format, but we want native IPv6)
    // Check for multiple colons or double colon (::)
    return ip.includes(':') && (ip.split(':').length > 2 || ip.includes('::'));
};

// Helper function to prioritize IPv6 when multiple IPs are present
const prioritizeIPv6 = (ipString) => {
    if (!ipString || ipString === 'unknown') return 'unknown';
    
    // Split comma-separated IPs
    const ips = ipString.split(',').map(ip => ip.trim());
    
    // Prioritize IPv6 addresses
    const ipv6 = ips.find(ip => isIPv6(ip));
    if (ipv6) return ipv6;
    
    // Fallback to first IPv4
    const ipv4 = ips.find(ip => !isIPv6(ip) && ip.match(/^\d+\.\d+\.\d+\.\d+$/));
    if (ipv4) return ipv4;
    
    // Return first IP if no match
    return ips[0] || 'unknown';
};

// Standardized user data builder - ensures all files use same structure
function buildUserData({ fbp, fbc, clientIp, clientUserAgent }) {
    // Prioritize IPv6 if available
    const prioritizedIp = clientIp ? prioritizeIPv6(clientIp) : 'unknown';
    
    return {
        client_ip_address: prioritizedIp,
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


