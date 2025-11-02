#!/bin/bash

# ============================================================================
# TEST MAXBOUNTY POSTBACK FLOW
# ============================================================================
# This script tests the complete MaxBounty → Postback → CAPI → Facebook flow
#
# What it tests:
# 1. Postback function receives MaxBounty callback
# 2. Postback function calls facebook-capi function
# 3. facebook-capi function sends Lead event to Facebook
#
# Check logs in:
# - Netlify Functions > postback (should see conversion received)
# - Netlify Functions > facebook-capi (should see Lead event sent)
# - Facebook Events Manager > Test Events (with test code) or main events
# ============================================================================

echo "🧪 Testing MaxBounty Postback → CAPI → Facebook Flow"
echo "=================================================="
echo ""

# Test parameters (realistic MaxBounty callback values)
AFFILIATE_ID="765749"  # Your MaxBounty affiliate ID
SESSION_ID="999888777"  # Fake session ID for testing
FBP="fb.1.1762000000000.1234567890123456789"  # Fake Facebook Browser ID
FBC="fb.1.1762000000000.abcdefghij"  # Fake Facebook Click ID
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
CAMPAIGN_ID="30127"
USER_IP="192.168.1.100"
RATE="7.00"
SALE="0"
CONVERSION_ID="test_conv_$(date +%s)"

echo "📊 Test Parameters:"
echo "  - Affiliate ID (s1): $AFFILIATE_ID"
echo "  - Session ID (s2): $SESSION_ID"
echo "  - Facebook Browser ID (s3): $FBP"
echo "  - Facebook Click ID (s4): $FBC"
echo "  - User Agent (s5): $USER_AGENT"
echo "  - Campaign ID: $CAMPAIGN_ID"
echo "  - User IP: $USER_IP"
echo "  - Rate: \$$RATE"
echo "  - Sale: \$$SALE"
echo "  - Conversion ID: $CONVERSION_ID"
echo ""
echo "🚀 Sending postback request..."
echo ""

# URL encode user agent
USER_AGENT_ENCODED=$(printf '%s' "$USER_AGENT" | jq -sRr @uri 2>/dev/null || python3 -c "import urllib.parse; print(urllib.parse.quote('$USER_AGENT'))" 2>/dev/null || echo "$USER_AGENT")

curl -X GET \
  "https://policypulse.online/.netlify/functions/postback?s1=$AFFILIATE_ID&s2=$SESSION_ID&s3=$FBP&s4=$FBC&s5=$USER_AGENT_ENCODED&OFFID=$CAMPAIGN_ID&IP=$USER_IP&RATE=$RATE&SALE=$SALE&CONVERSION_ID=$CONVERSION_ID" \
  -H "User-Agent: MaxBounty/1.0 (Postback Test)" \
  -H "X-Forwarded-For: $USER_IP" \
  -v

echo ""
echo ""
echo "✅ Test complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Check Netlify Function logs for 'postback' - should see conversion received"
echo "2. Check Netlify Function logs for 'facebook-capi' - should see Lead event sent"
echo "3. Check Facebook Events Manager - should see Lead event (or Test Events if using test code)"
echo ""
echo "🔍 View logs at:"
echo "   https://app.netlify.com/projects/keen-cranachan-385651/logs/functions"

