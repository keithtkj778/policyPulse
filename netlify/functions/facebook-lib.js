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
    if (!pixelId) {
        console.error('🚨 [facebook-lib] CRITICAL: Missing pixelId');
        throw new Error('Missing Facebook Pixel ID');
    }
    if (!accessToken) {
        console.error('🚨 [facebook-lib] CRITICAL: Missing accessToken');
        throw new Error('Missing Facebook Access Token');
    }

    const eventCount = payload?.data?.length || 0;
    try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`🚨 [facebook-lib] Facebook CAPI error:`, {
                status: response.status,
                status_text: response.statusText,
                error: errorText.substring(0, 500),
                pixel_id: pixelId
            });
            const err = new Error(`Facebook CAPI error: ${errorText}`);
            err.status = response.status;
            throw err;
        }

        const result = await response.json();
        if (result.events_received !== eventCount) {
            console.warn(`⚠️  [facebook-lib] WARN: Expected ${eventCount} events, Facebook received ${result.events_received}`);
        }
        
        return result;
    } catch (fetchError) {
        console.error(`🚨 [facebook-lib] CRITICAL: Network/API error`, {
            error: fetchError.message,
            status: fetchError.status,
            endpoint: `v18.0/${pixelId}/events`
        });
        throw fetchError;
    }
}

module.exports = {
    sendFacebookEvents,
    buildUserData
};


