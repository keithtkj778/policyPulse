/** GET: returns client IP (IPv6 preferred) and user-agent from request headers. */

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

        let clientIP = 'unknown';
        const headerSources = [
            { name: 'client-ip', value: event.headers['client-ip'] },
            { name: 'x-forwarded-for', value: event.headers['x-forwarded-for'] },
            { name: 'x-real-ip', value: event.headers['x-real-ip'] },
            { name: 'x-nf-client-connection-ip', value: event.headers['x-nf-client-connection-ip'] }
        ].filter(h => h.value);

        for (const header of headerSources) {
            const ip = extractIPWithIPv6Priority(header.value);
            if (ip && isIPv6(ip)) {
                clientIP = ip;
                break;
            }
        }
        if (clientIP === 'unknown') {
            for (const header of headerSources) {
                const ip = extractIPWithIPv6Priority(header.value);
                if (ip) {
                    clientIP = ip;
                    break;
                }
            }
        }

        const userAgent = event.headers['user-agent'] || 'unknown';
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
        console.error('🚨 [get-ip] CRITICAL ERROR:', {
            error: error.message,
            stack: error.stack,
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
