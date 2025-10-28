#!/bin/bash
# Script para configurar secrets de Cloudflare Worker automáticamente

set -euo pipefail

echo "🔐 Configurando secrets de Cloudflare Worker..."
echo ""

# Cargar variables de entorno
if [ -f "../../../.env.local" ]; then
    source ../../../.env.local
else
    echo "❌ Error: .env.local no encontrado"
    exit 1
fi

# Verificar que las variables existen
if [ -z "${MERCADOPAGO_ACCESS_TOKEN:-}" ]; then
    echo "❌ Error: MERCADOPAGO_ACCESS_TOKEN no definida en .env.local"
    exit 1
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY no definida en .env.local"
    exit 1
fi

if [ -z "${SUPABASE_URL:-}" ]; then
    echo "❌ Error: SUPABASE_URL no definida en .env.local"
    exit 1
fi

echo "✅ Variables encontradas en .env.local"
echo ""

# Configurar secrets
echo "📤 Configurando MERCADOPAGO_ACCESS_TOKEN..."
echo "$MERCADOPAGO_ACCESS_TOKEN" | wrangler secret put MERCADOPAGO_ACCESS_TOKEN

echo ""
echo "📤 Configurando SUPABASE_URL..."
echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL

echo ""
echo "📤 Configurando SUPABASE_SERVICE_ROLE_KEY..."
echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY

echo ""
echo "✅ Secrets configurados exitosamente!"
echo ""
echo "🔍 Verificando secrets..."
wrangler secret list

echo ""
echo "✅ Setup completo!"
