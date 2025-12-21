#!/bin/bash

###############################################################################
# AUTORENTA - CONSOLIDATED SCRIPT RUNNER
###############################################################################
# Single entry point for all development, testing, building, and deployment
# operations in the AutoRenta project.
#
# Usage:
#   ./tools/run.sh [command] [options]
#   npm run [command]  # Via package.json shortcuts
#
# Examples:
#   ./tools/run.sh dev              # Start development environment
#   ./tools/run.sh test:quick       # Run quick tests
#   ./tools/run.sh ci               # Run full CI pipeline
#   ./tools/run.sh deploy           # Deploy to production
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_DIR="$PROJECT_ROOT/apps/web"
WORKER_DIR="$PROJECT_ROOT/functions/workers/payments_webhook"
AI_WORKER_DIR="$PROJECT_ROOT/functions/workers/ai-car-generator"
E2E_DIR="$WEB_DIR/e2e"

# Configuration
BASH_TIMEOUT=900000  # 15 minutes for long-running commands
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

###############################################################################
# HELPER FUNCTIONS
###############################################################################

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✅${NC} $*"; }
error() { echo -e "${RED}❌${NC} $*" >&2; exit 1; }
warn() { echo -e "${YELLOW}⚠️${NC} $*"; }
info() { echo -e "${CYAN}ℹ${NC} $*"; }

header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $*"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 not found. Install: $2"
    fi
}

###############################################################################
# DEVELOPMENT COMMANDS
###############################################################################

cmd_dev() {
    header "🔧 Starting Development Environment"

    # Install dependencies if needed
    [ ! -d "$WEB_DIR/node_modules" ] && cmd_install_web
    [ ! -d "$WORKER_DIR/node_modules" ] && cmd_install_worker
    [ ! -d "$AI_WORKER_DIR/node_modules" ] && cmd_install_ai_worker

    log "Starting servers in background..."

    # Start web server
    (
        cd "$WEB_DIR"
        log "Starting Angular dev server on http://localhost:4200"
        npm run start
    ) &
    WEB_PID=$!
    echo $WEB_PID > /tmp/autorenta-web.pid

    # Start worker
    (
        cd "$WORKER_DIR"
        log "Starting payment webhook on http://localhost:8787"
        npm run dev
    ) &
    WORKER_PID=$!
    echo $WORKER_PID > /tmp/autorenta-worker.pid

    # Start AI image worker (Gemini)
    (
        cd "$AI_WORKER_DIR"
        log "Starting AI image worker (Gemini) on http://localhost:8788"
        npm run dev
    ) &
    AI_WORKER_PID=$!
    echo $AI_WORKER_PID > /tmp/autorenta-ai-worker.pid

    success "Development environment started!"
    info "Web:    http://localhost:4200"
    info "Worker: http://localhost:8787/webhooks/payments"
    info "AI:     http://localhost:8788"
    info "Stop with: Ctrl+C or './tools/run.sh dev:stop'"

    # Wait for processes
    wait
}

cmd_dev_web() {
    header "🌐 Starting Web App Only"
    cd "$WEB_DIR"
    npm run start
}

cmd_dev_worker() {
    header "⚙️  Starting Worker Only"
    cd "$WORKER_DIR"
    npm run dev
}

cmd_dev_ai_worker() {
    header "🧠 Starting AI Image Worker (Gemini) Only"
    cd "$AI_WORKER_DIR"
    npm run dev
}

