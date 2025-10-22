#!/bin/bash

# =========================================
# MANUAL WEBHOOK REINJECTION SCRIPT
# =========================================

PAYMENT_ID="${1}"
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
FUNCTION_NAME="mercadopago-webhook"

if [ -z "$PAYMENT_ID" ]; then
  echo "❌ Error: Payment ID required"
  echo "Usage: $0 <payment_id>"
  exit 1
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         MANUAL WEBHOOK REINJECTION                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Payment ID: $PAYMENT_ID"
echo "Edge Function: $SUPABASE_URL/functions/v1/$FUNCTION_NAME"
echo ""

# Create webhook payload
PAYLOAD=$(cat <<EOF
{
  "id": 1,
  "live_mode": true,
  "type": "payment",
  "date_created": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "user_id": 2302679571,
  "api_version": "v1",
  "action": "payment.updated",
  "data": {
    "id": "$PAYMENT_ID"
  }
}
EOF
)

echo "Payload:"
echo "$PAYLOAD" | python3 -m json.tool
echo ""
echo "Sending POST to Edge Function..."
echo ""

# Send webhook
RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/functions/v1/$FUNCTION_NAME" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU" \
  -d "$PAYLOAD")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool

# Check if successful
if echo "$RESPONSE" | grep -q '"success".*true'; then
  echo ""
  echo "✅ Webhook processed successfully!"
else
  echo ""
  echo "⚠️  Webhook may have failed - check response above"
fi

echo ""
echo "Check Supabase logs for details:"
echo "https://supabase.com/dashboard/project/obxvffplochgeiclibng/logs/edge-functions"
