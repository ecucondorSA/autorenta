#!/bin/bash
# Script para agregar MERCADOPAGO_ACCESS_TOKEN al Worker
# Ejecutar: bash ADD_MERCADOPAGO_SECRET.sh

cd /home/edu/autorenta/functions/workers/payments_webhook

echo "════════════════════════════════════════════════════════════════"
echo "📝 AGREGAR SECRET AL WORKER"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Este script agregará MERCADOPAGO_ACCESS_TOKEN al Worker."
echo ""
echo "Pasos:"
echo "1. Se abrirá prompt para ingresar el token"
echo "2. Pega el token de MercadoPago (empieza con APP_USR-)"
echo "3. El secret se guardará encriptado en Cloudflare"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
read -p "¿Continuar? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelado"
    exit 1
fi

echo ""
echo "🔐 Ingresa el MERCADOPAGO_ACCESS_TOKEN cuando se solicite..."
echo ""

wrangler secret put MERCADOPAGO_ACCESS_TOKEN

if [ $? -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "✅ SECRET AGREGADO EXITOSAMENTE"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Verificar:"
    wrangler secret list
else
    echo ""
    echo "❌ ERROR al agregar secret"
    exit 1
fi
