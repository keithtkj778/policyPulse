const { URL } = require('url');

// MaxBounty affiliate link
const MAXBOUNTY_URL = "https://afflat3e3.com/trk/lnk/C94F5D99-5FC1-4F17-B862-BD110C21C8F7/?o=30127&c=918277&a=765749&k=5E9E785FF72D238BE1639961F85156BF&l=34069";

exports.handler = async (event, context) => {
    // Set function timeout
    context.callbackWaitsForEmptyEventLoop = false;
    
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Max-Age': '86400'
            },
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse form data
        const formData = new URLSearchParams(event.body);
        
        // Extract tracking parameters
        const s1 = formData.get('s1') || 'prelander';
        const s2 = formData.get('s2') || `click_${Date.now()}`;
        const s3 = formData.get('s3') || '0';

        console.log("Received tracking data:", { s1, s2, s3 });

        // Build MaxBounty URL with tracking parameters
        const mbUrl = new URL(MAXBOUNTY_URL);
        mbUrl.searchParams.set("s1", s1);
        mbUrl.searchParams.set("s2", s2);
        mbUrl.searchParams.set("s3", s3);

        console.log("Final MaxBounty URL:", mbUrl.toString());

        // Return JSON response with redirect URL
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Robots-Tag': 'noindex, nofollow',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
            },
            body: JSON.stringify({
                success: true,
                redirectUrl: mbUrl.toString(),
                message: 'Redirecting to MaxBounty offer'
            })
        };

    } catch (error) {
        console.error("Error in function:", error);
        
        // Fallback to MaxBounty URL
        return {
            statusCode: 302,
            headers: { 'Location': MAXBOUNTY_URL }
        };
    }
};
