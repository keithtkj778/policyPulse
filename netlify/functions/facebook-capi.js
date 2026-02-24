/** POST: receives event payload, enriches with ParamBuilder, sends to Facebook CAPI. */
const { sendFacebookEvents, buildUserData } = require('./facebook-lib');
const { FACEBOOK_PIXEL_ID, FACEBOOK_ACCESS_TOKEN, SITE_URL } = require('./config');
const { ParamBuilder } = require('capi-param-builder-nodejs');
const { PARAM_BUILDER_DOMAIN } = require('./constants');

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
        // Parse the request body
        let eventData;
        try {
            eventData = JSON.parse(event.body);
            console.log(`✅ [facebook-capi] Request received: ${event.httpMethod} from ${event.headers['user-agent']?.substring(0, 50) || 'unknown'}`);
        } catch (parseError) {
            console.error('🚨 [facebook-capi] ERROR: Invalid JSON in request body', {
                error: parseError.message,
                body: event.body?.substring(0, 200)
            });
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }

        // Extract event details
        const {
            event_name,
            _fbp,
            fbc,
            event_id,
            primary_angle,
            client_user_agent,
            client_ip_address,
            page_url,
            referrer,
            page_duration,
            conversion_trigger,
            ...customData
        } = eventData;

        // Validate required parameters with detailed logging
        if (!event_name) {
            console.error('🚨 [facebook-capi] ERROR: Missing event_name', { received: Object.keys(eventData) });
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Missing required parameter: event_name' })
            };
        }

        // Initialize Parameter Builder to improve fbp/fbc quality and IP handling
        // Per Meta's Server-Side Parameter Builder documentation:
        // https://developers.facebook.com/docs/marketing-api/conversions-api/parameter-builder/server-side
        const domain = (SITE_URL && new URL(SITE_URL).hostname) || PARAM_BUILDER_DOMAIN;
        const paramBuilder = new ParamBuilder([domain]);
        
        // Parse cookies from request headers (if any)
        // Meta docs: Parse cookies from HTTP request headers
        const cookies = {};
        if (event.headers.cookie) {
            event.headers.cookie.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                if (name && value) cookies[name] = value;
            });
        }

        // Process request with Parameter Builder (Meta's recommended flow)
        // Meta docs: Call processRequest() first, then use get APIs
        // Note: queryParams is empty since this is a POST endpoint with JSON body (no URL query params)
        const queryParams = {};
        const host = event.headers.host || (SITE_URL ? new URL(SITE_URL).host : PARAM_BUILDER_DOMAIN);
        const xForwardedFor = event.headers['x-forwarded-for'] || event.headers['x-nf-client-connection-ip'] || null;
        const remoteAddr = event.headers['client-ip'] || null;
        
        let recommendedCookies = [];
        try {
            // Meta docs: processRequest() returns list of recommended cookie updates
            const cookieSettings = paramBuilder.processRequest(
                host,
                queryParams,
                cookies,
                referrer || null,
                xForwardedFor,
                remoteAddr
            );

            // Store recommended cookies to return in response (Meta best practice)
            if (cookieSettings && cookieSettings.length > 0) {
                recommendedCookies = cookieSettings;
                console.log(`✅ [facebook-capi] ParamBuilder recommended ${cookieSettings.length} cookie update(s) for better tracking`, {
                    cookies: cookieSettings.map(c => c.name).join(', ')
                });
            }
        } catch (pbError) {
            console.warn(`⚠️  [facebook-capi] ParamBuilder processRequest error (continuing with existing values):`, pbError.message);
        }

        // Meta docs: After processRequest(), call get APIs to retrieve improved values
        // These APIs return optimized fbp/fbc/IP values following Meta's best practices
        const improvedFbp = paramBuilder.getFbp() || _fbp || '';
        const improvedFbc = paramBuilder.getFbc() || fbc || '';
        const improvedIp = paramBuilder.getClientIpAddress() || client_ip_address || 'unknown';

        if (!improvedFbp && !_fbp) {
            console.warn(`⚠️  [facebook-capi] WARN: Missing _fbp for ${event_name} - ParamBuilder could not generate (may reduce match quality)`);
        } else if (improvedFbp && improvedFbp !== _fbp) {
            console.log(`✅ [facebook-capi] ParamBuilder improved fbp: using optimized value from cookies`);
        }

        // Use provided event_id or generate fallback (should always be provided from frontend)
        const finalEventId = event_id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!event_id) {
            console.warn(`⚠️  [facebook-capi] WARN: Missing event_id for ${event_name} - generated fallback: ${finalEventId} (deduplication may fail!)`);
        } else {
            console.log(`✅ [facebook-capi] ${event_name} event - event_id: ${finalEventId} | fbp: ${improvedFbp?.substring(0, 20) || 'missing'}... | fbc: ${improvedFbc?.substring(0, 20) || 'missing'}...`);
        }

        // Prepare Facebook Conversions API payload with improved values
        const facebookEvent = {
            data: [{
                event_name: event_name,
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'website',
                user_data: buildUserData({
                    fbp: improvedFbp,
                    fbc: improvedFbc,
                    clientIp: improvedIp,
                    clientUserAgent: client_user_agent
                }),
                custom_data: {
                    content_name: 'Health Insurance Lead',
                    content_category: 'Health Insurance',
                    value: getEventValue(event_name, customData),
                    currency: 'USD',
                    primary_angle: primary_angle || 'one_bill_away',
                    page_duration: page_duration || 0,
                    conversion_trigger: conversion_trigger || 'unknown'
                },
                event_source_url: page_url || SITE_URL || 'https://policypulse.online',
                event_id: finalEventId // ✅ SAME event ID as Pixel (for deduplication)
            }]
        };

        // Validate config before sending
        if (!FACEBOOK_PIXEL_ID) {
            console.error('🚨 [facebook-capi] CRITICAL ERROR: FACEBOOK_PIXEL_ID is missing! Check environment variables.');
            throw new Error('FACEBOOK_PIXEL_ID environment variable is not set');
        }
        if (!FACEBOOK_ACCESS_TOKEN) {
            console.error('🚨 [facebook-capi] CRITICAL ERROR: FACEBOOK_ACCESS_TOKEN is missing! Check environment variables.');
            throw new Error('FACEBOOK_ACCESS_TOKEN environment variable is not set');
        }

        console.log(`📤 [facebook-capi] Sending ${event_name} to Facebook CAPI`, {
            pixel_id: FACEBOOK_PIXEL_ID,
            event_id: finalEventId,
            fbp_source: improvedFbp !== _fbp ? 'ParamBuilder (improved)' : (_fbp ? 'body (provided)' : 'missing'),
            fbc_source: improvedFbc !== fbc ? 'ParamBuilder (improved)' : (fbc ? 'body (provided)' : 'missing'),
            ip_source: improvedIp !== client_ip_address ? 'ParamBuilder (improved)' : (client_ip_address ? 'body (provided)' : 'unknown'),
            has_fbp: !!improvedFbp,
            has_fbc: !!improvedFbc,
            has_ip: !!improvedIp && improvedIp !== 'unknown',
            has_user_agent: !!client_user_agent && client_user_agent !== 'unknown'
        });

        const result = await sendFacebookEvents({
            pixelId: FACEBOOK_PIXEL_ID,
            accessToken: FACEBOOK_ACCESS_TOKEN,
            payload: facebookEvent
        });

        if (result.events_received && result.events_received > 0) {
            console.log(`✅ [facebook-capi] SUCCESS: ${event_name} sent to Facebook`, {
                event_id: finalEventId,
                events_received: result.events_received,
                messages: result.messages || []
            });
        } else {
            console.warn(`⚠️  [facebook-capi] WARN: ${event_name} may not have been processed by Facebook`, result);
        }
        
        // Build response headers with recommended cookies for frontend to set
        const responseHeaders = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        };
        
        // Add Set-Cookie headers for recommended cookies (if any)
        if (recommendedCookies && recommendedCookies.length > 0) {
            // Note: Netlify Functions can return multiple Set-Cookie headers via array
            responseHeaders['Set-Cookie'] = recommendedCookies.map(cookie => {
                const cookieDomain = cookie.domain || (SITE_URL ? '.' + new URL(SITE_URL).hostname : '.' + PARAM_BUILDER_DOMAIN);
            return `${cookie.name}=${cookie.value}; Max-Age=${cookie.maxAge}; Path=/; Domain=${cookieDomain}; SameSite=Lax`;
            });
            console.log(`✅ [facebook-capi] Returning ${recommendedCookies.length} cookie(s) for client to set for improved fbp/fbc coverage`);
        }
        
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Event sent to Facebook Conversions API',
                event_id: facebookEvent.data[0].event_id,
                facebook_response: result,
                recommended_cookies: recommendedCookies.map(c => ({
                    name: c.name,
                    domain: c.domain,
                    maxAge: c.maxAge
                }))
            })
        };

    } catch (error) {
        console.error('🚨 [facebook-capi] CRITICAL ERROR:', {
            error: error.message,
            stack: error.stack,
            event_name: event?.body ? JSON.parse(event.body)?.event_name : 'unknown',
            timestamp: new Date().toISOString()
        });
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// Helper function to determine event value based on event type
function getEventValue(eventName, customData) {
    switch (eventName) {
        case 'PageView':
            return 0;
        case 'CTAClicked':
            return 3; // $3 for CTA click
        case 'Lead':
            return 7; // $7 for lead
        default:
            return customData.value || 0;
    }
}
