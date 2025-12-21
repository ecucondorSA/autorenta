#!/bin/bash
# Load environment
if [ -f ".env.local" ]; then
  source .env.local
elif [ -f "../../.env.local" ]; then
  source ../../.env.local
fi

echo "🔍 [TEST] Probando flujo completo de depósito de wallet"
echo ""

SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
ANON_KEY="${SUPABASE_ANON_KEY}"
EMAIL="test-wallet@autorenta.com"
PASSWORD="TestWallet123!"

# 1. Login
echo "1️⃣ Autenticando usuario..."
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error al autenticar"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Autenticado"
echo "   Access Token: ${ACCESS_TOKEN:0:30}..."
echo ""

# 2. Iniciar depósito con RPC
echo "2️⃣ Iniciando depósito de ARS 1000..."
DEPOSIT_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/wallet_initiate_deposit" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"p_amount":1000,"p_provider":"mercadopago"}')

TRANSACTION_ID=$(echo "$DEPOSIT_RESPONSE" | jq -r '.[0].transaction_id')

if [ "$TRANSACTION_ID" == "null" ] || [ -z "$TRANSACTION_ID" ]; then
  echo "❌ Error al iniciar depósito"
  echo "$DEPOSIT_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Depósito iniciado"
echo "   Transaction ID: ${TRANSACTION_ID}"
echo ""

# 3. Crear preferencia de MercadoPago con Edge Function
echo "3️⃣ Creando preferencia de pago en MercadoPago..."
MP_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/mercadopago-create-preference" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"transaction_id\":\"${TRANSACTION_ID}\",\"amount\":1000,\"description\":\"Depósito de prueba - Test Wallet\"}")

# Verificar respuesta
echo "$MP_RESPONSE" | jq '.' > /tmp/mp_response.json

PREFERENCE_ID=$(echo "$MP_RESPONSE" | jq -r '.preference_id')
INIT_POINT=$(echo "$MP_RESPONSE" | jq -r '.init_point')

if [ "$PREFERENCE_ID" == "null" ] || [ -z "$PREFERENCE_ID" ]; then
  echo "❌ Error al crear preferencia"
  cat /tmp/mp_response.json
  exit 1
fi

echo "✅ Preferencia creada"
echo ""
echo "📋 Detalles:"
echo "   Preference ID: ${PREFERENCE_ID}"
echo "   Init Point: ${INIT_POINT}"
echo ""
echo "🎉 ¡PRUEBA EXITOSA!"
echo ""
echo "🔗 Abrir en el navegador para completar el pago:"
echo "   ${INIT_POINT}"
echo ""
