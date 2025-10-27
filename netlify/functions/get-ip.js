/*
================================================================================
IP ADDRESS DETECTION FUNCTION
================================================================================
Purpose: Gets the real user's IP address from request headers
When Used: Called by landing page to get user's IP for Facebook tracking
Process: 1. Checks various IP header fields (x-forwarded-for, x-real-ip, etc.)
         2. Returns the first valid IP address found
         3. Falls back to 'unknown' if no IP found
Data Source: HTTP request headers from Netlify edge functions
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
        // Extract IP address from headers
        const clientIP = event.headers['client-ip'] || 
                         event.headers['x-forwarded-for'] || 
                         event.headers['x-real-ip'] || 
                         'unknown';

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
