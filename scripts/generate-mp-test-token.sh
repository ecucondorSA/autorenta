#!/bin/bash

# Script para generar un cardToken de prueba de Mercado Pago
# Útil para testing sin SDK frontend

# NOTA: Reemplaza con tu Public Key real desde el panel de MP
MP_PUBLIC_KEY="APP_USR-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx"

# Tarjeta de prueba de Mercado Pago (Sandbox)
# MASTERCARD - APRO (aprobada)
CARD_DATA='{
  "card_number": "5031755734530604",
  "security_code": "123",
  "expiration_month": 11,
  "expiration_year": 2025,
  "cardholder": {
    "name": "APRO",
    "identification": {
      "type": "DNI",
      "number": "12345678"
    }
  }
}'

echo "🔑 Generando cardToken de prueba..."
echo ""

# Llamar a la API de Mercado Pago para crear token
RESPONSE=$(curl -X POST \
  "https://api.mercadopago.com/v1/card_tokens?public_key=$MP_PUBLIC_KEY" \
  -H "Content-Type: application/json" \
  -d "$CARD_DATA" \
  2>/dev/null)

# Extraer el token ID
TOKEN_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ "$TOKEN_ID" != "null" ] && [ "$TOKEN_ID" != "" ]; then
  echo "✅ Token generado exitosamente:"
  echo ""
  echo "   $TOKEN_ID"
  echo ""
  echo "📋 Usa este token en el código (válido por 1 hora):"
  echo ""
  echo "   const cardToken = '$TOKEN_ID';"
  echo ""
else
  echo "❌ Error al generar token:"
  echo ""
  echo "$RESPONSE" | jq .
  echo ""
  echo "💡 Asegúrate de:"
  echo "   1. Tener la Public Key correcta"
  echo "   2. Estar usando la API de Sandbox (test)"
  echo ""
fi
