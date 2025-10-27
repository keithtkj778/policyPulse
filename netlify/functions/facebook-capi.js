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

const fetch = require('node-fetch');

// Facebook Pixel API configuration
const FACEBOOK_PIXEL_ID = '1601325491243806';
const FACEBOOK_ACCESS_TOKEN = 'EAAZA3IukzApIBP59YeDce8KudQBnfwRU8mV5n0lkTBrfnyKlvjQj8qwniiBOBEyQWasssZAYohRmqOEvQVq9Aj6P10gSKuUqmvkZBl75qyBQjZAbegV4eZBfUGucKBrktvVoXWXc6xGEMaP5hlZBOXHLhN0ijFlGbOkUO2RvBGIbCYefdqMNwIsr9BAYt56wZDZD';

// Facebook Conversions API endpoint
const FACEBOOK_CONVERSIONS_API = `https://graph.facebook.com/v18.0/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;

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
        const eventData = JSON.parse(event.body);
        
        console.log('Received CAPI event:', eventData);

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

        // Validate required parameters
        if (!event_name || !_fbp) {
            console.log('Missing required parameters');
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Missing required parameters' })
            };
        }

        // Prepare Facebook Conversions API payload
        const facebookEvent = {
            data: [{
                event_name: event_name,
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'website',
                user_data: {
                    client_ip_address: client_ip_address || 'unknown',
                    client_user_agent: client_user_agent || 'unknown',
                    fbp: _fbp,
                    fbc: fbc || ''
                },
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
                event_id: event_id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }]
        };

        console.log('Sending to Facebook Conversions API:', facebookEvent);

        // Send to Facebook Conversions API
        const response = await fetch(FACEBOOK_CONVERSIONS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(facebookEvent)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Facebook CAPI event sent successfully:', result);
            
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
        } else {
            const error = await response.text();
            console.error('Facebook CAPI error:', error);
            
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Facebook CAPI error',
                    details: error
                })
            };
        }

    } catch (error) {
        console.error('Error in Facebook CAPI function:', error);
        
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
