#!/bin/bash
# Script para verificar configuración de despliegue

set -e

echo "🔍 Verificando configuración de despliegue..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que wrangler esté instalado
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}⚠️  Wrangler CLI no está instalado${NC}"
    echo "Instalando wrangler..."
    npm install -g wrangler
else
    echo -e "${GREEN}✅ Wrangler CLI instalado${NC}"
    wrangler --version
fi

echo ""
echo "📋 Secrets requeridos en GitHub:"
echo ""
echo "Cloudflare:"
echo "  - CF_API_TOKEN o CLOUDFLARE_API_TOKEN"
echo "  - CF_ACCOUNT_ID o CLOUDFLARE_ACCOUNT_ID"
echo ""
echo "Supabase:"
echo "  - SUPABASE_PROJECT_ID"
echo "  - SUPABASE_ACCESS_TOKEN"
echo "  - SUPABASE_DB_PASSWORD"
echo ""
echo "App Environment Variables:"
echo "  - NG_APP_SUPABASE_URL"
echo "  - NG_APP_SUPABASE_ANON_KEY"
echo "  - NG_APP_MAPBOX_ACCESS_TOKEN"
echo "  - NG_APP_MERCADOPAGO_PUBLIC_KEY"
echo "  - NG_APP_PAYMENTS_WEBHOOK_URL"
echo "  - NG_APP_CLOUDFLARE_WORKER_URL"
echo "  - NG_APP_SENTRY_DSN (opcional)"
echo ""
echo "Para verificar secrets en GitHub:"
echo "  https://github.com/[TU_REPO]/settings/secrets/actions"
echo ""
echo "🚀 Para desplegar manualmente:"
echo "  1. Ejecutar: npm run build:web"
echo "  2. Ejecutar: npm run deploy:web"
echo ""
echo "O usar GitHub Actions:"
echo "  - Push a main branch activará el workflow automáticamente"
echo "  - O ir a Actions > Build and Deploy > Run workflow"


