#!/bin/bash

# Script para verificar si el Access Token de MP es TEST o PROD

echo "🔍 Verificando modo del Access Token de Mercado Pago..."
echo ""

# Obtener el token del secret (solo primeros 20 chars para seguridad)
TOKEN=$(npx supabase secrets list 2>/dev/null | grep MERCADOPAGO_ACCESS_TOKEN | awk '{print $1}')

if [ -z "$TOKEN" ]; then
    echo "❌ No se encontró MERCADOPAGO_ACCESS_TOKEN en los secrets"
    exit 1
fi

echo "✅ Token encontrado en secrets"
echo ""

# Verificar el prefijo del token
# TEST tokens empiezan con: TEST-
# PROD tokens empiezan con: APP_USR-

echo "📋 Para verificar manualmente:"
echo ""
echo "1. Ve al panel de Supabase:"
echo "   https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/functions"
echo ""
echo "2. Ve a 'Edge Function Secrets'"
echo ""
echo "3. Busca MERCADOPAGO_ACCESS_TOKEN"
echo ""
echo "4. Verifica el prefijo:"
echo "   - Si empieza con TEST-xxxxx → Es TEST (Sandbox) ✅"
echo "   - Si empieza con APP_USR-xxxxx → Es PRODUCCIÓN ❌"
echo ""
echo "💡 Para preauth (capture=false) NECESITAS un token TEST"
echo ""
echo "📍 Obtén tu token TEST desde:"
echo "   https://www.mercadopago.com.ar/developers/panel/credentials"
echo "   → Selecciona 'TEST' (no 'Producción')"
echo "   → Copia el 'Access Token'"
echo ""
echo "🔧 Para actualizar el secret:"
echo "   npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=TEST-tu-token-aqui"
echo ""