cmd_dev_stop() {
    header "🛑 Stopping Development Environment"

    if [ -f /tmp/autorenta-web.pid ]; then
        WEB_PID=$(cat /tmp/autorenta-web.pid)
        kill $WEB_PID 2>/dev/null && success "Web server stopped"
        rm /tmp/autorenta-web.pid
    fi

    if [ -f /tmp/autorenta-worker.pid ]; then
        WORKER_PID=$(cat /tmp/autorenta-worker.pid)
        kill $WORKER_PID 2>/dev/null && success "Worker stopped"
        rm /tmp/autorenta-worker.pid
    fi

    if [ -f /tmp/autorenta-ai-worker.pid ]; then
        AI_WORKER_PID=$(cat /tmp/autorenta-ai-worker.pid)
        kill $AI_WORKER_PID 2>/dev/null && success "AI worker stopped"
        rm /tmp/autorenta-ai-worker.pid
    fi

    success "All servers stopped"
}

###############################################################################
# TESTING COMMANDS
###############################################################################

cmd_test() {
    header "🧪 Running All Tests"
    cd "$WEB_DIR"
    npm run test -- --watch=false --browsers=ChromeHeadless
}

cmd_test_quick() {
    header "🧪 Running Quick Tests (No Coverage)"
    cd "$WEB_DIR"
    npm run test -- --watch=false --browsers=ChromeHeadlessCI --code-coverage=false
}

cmd_test_coverage() {
    header "🧪 Running Tests with Coverage"
    cd "$WEB_DIR"
    npm run test -- --watch=false --browsers=ChromeHeadlessCI --code-coverage=true
    success "Coverage report: apps/web/coverage/index.html"
}

cmd_test_e2e() {
    header "🎭 Running E2E Tests"

    # Ensure the web app is running for E2E (Patchright targets BASE_URL which defaults to localhost:4200)
    # If it's not reachable, start it automatically and clean up afterwards.
    local STARTED_WEB_FOR_E2E=0
    local WEB_E2E_PID_FILE="/tmp/autorenta-e2e-web.pid"

    if command -v curl >/dev/null 2>&1; then
        local BASE_URL="${BASE_URL:-http://localhost:4200}"
        if ! curl -sS -o /dev/null --max-time 2 "$BASE_URL/"; then
            warn "Web server not reachable at $BASE_URL - starting dev server for E2E"
            (
                cd "$WEB_DIR"
                # start script already redirects output to app_start.log
                npm run start
            ) &
            echo $! > "$WEB_E2E_PID_FILE"
            STARTED_WEB_FOR_E2E=1

            # Wait up to ~60s for server to respond
            for i in {1..60}; do
                if curl -sS -o /dev/null --max-time 2 "$BASE_URL/"; then
                    break
                fi
                sleep 1
            done

            if ! curl -sS -o /dev/null --max-time 2 "$BASE_URL/"; then
                if [ -f "$WEB_E2E_PID_FILE" ]; then
                    kill "$(cat "$WEB_E2E_PID_FILE")" 2>/dev/null || true
                    rm -f "$WEB_E2E_PID_FILE"
                fi
                error "Web server did not become ready at $BASE_URL"
            fi
        fi
    else
        warn "curl not available; assuming web server is already running"
    fi

    # Patchright E2E suite lives under apps/web/e2e
    if [ ! -d "$E2E_DIR" ]; then
        error "E2E directory not found: $E2E_DIR"
    fi

    if [ ! -d "$E2E_DIR/node_modules" ]; then
        log "Installing E2E dependencies..."
        cd "$E2E_DIR"
        npm install
    fi

    # Install Patchright Chromium on first run (idempotent)
    if [ ! -d "$HOME/.cache/ms-playwright" ] && [ ! -d "$HOME/.cache/patchright" ]; then
        log "Installing Patchright Chromium..."
        cd "$E2E_DIR"
        npm run setup
    fi

    cd "$E2E_DIR"

    # If a test filter is provided, run only the marketplace suite so we can
    # target subsets like "cars-list/" without failing early in the login suite.
    local E2E_EXIT_CODE=0
    if [ -n "${E2E_FILTER:-}" ]; then
        npm run test:marketplace || E2E_EXIT_CODE=$?
    else
        npm run test || E2E_EXIT_CODE=$?
    fi

    # Cleanup auto-started web server
    if [ "$STARTED_WEB_FOR_E2E" -eq 1 ] && [ -f "$WEB_E2E_PID_FILE" ]; then
        kill "$(cat "$WEB_E2E_PID_FILE")" 2>/dev/null || true
        rm -f "$WEB_E2E_PID_FILE"
        success "Stopped web dev server started for E2E"
    fi

    return "$E2E_EXIT_CODE"
}

