# Test MaxBounty Postback Flow

## Quick Test Command

Run this curl command to test the complete MaxBounty → Postback → CAPI → Facebook flow:

```bash
curl -X GET "https://policypulse.online/.netlify/functions/postback?s1=765749&s2=999888777&s3=fb.1.1762000000000.1234567890123456789&s4=fb.1.1762000000000.abcdefghij&s5=Mozilla%2F5.0%20%28Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7%29%20AppleWebKit%2F537.36&OFFID=30127&IP=192.168.1.100&RATE=7.00&SALE=0&CONVERSION_ID=test_conv_$(date +%s)" -H "User-Agent: MaxBounty/1.0" -v
```

## What This Tests

1. **Postback Function** (`postback.js`):

   - Receives MaxBounty callback with all parameters
   - Extracts fbp, fbc, IP, user agent
   - Logs conversion data

2. **Facebook CAPI Function** (`facebook-capi.js`):

   - Receives Lead event from postback
   - Sends to Facebook Conversions API
   - Logs success/failure

3. **End Result**:
   - Lead event appears in Facebook Events Manager

## Check Logs

**Postback Function Logs:**

- Should see: `✅ [postback] MaxBounty postback received`
- Should see: `📊 [postback] Extracted conversion data`
- Should see: `✅ [postback] SUCCESS: Lead event sent to Facebook`

**Facebook CAPI Function Logs:**

- Should see: `✅ [facebook-capi] Request received`
- Should see: `✅ [facebook-capi] Lead event`
- Should see: `✅ [facebook-capi] SUCCESS: Lead sent to Facebook`

## Parameter Breakdown

- `s1=765749` - MaxBounty affiliate ID
- `s2=999888777` - Fake session ID (for testing)
- `s3=fb.1...` - Facebook Browser ID (fbp)
- `s4=fb.1...` - Facebook Click ID (fbc)
- `s5=Mozilla...` - User Agent (URL encoded)
- `OFFID=30127` - Campaign ID
- `IP=192.168.1.100` - User IP address
- `RATE=7.00` - Commission rate
- `SALE=0` - Sale amount (0 for lead)
- `CONVERSION_ID=test_conv_...` - Unique conversion ID

## Expected Response

You should get a JSON response like:

```json
{
  "success": true,
  "message": "Conversion tracked successfully",
  "data": {
    "fbp": "fb.1.1762000000000.1234567890123456789",
    "fbc": "fb.1.1762000000000.abcdefghij",
    "campaignId": "30127",
    "conversionId": "test_conv_..."
  }
}
```

## Troubleshooting

If you see errors:

- **Missing parameters**: Check that all query params are URL encoded
- **CAPI not called**: Check postback logs for errors
- **Facebook API error**: Check facebook-capi logs for Facebook API errors
- **Not in Facebook Events Manager**: Verify Pixel ID and Access Token are correct
