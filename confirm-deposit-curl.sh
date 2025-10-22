#!/bin/bash

# Manual Deposit Confirmation via Supabase RPC
# Uses service role key to bypass RLS

SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc"

TRANSACTION_ID="de0d1150-f237-4f42-95ef-1333cd9db21f"
PAYMENT_ID="130624829514"

echo "═══════════════════════════════════════════════════════"
echo "       MANUAL DEPOSIT CONFIRMATION"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Transaction ID: $TRANSACTION_ID"
echo "Payment ID: $PAYMENT_ID"
echo "Amount: \$250.00"
echo ""

# Payment metadata from MercadoPago
PAYMENT_METADATA='{
  "id": "130624829514",
  "status": "approved",
  "status_detail": "accredited",
  "payment_type_id": "account_money",
  "transaction_amount": 250.00,
  "net_amount": 239.75,
  "date_approved": "2025-10-20T11:33:00.000Z",
  "external_reference": "de0d1150-f237-4f42-95ef-1333cd9db21f",
  "payer": {
    "email": "reinamosquera2003@gmail.com",
    "first_name": "Reina Shakira",
    "last_name": "Mosquera Borja"
  }
}'

echo "Calling wallet_confirm_deposit..."
echo ""

# Call RPC function with service role key
RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/rest/v1/rpc/wallet_confirm_deposit" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"p_transaction_id\": \"$TRANSACTION_ID\",
    \"p_provider_transaction_id\": \"$PAYMENT_ID\",
    \"p_provider_metadata\": $PAYMENT_METADATA
  }")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q "error"; then
  echo "❌ ERROR confirming deposit"
  exit 1
else
  echo "✅ DEPOSIT CONFIRMED SUCCESSFULLY!"
fi

echo ""
echo "Verifying transaction..."

# Get transaction details
TX_RESPONSE=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/wallet_transactions?id=eq.$TRANSACTION_ID&select=*" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY")

echo "$TX_RESPONSE" | python3 -m json.tool
echo ""

# Get user balance
echo "Getting user balance..."
USER_ID=$(echo "$TX_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['user_id'])" 2>/dev/null)

if [ -n "$USER_ID" ]; then
  BALANCE_RESPONSE=$(curl -s -X POST \
    "$SUPABASE_URL/rest/v1/rpc/wallet_get_balance" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"p_user_id\": \"$USER_ID\"}")

  echo ""
  echo "User wallet balance:"
  echo "$BALANCE_RESPONSE" | python3 -m json.tool
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ OPERATION COMPLETED"
echo "═══════════════════════════════════════════════════════"
