/** POST: resolves offer redirect chain, appends s3=fbp, s4=fbc, s5=user_agent; returns redirect URL. */
const fetch = require('node-fetch');
const { URL } = require('url');
const { OFFER_REDIRECT_URL } = require('./config');
const { MAX_REDIRECT_HOPS, FETCH_MAX_RETRIES, FETCH_RETRY_DELAY_MS, FETCH_TIMEOUT_MS } = require('./constants');

// Sleep function for retries
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Safe fetch with retries
async function safeFetch(url, options, retries = FETCH_MAX_RETRIES) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                timeout: FETCH_TIMEOUT_MS,
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
            await sleep(FETCH_RETRY_DELAY_MS * (i + 1));
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
        let formData;
        try {
            formData = new URLSearchParams(event.body);
            console.log(`✅ [go-firstquote] CTA click received from ${event.headers['user-agent']?.substring(0, 50) || 'unknown'}`);
        } catch (parseError) {
            console.error('🚨 [go-firstquote] ERROR: Failed to parse form data', {
                error: parseError.message,
                body: event.body?.substring(0, 200)
            });
            throw parseError;
        }
        
        // Extract tracking parameters
        const angle = formData.get('angle') || 'prelander';
        const fbp = formData.get('fbp') || `click_${Date.now()}`;
        const fbc = formData.get('fbc') || '0';
        const userIP = formData.get('user_ip') || 'unknown';
        const userAgent = formData.get('user_agent') || 'unknown';

        console.log(`📊 [go-firstquote] Tracking data extracted:`, {
            angle: angle || '❌ MISSING',
            fbp: fbp && fbp !== `click_${Date.now()}` ? `${fbp.substring(0, 20)}...` : '⚠️ generated fallback',
            fbc: fbc && fbc !== '0' ? `${fbc.substring(0, 20)}...` : '⚠️ fallback',
            ip: userIP !== 'unknown' ? '✅ present' : '❌ MISSING',
            user_agent: userAgent !== 'unknown' ? '✅ present' : '❌ MISSING'
        });

        if (!fbp || fbp.startsWith('click_')) {
            console.warn(`⚠️  [go-firstquote] WARN: fbp missing or fallback - tracking may be incomplete`);
        }
        if (!fbc || fbc === '0') {
            console.warn(`⚠️  [go-firstquote] WARN: fbc missing or fallback - tracking may be incomplete`);
        }

        // Note: Tracking data is now passed directly via URL parameters to MaxBounty

        const baseUrl = OFFER_REDIRECT_URL;
        if (!baseUrl || !isValidUrl(baseUrl)) {
            console.error('🚨 [go-firstquote] OFFER_REDIRECT_URL is not set or invalid');
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Redirect URL not configured', success: false }),
            };
        }

        let finalURL = null;
        let nextURL = baseUrl;
        let hops = 0;

        console.log(`🔄 [go-firstquote] Following redirect chain (max ${MAX_REDIRECT_HOPS} hops)`);
        while (hops < MAX_REDIRECT_HOPS && nextURL && isValidUrl(nextURL)) {
            console.log(`  → Hop ${hops + 1}/${MAX_REDIRECT_HOPS}: ${nextURL.substring(0, 100)}...`);
            
            try {
                const resp = await safeFetch(nextURL, { 
                    redirect: "manual",
                    headers: {
                        'user-agent': event.headers['user-agent'] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                });

                if (resp.status >= 300 && resp.status < 400) {
                    const location = resp.headers.get("location");
                    if (location && isValidUrl(location)) {
                        nextURL = location;
                        finalURL = location;
                        hops++;
                    } else {
                        console.warn(`⚠️  [go-firstquote] WARN: Invalid location header on hop ${hops + 1}, stopping`);
                        break;
                    }
                } else {
                    console.log(`✅ [go-firstquote] Reached final destination after ${hops} redirect(s)`);
                    break;
                }
            } catch (fetchError) {
                console.error(`🚨 [go-firstquote] ERROR: Fetch failed on hop ${hops + 1}`, {
                    error: fetchError.message,
                    url: nextURL?.substring(0, 100)
                });
                break;
            }
        }

        if (!finalURL || !isValidUrl(finalURL)) {
            console.warn(`⚠️  [go-firstquote] WARN: Failed to resolve final URL after ${hops} hops - using base URL`);
            finalURL = baseUrl;
        }

        console.log(`✅ [go-firstquote] Final URL resolved: ${finalURL.substring(0, 100)}...`);

        // Now append our tracking to the final URL
        let offerURL;
        try {
            offerURL = new URL(finalURL);
            
            // Add our tracking parameters to s3, s4, s5 (safe parameters)
            offerURL.searchParams.set("s3", fbp);        // s3 = fbp
            offerURL.searchParams.set("s4", fbc);        // s4 = fbc  
            offerURL.searchParams.set("s5", userAgent);  // s5 = user agent

            console.log(`✅ [go-firstquote] Tracking appended to URL:`, {
                s3_fbp: fbp ? '✅' : '❌',
                s4_fbc: fbc ? '✅' : '❌',
                s5_user_agent: userAgent !== 'unknown' ? '✅' : '❌',
                final_url_length: offerURL.toString().length
            });

        } catch (urlError) {
            console.error(`🚨 [go-firstquote] CRITICAL ERROR: URL construction failed`, {
                error: urlError.message,
                final_url: finalURL?.substring(0, 100),
                timestamp: new Date().toISOString()
            });
            return {
                statusCode: 302,
                headers: { 'Location': baseUrl }
            };
        }

        // Return JSON response with redirect URL
        console.log(`✅ [go-firstquote] CTA redirect complete - returning URL to client`);
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
        console.error(`🚨 [go-firstquote] CRITICAL ERROR: Exception in handler`, {
            error: error.message,
            stack: error.stack,
            body: event.body?.substring(0, 200),
            timestamp: new Date().toISOString()
        });
        
        const fallback = OFFER_REDIRECT_URL || '/';
        return {
            statusCode: 302,
            headers: { 'Location': fallback }
        };
    }
};
