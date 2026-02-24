# Facebook Pixel + Conversions API Implementation

This implementation uses Facebook Pixel for client-side tracking and Netlify Functions for server-side Conversions API (CAPI) tracking.

## Architecture

### Client-Side (Facebook Pixel)

- **Location**: `index.html` (lines 27-43)
- **Pixel ID**: `1601325491243806`
- **Events Tracked**:
  - `PageView` - When user visits the page (with 2-second dwell time)
  - `CTAClicked` - When user clicks CTA buttons

### Server-Side (Conversions API)

- **Function**: `/.netlify/functions/facebook-capi`
- **Purpose**: Sends events to Facebook Conversions API for better attribution
- **Events**: All client-side events are duplicated server-side with same event IDs

## Key Features

### 1. Event Deduplication

- Both pixel and CAPI use the same `event_id` to prevent duplicate counting
- Facebook automatically deduplicates events with matching IDs

### 2. Bot Detection

- FingerprintJS BotD integration
- Honeypot form fields
- Behavioral validation (dwell time, scroll, mouse movement)
- Events blocked for detected bots

### 3. Data Enrichment

- Real IP addresses from server
- User agent strings
- Page URLs and referrers
- Custom event data (angles, duration, etc.)

## Files Structure

```
netlify/functions/
├── facebook-capi.js      # Main CAPI function
├── postback.js          # MaxBounty conversion tracking
├── store-tracking.js    # Store fbp/fbc data in Redis
├── test-capi.js         # Test function for CAPI
├── get-ip.js            # IP address detection
└── redis-cache.js       # Data caching for conversions
```

## Configuration

### Facebook Pixel

- **Pixel ID**: `1601325491243806` (in `index.html` line 37)
- **Access Token**: Set in `facebook-capi.js` line 5

### MaxBounty Integration

- **Postback URL**: `https://policypulse.online/.netlify/functions/postback`
- **Parameters**: s1-s7 for tracking data
- **Conversion Tracking**: Automatic Lead events fired on conversion

## Testing

### Test CAPI Function

Visit: `https://policypulse.online/.netlify/functions/test-capi`

This will send a test PageView event to Facebook Conversions API.

### Test Pixel Events

1. Open browser dev tools
2. Visit the landing page
3. Check console for event firing logs
4. Verify events in Facebook Events Manager

## Event Flow

1. **User visits page** → Pixel fires `PageView` → CAPI duplicates event
2. **User clicks CTA** → Pixel fires `CTAClicked` → CAPI duplicates event → Store fbp/fbc in Redis
3. **User converts** → MaxBounty postback → Retrieve fbp/fbc from Redis → CAPI fires `Lead` event

## Monitoring

### Facebook Events Manager

- Check event delivery in Facebook Events Manager
- Monitor for duplicate events (should be minimal due to deduplication)
- Verify event parameters and custom data

### Netlify Function Logs

- Check function logs in Netlify dashboard
- Monitor for errors in CAPI calls
- Verify data flow between functions

## Troubleshooting

### Common Issues

1. **Events not firing**

   - Check bot detection logs
   - Verify dwell time requirements
   - Check browser console for errors

2. **CAPI errors**

   - Verify access token is valid
   - Check function logs for API errors
   - Ensure proper event formatting

3. **Duplicate events**
   - Verify event IDs are consistent
   - Check both pixel and CAPI are using same IDs
   - Monitor Facebook Events Manager

### Debug Mode

Enable debug logging by checking browser console for:

- `BotD Result:` - Bot detection results
- `Human behavior validation` - Behavioral gate results
- `Event blocked` - Blocked events
- `CAPI tracking failed` - CAPI errors

## Security Notes

- Access tokens are stored in function code (consider using environment variables)
- Bot detection prevents invalid traffic
- Honeypot fields catch automated form submissions
- IP addresses are properly handled for privacy compliance

## Performance

- Events are fired asynchronously to avoid blocking page load
- CAPI calls are non-blocking with error handling
- Bot detection is lightweight and efficient
- Progressive content loading improves perceived performance