cmd_test_e2e_ui() {
    header "🎭 Running E2E Tests (UI Mode)"
    warn "UI mode is not supported for Patchright TSX suites."
    info "Run headed mode instead: cd apps/web/e2e && HEADLESS=false npm run test"
}

###############################################################################
# BUILDING COMMANDS
###############################################################################

cmd_build() {
    header "📦 Building All Components"
    cmd_build_web &
    WEB_BUILD_PID=$!
    cmd_build_worker &
    WORKER_BUILD_PID=$!

    wait $WEB_BUILD_PID
    WEB_RESULT=$?
    wait $WORKER_BUILD_PID
    WORKER_RESULT=$?

    if [ $WEB_RESULT -eq 0 ] && [ $WORKER_RESULT -eq 0 ]; then
        success "All builds completed!"
    else
        error "Build failed"
    fi
}

cmd_build_web() {
    log "Building web app..."
    cd "$WEB_DIR"
    npm run build
    success "Web build completed"
}

cmd_build_worker() {
    log "Building payment worker..."
    cd "$WORKER_DIR"
    npm run build
    success "Worker build completed"
}

###############################################################################
# DEPLOYMENT COMMANDS
###############################################################################

cmd_deploy() {
    header "🚀 Full Production Deployment"

    warn "You are about to deploy to PRODUCTION"
    echo -n "Did you run 'ci' pipeline successfully? (y/N): "
    read -r confirmation

    if [ "$confirmation" != "y" ] && [ "$confirmation" != "Y" ]; then
        error "Deployment cancelled"
    fi

    log "Deploying web app..."
    cmd_deploy_web

    log "Deploying all workers..."
    cmd_deploy_worker
    cmd_deploy_worker_doc_verifier
    cmd_deploy_worker_ai_car_generator

    success "🎉 Full deployment completed!"
}

cmd_deploy_web() {
    header "📦 Deploying Web to Cloudflare Pages"
    check_command wrangler "npm install -g wrangler"

    cd "$WEB_DIR"
    npm run build

    CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 \
        npx wrangler pages deploy dist/web/browser \
        --project-name=autorentar

    success "Web deployed to Cloudflare Pages"
    info "URL: https://autorentar.com"
}

cmd_deploy_worker() {
    header "📦 Deploying Payment Webhook Worker"
    check_command wrangler "npm install -g wrangler"

    cd "$WORKER_DIR"
    npm run build
    wrangler deploy

    success "Payment Webhook Worker deployed"
}

cmd_deploy_worker_doc_verifier() {
    header "📦 Deploying Doc Verifier Worker"
    check_command wrangler "npm install -g wrangler"

    cd "$PROJECT_ROOT/functions/workers/doc-verifier"
    wrangler deploy

    success "Doc Verifier Worker deployed"
}

cmd_deploy_worker_ai_car_generator() {
    header "📦 Deploying AI Car Generator Worker"
    check_command wrangler "npm install -g wrangler"

    cd "$PROJECT_ROOT/functions/workers/ai-car-generator"
    wrangler deploy

    success "AI Car Generator Worker deployed"
}

###############################################################################
# CI/CD COMMANDS
###############################################################################

