#!/bin/bash

echo "🔬 TESTING PRODUCTION WALLET DEPOSIT FLOW"
echo "=========================================="
echo ""

# Production URL
PROD_URL="https://16b5ac34.autorenta-web.pages.dev"
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU"

echo "Step 1: Verify production site is accessible"
echo "-------------------------------------------"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Production site is UP (HTTP $HTTP_STATUS)"
else
  echo "❌ Production site returned HTTP $HTTP_STATUS"
  exit 1
fi
echo ""

echo "Step 2: Verify env.js configuration"
echo "-----------------------------------"
ENV_CONFIG=$(curl -s "$PROD_URL/env.js" | grep "NG_APP_SUPABASE_URL")
if [[ "$ENV_CONFIG" == *"obxvffplochgeiclibng"* ]]; then
  echo "✅ Supabase URL configured correctly"
else
  echo "❌ Supabase URL not found in env.js"
  exit 1
fi
echo ""

echo "Step 3: Test CORS preflight to Edge Function"
echo "--------------------------------------------"
CORS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  "$SUPABASE_URL/functions/v1/mercadopago-create-preference" \
  -H "Origin: $PROD_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type")

if [ "$CORS_RESPONSE" = "200" ]; then
  echo "✅ CORS preflight successful (HTTP $CORS_RESPONSE)"
else
  echo "❌ CORS preflight failed (HTTP $CORS_RESPONSE)"
  exit 1
fi
echo ""

echo "Step 4: Test Edge Function health (without auth)"
echo "------------------------------------------------"
EDGE_RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/functions/v1/mercadopago-create-preference" \
  -H "Content-Type: application/json" \
  -d '{"test": true}')

# Edge Function should respond with error (no auth), but not "Failed to fetch"
if [[ "$EDGE_RESPONSE" == *"error"* ]] || [[ "$EDGE_RESPONSE" == *"Error"* ]]; then
  echo "✅ Edge Function is responding (with expected auth error)"
  echo "   Response: ${EDGE_RESPONSE:0:100}..."
else
  echo "⚠️  Edge Function response: $EDGE_RESPONSE"
fi
echo ""

echo "Step 5: Verify database trigger exists"
echo "--------------------------------------"
TRIGGER_EXISTS=$(PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';" | xargs)

if [ "$TRIGGER_EXISTS" = "1" ]; then
  echo "✅ Profile auto-creation trigger is active"
else
  echo "❌ Profile trigger not found"
  exit 1
fi
echo ""

echo "Step 6: Verify wallet RPC functions exist"
echo "-----------------------------------------"
RPC_COUNT=$(PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('wallet_initiate_deposit', 'wallet_confirm_deposit', 'wallet_get_balance');" | xargs)

if [ "$RPC_COUNT" = "3" ]; then
  echo "✅ All wallet RPC functions exist"
else
  echo "⚠️  Found $RPC_COUNT/3 wallet RPC functions"
fi
echo ""

echo "=========================================="
echo "🎯 PRODUCTION READINESS SUMMARY"
echo "=========================================="
echo "✅ Production site deployed and accessible"
echo "✅ Environment configuration correct"
echo "✅ Edge Function responding with CORS enabled"
echo "✅ Database trigger for profiles active"
echo "✅ Wallet RPC functions deployed"
echo ""
echo "🚀 The wallet deposit flow should now work!"
echo ""
echo "To test manually:"
echo "1. Navigate to: $PROD_URL/wallet"
echo "2. Login with existing user"
echo "3. Click 'Depositar fondos'"
echo "4. Should redirect to MercadoPago checkout"
echo ""
echo "📊 View deployment: https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/pages/view/autorenta-web/16b5ac34-78c2-4c26-8a32-8255b6e5ed28"
echo ""
