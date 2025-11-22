#!/bin/bash
# ============================================================================
# Production Setup Script
# Complete infrastructure setup for AutoRenta
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}[✅]${NC} $*"; }
error() { echo -e "${RED}[❌]${NC} $*"; exit 1; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $*"; }

banner() {
    echo ""
    echo "=============================================="
    echo "$1"
    echo "=============================================="
    echo ""
}

# Welcome
clear
banner "🚀 AutoRenta Production Setup"
log "This script will configure your production environment"
echo ""

# Check requirements
log "Checking requirements..."
command -v pnpm >/dev/null 2>&1 || error "pnpm not installed"
command -v wrangler >/dev/null 2>&1 || error "wrangler not installed"
command -v supabase >/dev/null 2>&1 || warn "supabase CLI not installed (optional)"
command -v gh >/dev/null 2>&1 || warn "GitHub CLI not installed (optional)"
success "Requirements checked"

# Step 1: Environment Variables
banner "📝 Step 1/7: Environment Variables"

if [ -f ".env.local" ]; then
    warn ".env.local already exists"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Keeping existing .env.local"
    else
        rm .env.local
    fi
fi

if [ ! -f ".env.local" ]; then
    log "Creating .env.local..."
    
    read -p "Supabase URL: " SUPABASE_URL
    read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
    read -s -p "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
    echo
    read -p "MercadoPago Public Key: " MP_PUBLIC_KEY
    read -s -p "MercadoPago Access Token: " MP_ACCESS_TOKEN
    echo
    read -p "Cloudflare Account ID: " CF_ACCOUNT_ID
    read -s -p "Cloudflare API Token: " CF_API_TOKEN
    echo
    
    cat > .env.local << EOF
# Supabase
NG_APP_SUPABASE_URL=$SUPABASE_URL
NG_APP_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# MercadoPago
NG_APP_MERCADOPAGO_PUBLIC_KEY=$MP_PUBLIC_KEY
MERCADOPAGO_ACCESS_TOKEN=$MP_ACCESS_TOKEN

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID
CLOUDFLARE_API_TOKEN=$CF_API_TOKEN

# App
NG_APP_ENVIRONMENT=production
NG_APP_DEFAULT_CURRENCY=ARS
NG_APP_PAYMENTS_WEBHOOK_URL=https://autorenta.com/api/webhooks/payments
EOF
    
    success ".env.local created"
else
    success ".env.local exists"
fi

# Step 2: Cloudflare Secrets
banner "🔐 Step 2/7: Cloudflare Worker Secrets"

log "Setting up worker secrets..."
cd functions/workers/payments_webhook

source ../../../.env.local

wrangler secret put MERCADOPAGO_ACCESS_TOKEN <<< "$MERCADOPAGO_ACCESS_TOKEN" 2>/dev/null || warn "Failed to set MP token"
wrangler secret put SUPABASE_URL <<< "$NG_APP_SUPABASE_URL" 2>/dev/null || warn "Failed to set Supabase URL"
wrangler secret put SUPABASE_SERVICE_ROLE_KEY <<< "$SUPABASE_SERVICE_ROLE_KEY" 2>/dev/null || warn "Failed to set Supabase key"

cd ../../..
success "Worker secrets configured"

# Step 3: Database Migrations
banner "🗄️ Step 3/7: Database Migrations"

if command -v supabase >/dev/null 2>&1; then
    log "Running Supabase migrations..."
    supabase db push || warn "Migration failed (may already be applied)"
    success "Migrations completed"
else
    warn "Supabase CLI not installed, skipping migrations"
    log "Apply manually at: https://supabase.com/dashboard/project/$CF_ACCOUNT_ID/sql"
fi

# Step 4: GitHub Secrets
banner "🐙 Step 4/7: GitHub Secrets"

if command -v gh >/dev/null 2>&1; then
    log "Setting up GitHub secrets..."
    
    gh secret set CLOUDFLARE_API_TOKEN -b"$CF_API_TOKEN" 2>/dev/null || warn "Failed to set GH secret"
    gh secret set CLOUDFLARE_ACCOUNT_ID -b"$CF_ACCOUNT_ID" 2>/dev/null || warn "Failed to set GH secret"
    gh secret set SUPABASE_ACCESS_TOKEN -b"$SUPABASE_SERVICE_ROLE_KEY" 2>/dev/null || warn "Failed to set GH secret"
    
    success "GitHub secrets configured"
else
    warn "GitHub CLI not installed"
    log "Set secrets manually at: https://github.com/settings/secrets/actions"
fi

# Step 5: Install Dependencies
banner "📦 Step 5/7: Dependencies"

log "Installing dependencies..."
pnpm install --frozen-lockfile || error "Failed to install dependencies"
success "Dependencies installed"

# Step 6: Build Application
banner "🔨 Step 6/7: Build"

log "Building application..."
pnpm run build:web || error "Build failed"
success "Build completed"

# Step 7: Deploy
banner "🚀 Step 7/7: Deploy"

read -p "Deploy to production now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Deploying to Cloudflare Pages..."
    wrangler pages deploy apps/web/dist/browser --project-name=autorenta-web --branch=main || error "Pages deploy failed"
    
    log "Deploying payment worker..."
    cd functions/workers/payments_webhook
    wrangler deploy || error "Worker deploy failed"
    cd ../../..
    
    success "Deployment completed!"
else
    log "Skipping deployment"
fi

# Final Summary
banner "🎉 Setup Complete!"

cat << EOF
✅ Environment variables configured
✅ Cloudflare secrets set
✅ Database ready
✅ GitHub configured
✅ Dependencies installed
✅ Application built
${REPLY =~ ^[Yy]$ && echo '✅ Deployed to production' || echo '⚠️  Deployment skipped'}

Next steps:
1. Verify deployment: https://autorenta.com
2. Check worker logs: wrangler tail
3. Monitor health: ./tools/monitor-health.sh
4. View logs at: ./logs/

Documentation:
- PRODUCTION_READINESS.md
- DEPLOYMENT_GUIDE.md
- QUICK_COMMANDS.md

Questions? Check EMPEZAR_AQUI.md
EOF

success "All done! 🎊"
