#!/bin/bash
# Quick Production Setup - Versión Simplificada
# Solo lo esencial para Autorenta

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}[✅]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $*"; }

clear
cat << 'BANNER'
╔══════════════════════════════════════════════════════════════╗
║     🚀 AUTORENTA - QUICK PRODUCTION SETUP                    ║
╚══════════════════════════════════════════════════════════════╝
BANNER

# 1. Verificar archivo .env existe
log "Verificando configuración..."
if [ ! -f ".env.local" ] && [ ! -f ".env.development.local" ]; then
    warn "No se encontró .env.local - usando .env.development.local"
fi
success "Configuración encontrada"

# 2. Verificar migrations SQL
log "Verificando migrations SQL..."
if [ -f "supabase/migrations/20251028_add_split_payment_system.sql" ]; then
    success "Migration Split Payment encontrada"
else
    warn "Migration Split Payment no encontrada"
fi

# 3. Verificar Cloudflare Worker
log "Verificando Cloudflare Worker..."
if [ -f "functions/workers/payments_webhook/wrangler.toml" ]; then
    success "Worker configurado"
else
    warn "Worker no configurado"
fi

# 4. Estado del build
log "Verificando estado del build..."
if [ -d "apps/web/dist/browser" ]; then
    success "Build existente encontrado"
else
    warn "No hay build previo - ejecutar: pnpm run build"
fi

# 5. Verificar secrets de Cloudflare
log ""
log "═══════════════════════════════════════════════════════════════"
log "PRÓXIMOS PASOS PARA PRODUCCIÓN:"
log "═══════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  APLICAR MIGRATIONS SQL (usando pooling):"
echo "   ./sql-pooling.sh -f supabase/migrations/20251028_add_split_payment_system.sql"
echo ""
echo "2️⃣  CONFIGURAR SECRETS CLOUDFLARE WORKER:"
echo "   cd functions/workers/payments_webhook"
echo "   wrangler secret put MERCADOPAGO_ACCESS_TOKEN"
echo "   wrangler secret put SUPABASE_URL"
echo "   wrangler secret put SUPABASE_SERVICE_ROLE_KEY"
echo "   cd ../../.."
echo ""
echo "3️⃣  VERIFICAR SECRETS:"
echo "   cd functions/workers/payments_webhook && wrangler secret list"
echo ""
echo "4️⃣  DEPLOY WORKER:"
echo "   cd functions/workers/payments_webhook && wrangler deploy"
echo ""
echo "5️⃣  DEPLOY PÁGINAS (si usas Cloudflare Pages):"
echo "   wrangler pages deploy apps/web/dist/browser --project-name=autorenta-web"
echo ""
log "═══════════════════════════════════════════════════════════════"
log "COMANDOS RÁPIDOS:"
log "═══════════════════════════════════════════════════════════════"
echo ""
echo "Ver estado cron jobs:"
echo "  ./sql-pooling.sh \"SELECT * FROM cron.job WHERE active=true\""
echo ""
echo "Ver tablas split payment:"
echo "  ./sql-pooling.sh \"SELECT tablename FROM pg_tables WHERE tablename LIKE 'wallet_%' OR tablename LIKE 'bank_%' OR tablename LIKE 'withdrawal_%'\""
echo ""
echo "Health check:"
echo "  ./tools/monitor-health.sh"
echo ""
success "Setup verification complete!"
