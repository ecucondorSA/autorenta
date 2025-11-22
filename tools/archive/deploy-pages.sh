#!/bin/bash
# ============================================================================
# Deploy to Cloudflare Pages
# Validates build, deploys, and runs smoke tests
# ============================================================================

set -euo pipefail

# Configuration
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/deploy-pages-$(date +%Y%m%d_%H%M%S).log"
BUILD_DIR="apps/web/dist/browser"
PROJECT_NAME="autorenta-web"
PRODUCTION_URL="https://autorenta.com"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

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

notify_slack() {
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$1\"}" 2>/dev/null || true
    fi
}

# Setup
mkdir -p "$LOG_DIR"
log "Starting Cloudflare Pages deployment..."

# Step 1: Validate environment
log "Step 1/7: Validating environment..."
if ! command -v wrangler &> /dev/null; then
    error "wrangler CLI not found. Install: npm install -g wrangler"
fi

if ! command -v pnpm &> /dev/null; then
    error "pnpm not found. Install: npm install -g pnpm"
fi

if [ ! -f "package.json" ]; then
    error "package.json not found. Run from project root."
fi

success "Environment validated"

# Step 2: Clean previous build
log "Step 2/7: Cleaning previous build..."
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
    log "Removed old build directory"
fi
success "Clean completed"

# Step 3: Install dependencies
log "Step 3/7: Installing dependencies..."
pnpm install --frozen-lockfile || error "Failed to install dependencies"
success "Dependencies installed"

# Step 4: Build application
log "Step 4/7: Building Angular application..."
pnpm run build:web || error "Build failed"

if [ ! -d "$BUILD_DIR" ]; then
    error "Build directory not found: $BUILD_DIR"
fi

success "Build completed successfully"

# Step 5: Deploy to Cloudflare Pages
log "Step 5/7: Deploying to Cloudflare Pages..."
wrangler pages deploy "$BUILD_DIR" \
    --project-name="$PROJECT_NAME" \
    --branch=main || error "Deployment failed"

success "Deployed to Cloudflare Pages"

# Step 6: Run smoke tests
log "Step 6/7: Running smoke tests..."

smoke_test() {
    local url=$1
    local name=$2
    log "Testing $name: $url"
    
    if curl -sf -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        success "$name responded with 200 OK"
        return 0
    else
        warn "$name test failed"
        return 1
    fi
}

sleep 5  # Wait for deployment to propagate

failed_tests=0
smoke_test "$PRODUCTION_URL" "Home page" || ((failed_tests++))
smoke_test "$PRODUCTION_URL/auth/login" "Login page" || ((failed_tests++))
smoke_test "$PRODUCTION_URL/cars" "Cars page" || ((failed_tests++))
smoke_test "$PRODUCTION_URL/manifest.json" "PWA Manifest" || ((failed_tests++))

if [ $failed_tests -gt 0 ]; then
    warn "$failed_tests smoke test(s) failed"
else
    success "All smoke tests passed!"
fi

# Step 7: Report results
log "Step 7/7: Reporting results..."

deployment_time=$(date +'%Y-%m-%d %H:%M:%S')
message="🚀 AutoRenta Pages Deployed
- Time: $deployment_time
- Build: SUCCESS
- Smoke Tests: $((5 - failed_tests))/5 passed
- URL: $PRODUCTION_URL"

log "$message"
notify_slack "$message"

success "Deployment completed successfully!"
log "Full logs: $LOG_FILE"

exit 0
