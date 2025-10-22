#!/bin/bash

# Script para probar el webhook con un payment_id real de MercadoPago
# Esto nos ayudará a ver exactamente dónde y por qué falla

WEBHOOK_URL="https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook"

echo "🧪 TEST DE WEBHOOK CON PAYMENT ID REAL"
echo "======================================"
echo ""

# Usar uno de los payment IDs que falló con 502
PAYMENT_ID="130635680108"

echo "📋 Payment ID a probar: $PAYMENT_ID"
echo "   (Este payment ID falló con 502 en el panel de MercadoPago)"
echo ""

echo "📡 Enviando webhook simulado..."
echo ""

# Simular el payload que MercadoPago envía
payload=$(cat <<EOF
{
  "id": 123456789,
  "live_mode": true,
  "type": "payment",
  "date_created": "2025-10-20T18:00:00.000-04:00",
  "user_id": 202984680,
  "api_version": "v1",
  "action": "payment.created",
  "data": {
    "id": "$PAYMENT_ID"
  }
}
EOF
)

echo "Payload a enviar:"
echo "$payload" | jq .
echo ""

# Enviar webhook
echo "⏱️ Enviando request (puede tardar 5-30 segundos)..."
echo ""

start_time=$(date +%s)

response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$payload")

end_time=$(date +%s)
elapsed=$((end_time - start_time))

# Parsear respuesta
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
time_total=$(echo "$response" | grep "TIME_TOTAL:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d' | sed '/TIME_TOTAL:/d')

echo "📊 RESULTADO:"
echo "============"
echo ""
echo "HTTP Status Code: $http_code"
echo "Tiempo total: ${time_total}s (${elapsed}s elapsed)"
echo ""
echo "Respuesta del servidor:"
if echo "$body" | jq . > /dev/null 2>&1; then
  echo "$body" | jq .
else
  echo "$body"
fi
echo ""

# Análisis del resultado
echo "🔍 ANÁLISIS:"
echo "============"
echo ""

if [ "$http_code" = "200" ]; then
  echo "✅ Webhook procesado correctamente (200 OK)"
  echo ""
  echo "Interpretación:"
  echo "  - El webhook recibió la notificación"
  echo "  - MercadoPago API respondió exitosamente"
  echo "  - La transacción fue confirmada o está siendo procesada"
  echo ""

  # Verificar si el pago ya estaba procesado
  if echo "$body" | jq -e '.message | contains("Already processed")' > /dev/null 2>&1; then
    echo "💡 Este pago ya fue procesado anteriormente"
    echo "   Razón: El polling backup ya lo confirmó después del error 502"
  fi

elif [ "$http_code" = "502" ]; then
  echo "❌ Error 502 - Bad Gateway"
  echo ""
  echo "Posibles causas:"
  echo "  1. MercadoPago API tardó mucho en responder (timeout)"
  echo "  2. MercadoPago API devolvió error o HTML en lugar de JSON"
  echo "  3. Edge Function alcanzó timeout (>10 segundos)"
  echo ""
  echo "Evidencia:"
  echo "  - Tiempo total: ${time_total}s"
  if (( $(echo "$time_total > 5" | bc -l) )); then
    echo "  ⚠️ Tiempo >5s indica posible timeout de MercadoPago API"
  fi
  echo ""

elif [ "$http_code" = "503" ]; then
  echo "⚠️ Error 503 - Service Unavailable"
  echo ""
  echo "Causa conocida:"
  echo "  - MercadoPago API devolvió HTML en lugar de JSON"
  echo "  - Esto ocurre cuando MP API está temporalmente caída"
  echo ""

else
  echo "⚠️ Código de error inesperado: $http_code"
  echo ""
fi

echo ""
echo "📝 RECOMENDACIONES:"
echo "=================="
echo ""

if [ "$http_code" = "200" ]; then
  echo "✅ El webhook está funcionando correctamente"
  echo ""
  echo "Conclusión:"
  echo "  Los errores 502 anteriores probablemente fueron:"
  echo "  - Problemas transitorios de MercadoPago API"
  echo "  - Webhooks duplicados que llegaron mientras se procesaba el primero"
  echo "  - Timing issues (pago aún no disponible en MP API cuando llegó webhook)"
  echo ""
  echo "  El sistema está diseñado para manejar estos casos:"
  echo "  - Webhook principal (rápido cuando funciona)"
  echo "  - Polling backup (confirma todo en 3-18 min)"
  echo "  - Botón manual (último recurso)"
  echo ""

else
  echo "🔧 Fixes sugeridos:"
  echo ""
  echo "1. Implementar cache de idempotencia (evitar procesar dos veces)"
  echo "2. Retornar 200 OK inmediatamente y procesar async"
  echo "3. Aumentar timeout de MercadoPago API call"
  echo ""
  echo "Ver análisis completo en:"
  echo "/home/edu/autorenta/debug-webhook-502.md"
  echo ""
fi

echo ""
echo "📖 Documentación:"
echo "================"
echo ""
echo "- Análisis completo: /home/edu/autorenta/debug-webhook-502.md"
echo "- Guía de webhook: /home/edu/autorenta/CONFIGURAR_WEBHOOK_MERCADOPAGO.md"
echo "- Investigación real: /home/edu/autorenta/INVESTIGACION_REAL_MERCADOPAGO.md"
