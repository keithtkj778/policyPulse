const fetch = require('node-fetch');
const { URL } = require('url');

// MaxBounty affiliate link
const MAXBOUNTY_URL = "https://afflat3e3.com/trk/lnk/C94F5D99-5FC1-4F17-B862-BD110C21C8F7/?o=30127&c=918277&a=765749&k=5E9E785FF72D238BE1639961F85156BF&l=34069";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Sleep function for retries
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Safe fetch with retries
async function safeFetch(url, options, retries = MAX_RETRIES) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                timeout: 10000,
                headers: {
                    "User-Agent": options.headers?.['user-agent'] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                    ...options.headers
                }
            });
            return response;
        } catch (error) {
            console.log(`Fetch attempt ${i + 1} failed:`, error.message);
            if (i === retries) throw error;
            await sleep(RETRY_DELAY * (i + 1));
        }
    }
}

// Validate and sanitize URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

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
        const angle = formData.get('angle') || 'prelander';
        const fbp = formData.get('fbp') || `click_${Date.now()}`;
        const fbc = formData.get('fbc') || '0';
        const userIP = formData.get('user_ip') || 'unknown';
        const userAgent = formData.get('user_agent') || 'unknown';

        console.log("Received tracking data:", { angle, fbp, fbc, userIP, userAgent });

        // Call MaxBounty link to get final URL
        let finalURL = null;
        let nextURL = MAXBOUNTY_URL;
        let hops = 0;
        const maxHops = 8;

        while (hops < maxHops && nextURL && isValidUrl(nextURL)) {
            console.log(`Following redirect hop ${hops + 1}: ${nextURL}`);
            
            try {
                const resp = await safeFetch(nextURL, { 
                    redirect: "manual",
                    headers: {
                        'user-agent': event.headers['user-agent'] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                });

                console.log(`Response status: ${resp.status}`);

                if (resp.status >= 300 && resp.status < 400) {
                    const location = resp.headers.get("location");
                    if (location && isValidUrl(location)) {
                        nextURL = location;
                        finalURL = location;
                        hops++;
                    } else {
                        console.log("Invalid location header, breaking");
                        break;
                    }
                } else {
                    console.log("Reached final destination");
                    break;
                }
            } catch (fetchError) {
                console.error(`Fetch error on hop ${hops + 1}:`, fetchError.message);
                break;
            }
        }

        // If we couldn't get final URL, use MaxBounty URL as fallback
        if (!finalURL || !isValidUrl(finalURL)) {
            console.log("Failed to resolve final URL - using MaxBounty URL");
            finalURL = MAXBOUNTY_URL;
        }

        console.log("Final URL from MaxBounty:", finalURL);

        // Now append our tracking to the final URL
        let offerURL;
        try {
            offerURL = new URL(finalURL);
            
            // Add our tracking parameters to s3, s4, s5 (safe parameters)
            offerURL.searchParams.set("s3", angle);
            offerURL.searchParams.set("s4", fbp);
            offerURL.searchParams.set("s5", fbc);

            console.log("Final URL with our tracking:", offerURL.toString());

        } catch (urlError) {
            console.error("Final URL construction failed:", urlError);
            return {
                statusCode: 302,
                headers: { 'Location': MAXBOUNTY_URL }
            };
        }

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
                redirectUrl: offerURL.toString(),
                message: 'Redirecting to offer with tracking preserved'
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
