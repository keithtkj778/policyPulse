const fetch = require('node-fetch');
const { URL } = require('url');

// Validation helpers
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");
const cleanPhone = v => (v || "").replace(/[^\d]/g, "").slice(-15);
const isZip5 = v => /^\d{5}$/.test(v || "");
const trim = v => (v || "").toString().trim().slice(0, 64);

// Fallback URL - only your affiliate link
const FALLBACK_URL = "https://afflat3e3.com/trk/lnk/C94F5D99-5FC1-4F17-B862-BD110C21C8F7/?o=30255&c=918277&a=765749&k=48611CEDB50C898254BB3D5F27E752A7&l=34601";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Sleep function for retries
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Safe fetch with retries
async function safeFetch(url, options, retries = MAX_RETRIES) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                timeout: 10000, // 10 second timeout
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
            await sleep(RETRY_DELAY * (i + 1)); // Exponential backoff
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
        // Parse form data with fallback
        let formData;
        try {
            formData = new URLSearchParams(event.body);
        } catch (parseError) {
            console.error("Form data parsing failed:", parseError);
            return {
                statusCode: 302,
                headers: { 'Location': FALLBACK_URL }
            };
        }

        // Extract and validate form data
        const email = trim(formData.get('email'));
        const phone = cleanPhone(formData.get('phone'));
        const zipcode = trim(formData.get('zipcode'));
        const first_name = trim(formData.get('first_name'));
        const last_name = trim(formData.get('last_name'));
        const s1 = trim(formData.get('s1')) || 'prelander'; // Default fallback
        const s2 = trim(formData.get('s2')) || `click_${Date.now()}`; // Default click ID
        const s3 = trim(formData.get('s3')) || '0'; // Default intent score
        
        // Extract client IP and user agent for CAPI
        const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
        const userAgent = event.headers['user-agent'] || 'unknown';

        console.log("Received form submission:", {
            email: email ? `${email.substring(0, 3)}***` : 'missing',
            phone: phone ? `***${phone.slice(-4)}` : 'missing',
            zipcode: zipcode || 'missing',
            first_name: first_name ? `${first_name.substring(0, 1)}***` : 'missing',
            last_name: last_name ? `${last_name.substring(0, 1)}***` : 'missing',
            s1: s1,
            s2: s2,
            s3: s3
        });

        // Enhanced validation with fallbacks
        const hasValidEmail = isEmail(email);
        const hasValidZip = isZip5(zipcode);
        const hasValidPhone = phone.length >= 7;
        const hasValidName = first_name.length >= 2 && last_name.length >= 2;

        console.log("Validation results:", {
            hasValidEmail,
            hasValidZip,
            hasValidPhone,
            hasValidName,
            emailLength: email.length,
            phoneLength: phone.length,
            zipcodeLength: zipcode.length,
            first_nameLength: first_name.length,
            last_nameLength: last_name.length
        });

        // If critical validation fails, redirect to fallback
        if (!hasValidEmail || !hasValidZip || !hasValidPhone) {
            console.log("Critical validation failed - redirecting to fallback");
            console.log("Failed validations:", {
                email: !hasValidEmail,
                zipcode: !hasValidZip,
                phone: !hasValidPhone
            });
            return {
                statusCode: 302,
                headers: { 'Location': FALLBACK_URL }
            };
        }

        // Build MaxBounty link with fallbacks
        let mbUrl;
        try {
            mbUrl = new URL("https://afflat3e3.com/trk/lnk/C94F5D99-5FC1-4F17-B862-BD110C21C8F7/");
            mbUrl.searchParams.set("o", "30255");
            mbUrl.searchParams.set("c", "918277");
            mbUrl.searchParams.set("a", "765749");
            mbUrl.searchParams.set("k", "48611CEDB50C898254BB3D5F27E752A7");
            mbUrl.searchParams.set("l", "34601");
            
            // Add tracking parameters with fallbacks
            mbUrl.searchParams.set("s1", s1);
            mbUrl.searchParams.set("s2", s2);
            mbUrl.searchParams.set("s3", s3);
        } catch (urlError) {
            console.error("URL construction failed:", urlError);
            return {
                statusCode: 302,
                headers: { 'Location': FALLBACK_URL }
            };
        }

        console.log("MaxBounty URL:", mbUrl.toString());

        // Resolve final offer URL with multiple fallbacks
        let finalURL = null;
        let nextURL = mbUrl.toString();
        let hops = 0;
        const maxHops = 8; // Increased from 6

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

        // Multiple fallback strategies
        if (!finalURL || !isValidUrl(finalURL)) {
            console.log("Failed to resolve final URL - trying fallback strategies");
            
            // Try direct FirstQuoteHealth URL with tracking
            const directUrl = new URL("https://quote.firstquotehealth.com/");
            directUrl.searchParams.set("utm_campaign", "765749");
            directUrl.searchParams.set("utm_source", "AF_HE_MB");
            directUrl.searchParams.set("utm_term", "207030798");
            directUrl.searchParams.set("utm_medium", "");
            directUrl.searchParams.set("s1", s1);
            directUrl.searchParams.set("s2", s2);
            directUrl.searchParams.set("s3", s3);
            
            finalURL = directUrl.toString();
        }

        console.log("Final offer URL:", finalURL);

        // Build final URL with pre-population and fallbacks
        let offerURL;
        try {
            offerURL = new URL(finalURL);
            
            // Add user data for pre-population (only if validation passed)
            if (hasValidEmail) offerURL.searchParams.set("email", email);
            if (hasValidPhone) offerURL.searchParams.set("phone", phone);
            if (hasValidZip) offerURL.searchParams.set("zipcode", zipcode);
            if (hasValidName) {
                offerURL.searchParams.set("first_name", first_name);
                offerURL.searchParams.set("last_name", last_name);
            }
            
            // Note: clientIP and userAgent are available for CAPI tracking but not added to URL

            // Note: Tracking parameters (s1, s2, s3) are only used for MaxBounty, not for final landing page

        } catch (urlError) {
            console.error("Final URL construction failed:", urlError);
            return {
                statusCode: 302,
                headers: { 'Location': FALLBACK_URL }
            };
        }

        console.log("Final URL with pre-pop:", offerURL.toString());

        // Return JSON response with redirect URL instead of HTTP redirect
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
                message: 'Redirecting to offer page',
                capi_data: {
                    client_ip: clientIP,
                    user_agent: userAgent
                }
            })
        };

    } catch (error) {
        console.error("Critical error in function:", error);
        
        // Ultimate fallback - only your affiliate link
        return {
            statusCode: 302,
            headers: { 'Location': FALLBACK_URL }
        };
    }
};
