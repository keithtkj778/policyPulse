/*
================================================================================
IP ADDRESS DETECTION FUNCTION
================================================================================
Purpose: Gets the real user's IP address from request headers, prioritizing IPv6
When Used: Called by landing page to get user's IP for Facebook tracking
Process: 1. Checks various IP header fields (client-ip, x-forwarded-for, etc.)
         2. Prioritizes IPv6 addresses over IPv4 (Facebook recommendation)
         3. Returns IPv6 if available, otherwise falls back to IPv4
         4. Falls back to 'unknown' if no IP found
Data Source: HTTP request headers from Netlify edge functions
Note: IPv6 prioritization improves Facebook match quality and conversion tracking
================================================================================
*/

exports.handler = async (event, context) => {
    // Set function timeout
    context.callbackWaitsForEmptyEventLoop = false;
    
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Max-Age': '86400'
            },
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Helper function to check if IP is IPv6
        const isIPv6 = (ip) => {
            if (!ip) return false;
            // IPv6 contains colons (and may contain IPv4 in mapped format, but we want native IPv6)
            // Check for multiple colons or double colon (::)
            return ip.includes(':') && (ip.split(':').length > 2 || ip.includes('::'));
        };

        // Helper function to extract and prioritize IPv6
        const extractIPWithIPv6Priority = (ipString) => {
            if (!ipString || ipString === 'unknown') return null;
            
            // Split comma-separated IPs
            const ips = ipString.split(',').map(ip => ip.trim());
            
            // Prioritize IPv6 addresses
            const ipv6 = ips.find(ip => isIPv6(ip));
            if (ipv6) return ipv6;
            
            // Fallback to first IPv4
            const ipv4 = ips.find(ip => !isIPv6(ip) && ip.match(/^\d+\.\d+\.\d+\.\d+$/));
            if (ipv4) return ipv4;
            
            // Return first IP if no match
            return ips[0] || null;
        };

        // Extract IP from multiple header sources, prioritizing IPv6
        let clientIP = 'unknown';
        
        // Check all header sources for IPv6 first
        const headerSources = [
            event.headers['client-ip'],
            event.headers['x-forwarded-for'],
            event.headers['x-real-ip'],
            event.headers['x-nf-client-connection-ip'] // Netlify-specific
        ].filter(Boolean);
        
        // Look for IPv6 across all headers first
        for (const headerValue of headerSources) {
            const ip = extractIPWithIPv6Priority(headerValue);
            if (ip && isIPv6(ip)) {
                clientIP = ip;
                break;
            }
        }
        
        // If no IPv6 found, use first available IP (IPv4)
        if (clientIP === 'unknown') {
            for (const headerValue of headerSources) {
                const ip = extractIPWithIPv6Priority(headerValue);
                if (ip) {
                    clientIP = ip;
                    break;
                }
            }
        }

        // Extract user agent
        const userAgent = event.headers['user-agent'] || 'unknown';

        // Return IP and user agent
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
            },
            body: JSON.stringify({
                success: true,
                ip: clientIP,
                userAgent: userAgent,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error getting IP:', error);
        
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
