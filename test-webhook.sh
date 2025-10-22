#!/bin/bash

# Script para verificar que el webhook de MercadoPago esté funcionando

echo "🔔 VERIFICACIÓN DE WEBHOOK MERCADOPAGO"
echo "======================================"
echo ""

WEBHOOK_URL="https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook"

echo "📡 Endpoint del webhook:"
echo "   $WEBHOOK_URL"
echo ""

echo "🧪 Test 1: Verificar que el endpoint responde"
echo "   Enviando notificación de prueba..."
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "data": { "id": "test-webhook-verification" }
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo "   ✅ HTTP 200 OK - Webhook responde correctamente"
  echo "   Respuesta: $body"
else
  echo "   ❌ Error: HTTP $http_code"
  echo "   Respuesta: $body"
  echo ""
  echo "   Posibles causas:"
  echo "   - Edge Function no desplegada"
  echo "   - URL incorrecta"
  echo "   - Problema de red"
  exit 1
fi

echo ""
echo "🧪 Test 2: Verificar estructura de respuesta"

if echo "$body" | jq -e '.success' > /dev/null 2>&1; then
  echo "   ✅ Respuesta JSON válida"
  success=$(echo "$body" | jq -r '.success')
  message=$(echo "$body" | jq -r '.message')
  echo "   - success: $success"
  echo "   - message: $message"
else
  echo "   ⚠️ Respuesta no es JSON válido"
fi

echo ""
echo "📊 RESUMEN"
echo "=========="
echo ""

if [ "$http_code" -eq 200 ]; then
  echo "✅ Webhook está funcionando correctamente"
  echo ""
  echo "📋 PRÓXIMOS PASOS:"
  echo ""
  echo "1. Configurar en MercadoPago:"
  echo "   URL: https://www.mercadopago.com.ar/developers/panel/app"
  echo "   → Ir a Webhooks o IPN"
  echo "   → Agregar URL: $WEBHOOK_URL"
  echo "   → Eventos: payment.created, payment.updated"
  echo "   → Modo: Producción"
  echo "   → Guardar"
  echo ""
  echo "2. Hacer un depósito de prueba:"
  echo "   → Ir a: https://production.autorenta-web.pages.dev/wallet"
  echo "   → Depositar \$100"
  echo "   → Pagar en MercadoPago"
  echo "   → Esperar 5-10 segundos"
  echo "   → ✅ Balance actualizado automáticamente"
  echo ""
  echo "3. Verificar logs:"
  echo "   cd /home/edu/autorenta"
  echo "   supabase functions logs mercadopago-webhook --limit 10"
  echo ""
else
  echo "❌ Webhook NO está funcionando"
  echo ""
  echo "🔧 TROUBLESHOOTING:"
  echo ""
  echo "1. Verificar que Edge Function esté desplegada:"
  echo "   cd /home/edu/autorenta"
  echo "   supabase functions list | grep mercadopago-webhook"
  echo ""
  echo "2. Ver logs de la función:"
  echo "   supabase functions logs mercadopago-webhook --limit 20"
  echo ""
  echo "3. Re-desplegar si es necesario:"
  echo "   cd /home/edu/autorenta/supabase/functions/mercadopago-webhook"
  echo "   supabase functions deploy mercadopago-webhook"
  echo ""
fi

echo ""
echo "📖 Documentación completa:"
echo "   /home/edu/autorenta/CONFIGURAR_WEBHOOK_MERCADOPAGO.md"
echo "   /home/edu/autorenta/WEBHOOK_QUICKSTART.md"
