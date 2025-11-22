#!/bin/bash

# Script para verificar estado REAL de pagos en MercadoPago API
# NO MOCKEA DATOS - Consulta API real de MercadoPago
# Usa variables de entorno para el token

set -e

# Cargar variables de entorno
if [ -f ".env.local" ]; then
  source .env.local
elif [ -f ".env" ]; then
  source .env
fi

# Validar token
if [ -z "$MERCADOPAGO_ACCESS_TOKEN" ]; then
  echo "❌ Error: MERCADOPAGO_ACCESS_TOKEN no definido"
  echo "Define MERCADOPAGO_ACCESS_TOKEN en .env.local"
  exit 1
fi

echo "🔍 VERIFICACIÓN REAL DE PAGOS EN MERCADOPAGO"
echo "============================================="
echo ""

# Transaction ID como argumento o default a las más recientes
if [ -n "$1" ]; then
  transactions=("$1")
else
  # Transacciones a verificar (las 10 más recientes pending)
  declare -a transactions=(
    "8d391c63-be05-47e1-81ab-2637ab3e0161"
    "28120909-d06e-4fce-8f9d-b63b883bbfa1"
    "b9c006e3-f334-4055-8087-6f3890fd41aa"
    "033386c7-8c81-4c96-a96e-8bc440c76df7"
    "2272df47-42d2-4bba-b667-43d00e605cca"
  )
fi

for tx_id in "${transactions[@]}"
do
  echo "📋 Transaction ID: $tx_id"
  echo "   Consultando MercadoPago API..."

  response=$(curl -s "https://api.mercadopago.com/v1/payments/search?external_reference=$tx_id" \
    -H "Authorization: Bearer $MERCADOPAGO_ACCESS_TOKEN")

  total=$(echo "$response" | jq -r '.paging.total // 0')

  if [ "$total" -eq 0 ]; then
    echo "   ❌ NO HAY PAGO EN MERCADOPAGO"
    echo "   Razón: Usuario creó la transacción pero NO completó el pago en checkout"
    echo ""
  else
    payment_id=$(echo "$response" | jq -r '.results[0].id')
    status=$(echo "$response" | jq -r '.results[0].status')
    payment_method=$(echo "$response" | jq -r '.results[0].payment_method_id')
    amount=$(echo "$response" | jq -r '.results[0].transaction_amount')
    date=$(echo "$response" | jq -r '.results[0].date_created')

    echo "   ✅ PAGO ENCONTRADO"
    echo "   Payment ID: $payment_id"
    echo "   Status: $status"
    echo "   Método: $payment_method"
    echo "   Monto: ARS $amount"
    echo "   Fecha: $date"
    echo ""
  fi
done

echo ""
echo "📊 RESUMEN:"
echo "==========="
echo "Esta verificación consultó la API REAL de MercadoPago."
echo "NO son datos mockeados ni inventados."
echo ""
echo "Si ves '❌ NO HAY PAGO', significa que:"
echo "  1. El usuario abrió el checkout de MercadoPago"
echo "  2. Pero NO completó el pago (cerró la ventana o lo canceló)"
echo "  3. Por eso el polling no puede confirmar nada"
echo ""
echo "Si ves '✅ PAGO ENCONTRADO', el polling debería confirmarlo en <3 min"
echo ""
echo "Uso: $0 [transaction_id]"