cmd_ci() {
    header "🚀 CI/CD Pipeline"

    log "Phase 1/3: Linting & Testing (parallel)"

    # Run lint and test in parallel
    (cd "$WEB_DIR" && npm run lint) &
    LINT_PID=$!

    (cd "$WEB_DIR" && npm run test -- --watch=false --browsers=ChromeHeadless) &
    TEST_PID=$!

    wait $LINT_PID
    LINT_RESULT=$?
    wait $TEST_PID
    TEST_RESULT=$?

    if [ $LINT_RESULT -ne 0 ] || [ $TEST_RESULT -ne 0 ]; then
        error "Phase 1 failed (lint or tests)"
    fi
    success "Phase 1 completed"

    log "Phase 2/3: Building"
    cmd_build || error "Phase 2 failed (build)"
    success "Phase 2 completed"

    log "Phase 3/3: E2E Tests"
    cmd_test_e2e || warn "E2E tests failed (non-blocking)"

    success "🎉 CI pipeline completed successfully!"
    info "Ready to deploy: run './tools/run.sh deploy'"
}

cmd_lint() {
    header "🔍 Running Linter"
    cd "$WEB_DIR"
    npm run lint
}

cmd_lint_fix() {
    header "🔧 Auto-fixing Lint Issues"
    cd "$WEB_DIR"
    npm run format
    npm run lint -- --fix
    success "Lint issues fixed"
}

cmd_format() {
    header "✨ Formatting Code"
    cd "$WEB_DIR"
    npm run format
    success "Code formatted"
}

###############################################################################
# UTILITY COMMANDS
###############################################################################

cmd_install() {
    if [[ "${AUTORENTA_SKIP_INSTALL:-}" == "1" ]]; then
        info "Skipping nested install (AUTORENTA_SKIP_INSTALL=1)"
        return 0
    fi

    header "📦 Installing All Dependencies"
    cmd_install_web
    cmd_install_worker
    cmd_install_ai_worker

    success "All dependencies installed"
}

cmd_install_web() {
    log "Installing web dependencies..."
    cd "$WEB_DIR"
    pnpm install
    success "Web dependencies installed"
}

cmd_install_worker() {
    log "Installing worker dependencies..."
    cd "$WORKER_DIR"
    pnpm install
    success "Worker dependencies installed"
}

cmd_install_ai_worker() {
    log "Installing AI worker dependencies..."
    cd "$AI_WORKER_DIR"
    pnpm install
    success "AI worker dependencies installed"
}

cmd_clean() {
    header "🧹 Cleaning Build Artifacts"

    [ -d "$WEB_DIR/dist" ] && rm -rf "$WEB_DIR/dist" && log "Removed web/dist"
    [ -d "$WORKER_DIR/dist" ] && rm -rf "$WORKER_DIR/dist" && log "Removed worker/dist"
    [ -d "$WEB_DIR/.angular" ] && rm -rf "$WEB_DIR/.angular" && log "Removed .angular cache"

    success "Clean completed"
}

cmd_sync_types() {
    header "🔄 Syncing Database Types"
    bash "$SCRIPT_DIR/sync-types.sh" "$@"
}

cmd_sync_types_remote() {
    header "🔄 Syncing Database Types (Remote)"
    bash "$SCRIPT_DIR/sync-types.sh" --remote
}

###############################################################################
# SETUP COMMANDS
###############################################################################

cmd_setup_auth() {
    header "🔐 Setting Up Authentication"
    bash "$SCRIPT_DIR/setup-auth.sh"
}

cmd_setup_prod() {
    header "🏭 Setting Up Production Environment"
    bash "$SCRIPT_DIR/setup-production.sh"
}

###############################################################################
# MONITORING COMMANDS
###############################################################################

cmd_monitor_health() {
    header "🏥 Checking System Health"
    bash "$SCRIPT_DIR/monitor-health.sh"
}

cmd_monitor_wallet() {
    header "💰 Monitoring Wallet Deposits"
    bash "$SCRIPT_DIR/monitor-wallet-deposits.sh"
}

cmd_check_auth() {
    header "🔐 Checking Authentication Status"
    bash "$SCRIPT_DIR/check-auth.sh"
}

