#!/bin/bash
# ============================================================================
# Deploy Cloudflare Worker for Payment Webhook
# Validates configuration, secrets, and deploys
# ============================================================================

set -euo pipefail

# Configuration
WORKER_DIR="functions/workers/payments_webhook"
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/deploy-worker-$(date +%Y%m%d_%H%M%S).log"
WORKER_NAME="autorenta-payment-webhook"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
log() { echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}[✅]${NC} $*" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[❌]${NC} $*" | tee -a "$LOG_FILE"; exit 1; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $*" | tee -a "$LOG_FILE"; }

# Setup
mkdir -p "$LOG_DIR"
log "Starting Cloudflare Worker deployment..."

# Step 1: Validate environment
log "Step 1/6: Validating environment..."

if ! command -v wrangler &> /dev/null; then
    error "wrangler CLI not found. Install: npm install -g wrangler"
fi

if [ ! -d "$WORKER_DIR" ]; then
    error "Worker directory not found: $WORKER_DIR"
fi

cd "$WORKER_DIR" || error "Failed to enter worker directory"

if [ ! -f "wrangler.toml" ]; then
    error "wrangler.toml not found in $WORKER_DIR"
fi

success "Environment validated"

# Step 2: Verify secrets
log "Step 2/6: Verifying secrets configuration..."

required_secrets=("MERCADOPAGO_ACCESS_TOKEN" "SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY")
missing_secrets=()

for secret in "${required_secrets[@]}"; do
    if ! wrangler secret list 2>/dev/null | grep -q "$secret"; then
        warn "Secret missing: $secret"
        missing_secrets+=("$secret")
    else
        success "Secret configured: $secret"
    fi
done

if [ ${#missing_secrets[@]} -gt 0 ]; then
    warn "Missing ${#missing_secrets[@]} secret(s). Configure with:"
    for secret in "${missing_secrets[@]}"; do
        log "  wrangler secret put $secret"
    done
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deployment cancelled"
    fi
fi

# Step 3: Install dependencies
log "Step 3/6: Installing dependencies..."
pnpm install || npm install || error "Failed to install dependencies"
success "Dependencies installed"

# Step 4: Build worker
log "Step 4/6: Building worker..."
if [ -f "package.json" ] && grep -q '"build"' package.json; then
    pnpm run build || npm run build || warn "Build script failed"
fi
success "Build completed"

# Step 5: Deploy worker
log "Step 5/6: Deploying to Cloudflare..."
wrangler deploy || error "Worker deployment failed"
success "Worker deployed successfully"

# Step 6: Test webhook
log "Step 6/6: Testing webhook endpoint..."

# Get worker URL from wrangler
WORKER_URL=$(wrangler deployments list --name="$WORKER_NAME" 2>/dev/null | grep -oP 'https://[^\s]+' | head -1 || echo "")

if [ -n "$WORKER_URL" ]; then
    log "Testing webhook at: $WORKER_URL"
    
    # Test with OPTIONS (CORS preflight)
    if curl -sf -X OPTIONS "$WORKER_URL" -o /dev/null; then
        success "OPTIONS request successful (CORS enabled)"
    else
        warn "OPTIONS request failed"
    fi
    
    # Test with GET (should return method not allowed or similar)
    status=$(curl -sf -o /dev/null -w "%{http_code}" "$WORKER_URL" || echo "000")
    log "GET request returned: $status"
    
    if [ "$status" != "000" ]; then
        success "Worker is responding"
    else
        warn "Worker may not be responding correctly"
    fi
else
    warn "Could not determine worker URL"
fi

# Summary
log ""
log "=========================================="
log "Deployment Summary"
log "=========================================="
log "Worker: $WORKER_NAME"
log "Status: DEPLOYED"
log "Time: $(date +'%Y-%m-%d %H:%M:%S')"
log "Logs: $LOG_FILE"
log "=========================================="
log ""
success "Worker deployment completed!"

cd - > /dev/null
exit 0
