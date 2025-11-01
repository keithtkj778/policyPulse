/*
================================================================================
FACEBOOK CONVERSIONS API FUNCTION
================================================================================
Purpose: Sends events to Facebook Conversions API for server-side tracking
When Used: Called for every event (PageView, CTAClicked, Lead) to duplicate
          client-side pixel events with better data quality
Events Handled: PageView, CTAClicked, Lead
Data Source: Receives event data from client-side pixel and postback function
Deduplication: Uses same event_id as pixel for automatic Facebook deduplication
================================================================================
*/

const { sendFacebookEvents, buildUserData } = require('./facebook-lib');
const { FACEBOOK_PIXEL_ID, FACEBOOK_ACCESS_TOKEN } = require('./config');

// Facebook Pixel API configuration from centralized config

// Using shared sender from facebook-lib

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

        if (!_fbp) {
            console.warn(`⚠️  [facebook-capi] WARN: Missing _fbp for ${event_name} - will use empty string (may reduce match quality)`);
        }

        // Use provided event_id or generate fallback (should always be provided from frontend)
        const finalEventId = event_id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!event_id) {
            console.warn(`⚠️  [facebook-capi] WARN: Missing event_id for ${event_name} - generated fallback: ${finalEventId} (deduplication may fail!)`);
        } else {
            console.log(`✅ [facebook-capi] ${event_name} event - event_id: ${finalEventId} | fbp: ${_fbp?.substring(0, 20) || 'missing'}... | fbc: ${fbc?.substring(0, 20) || 'missing'}...`);
        }

        // Prepare Facebook Conversions API payload
        const facebookEvent = {
            data: [{
                event_name: event_name,
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'website',
                user_data: buildUserData({
                    fbp: _fbp,
                    fbc: fbc,
                    clientIp: client_ip_address,
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
                event_source_url: page_url || 'https://policypulse.online',
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
            has_fbp: !!_fbp,
            has_fbc: !!fbc,
            has_ip: !!client_ip_address && client_ip_address !== 'unknown',
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
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'Event sent to Facebook Conversions API',
                event_id: facebookEvent.data[0].event_id,
                facebook_response: result
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