###############################################################################
# INFO COMMANDS
###############################################################################

cmd_status() {
    header "📊 Project Status"

    echo -e "${YELLOW}Git:${NC}"
    git -C "$PROJECT_ROOT" status -sb
    echo ""

    echo -e "${YELLOW}Build Artifacts:${NC}"
    [ -d "$WEB_DIR/dist" ] && success "Web build exists" || warn "Web build missing"
    [ -d "$WORKER_DIR/dist" ] && success "Worker build exists" || warn "Worker build missing"
    echo ""

    echo -e "${YELLOW}Dev Servers:${NC}"
    if [ -f /tmp/autorenta-web.pid ] && ps -p $(cat /tmp/autorenta-web.pid) > /dev/null 2>&1; then
        success "Web server running (PID: $(cat /tmp/autorenta-web.pid))"
    else
        warn "Web server not running"
    fi

    if [ -f /tmp/autorenta-worker.pid ] && ps -p $(cat /tmp/autorenta-worker.pid) > /dev/null 2>&1; then
        success "Worker running (PID: $(cat /tmp/autorenta-worker.pid))"
    else
        warn "Worker not running"
    fi

    if [ -f /tmp/autorenta-ai-worker.pid ] && ps -p $(cat /tmp/autorenta-ai-worker.pid) > /dev/null 2>&1; then
        success "AI worker running (PID: $(cat /tmp/autorenta-ai-worker.pid))"
    else
        warn "AI worker not running"
    fi
    echo ""

    echo -e "${YELLOW}Dependencies:${NC}"
    [ -d "$WEB_DIR/node_modules" ] && success "Web dependencies installed" || warn "Web dependencies missing"
    [ -d "$WORKER_DIR/node_modules" ] && success "Worker dependencies installed" || warn "Worker dependencies missing"
    [ -d "$AI_WORKER_DIR/node_modules" ] && success "AI worker dependencies installed" || warn "AI worker dependencies missing"
}

cmd_help() {
    cat << EOF

${BLUE}╔══════════════════════════════════════════════════════════╗${NC}
${BLUE}║${NC}  ${GREEN}AutoRenta - Consolidated Script Runner${NC}
${BLUE}╚══════════════════════════════════════════════════════════╝${NC}

${YELLOW}Usage:${NC}
  ./tools/run.sh [command] [options]
  npm run [command]

${YELLOW}Development:${NC}
  ${CYAN}dev${NC}              Start full dev environment (web + worker)
  ${CYAN}dev:web${NC}          Start web app only
  ${CYAN}dev:worker${NC}       Start worker only
    ${CYAN}dev:ai-worker${NC}    Start AI image worker only
  ${CYAN}dev:stop${NC}         Stop all dev servers

${YELLOW}Testing:${NC}
  ${CYAN}test${NC}             Run all tests
  ${CYAN}test:quick${NC}       Quick tests (no coverage)
  ${CYAN}test:coverage${NC}    Tests with coverage report
  ${CYAN}test:e2e${NC}         Run E2E tests with Playwright
  ${CYAN}test:e2e:ui${NC}      Run E2E tests in UI mode

${YELLOW}Building:${NC}
  ${CYAN}build${NC}            Build all components (parallel)
  ${CYAN}build:web${NC}        Build web app only
  ${CYAN}build:worker${NC}     Build worker only

${YELLOW}Deployment:${NC}
  ${CYAN}deploy${NC}           Full production deployment (requires confirmation)
  ${CYAN}deploy:web${NC}       Deploy web to Cloudflare Pages
  ${CYAN}deploy:worker${NC}    Deploy payment webhook worker

${YELLOW}CI/CD:${NC}
  ${CYAN}ci${NC}               Run full CI pipeline (lint + test + build)
  ${CYAN}lint${NC}             Run ESLint
  ${CYAN}lint:fix${NC}         Auto-fix lint issues
  ${CYAN}format${NC}           Format code with Prettier

${YELLOW}Utilities:${NC}
  ${CYAN}install${NC}          Install all dependencies
  ${CYAN}clean${NC}            Clean build artifacts
  ${CYAN}sync:types${NC}       Sync database types from Supabase (local)
  ${CYAN}sync:types:remote${NC} Sync database types from remote Supabase

${YELLOW}Setup (one-time):${NC}
  ${CYAN}setup:auth${NC}       Setup CLI authentication (GitHub, Supabase, Cloudflare)
  ${CYAN}setup:prod${NC}       Setup production environment

${YELLOW}Monitoring:${NC}
  ${CYAN}monitor:health${NC}   Check system health
  ${CYAN}monitor:wallet${NC}   Monitor wallet deposits
  ${CYAN}check:auth${NC}       Check authentication status

${YELLOW}Info:${NC}
  ${CYAN}status${NC}           Show project status
  ${CYAN}help${NC}             Show this help message

${YELLOW}Examples:${NC}
  ./tools/run.sh dev              # Start development
  ./tools/run.sh test:quick       # Quick test run
  ./tools/run.sh ci               # Full CI pipeline
  ./tools/run.sh deploy           # Deploy to production

${YELLOW}Configuration:${NC}
  Timeout: 15 minutes for long-running commands
  Auto-background: Enabled for build and deploy
  Logs: $LOG_DIR/

${GREEN}For more details, see: CLAUDE.md${NC}

EOF
}

###############################################################################
# COMMAND ROUTER
###############################################################################

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
    # Development
    dev) cmd_dev "$@" ;;
    dev:web) cmd_dev_web "$@" ;;
    dev:worker) cmd_dev_worker "$@" ;;
    dev:ai-worker) cmd_dev_ai_worker "$@" ;;
    dev:stop) cmd_dev_stop "$@" ;;

    # Testing
    test) cmd_test "$@" ;;
    test:quick) cmd_test_quick "$@" ;;
    test:coverage) cmd_test_coverage "$@" ;;
    test:e2e) cmd_test_e2e "$@" ;;
    test:e2e:ui) cmd_test_e2e_ui "$@" ;;

    # Building
    build) cmd_build "$@" ;;
    build:web) cmd_build_web "$@" ;;
    build:worker) cmd_build_worker "$@" ;;

    # Deployment
    deploy) cmd_deploy "$@" ;;
    deploy:web) cmd_deploy_web "$@" ;;
    deploy:worker) cmd_deploy_worker "$@" ;;
    deploy:worker:doc-verifier) cmd_deploy_worker_doc_verifier "$@" ;;
    deploy:worker:ai-car-generator) cmd_deploy_worker_ai_car_generator "$@" ;;

    # CI/CD
    ci) cmd_ci "$@" ;;
    lint) cmd_lint "$@" ;;
    lint:fix) cmd_lint_fix "$@" ;;
    format) cmd_format "$@" ;;

    # Utilities
    install) cmd_install "$@" ;;
    install:web) cmd_install_web "$@" ;;
    install:worker) cmd_install_worker "$@" ;;
    clean) cmd_clean "$@" ;;
    sync:types) cmd_sync_types "$@" ;;
    sync:types:remote) cmd_sync_types_remote "$@" ;;

    # Setup
    setup:auth) cmd_setup_auth "$@" ;;
    setup:prod) cmd_setup_prod "$@" ;;

    # Monitoring
    monitor:health) cmd_monitor_health "$@" ;;
    monitor:wallet) cmd_monitor_wallet "$@" ;;
    check:auth) cmd_check_auth "$@" ;;

    # Info
    status) cmd_status "$@" ;;
    help|--help|-h) cmd_help "$@" ;;

    *)
        error "Unknown command: $COMMAND\nRun './tools/run.sh help' for usage"
        ;;
esac
