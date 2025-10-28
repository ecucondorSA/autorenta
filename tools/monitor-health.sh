#!/bin/bash
# ============================================================================
# Health Monitoring Script
# Checks endpoints, database, workers, and alerts on issues
# ============================================================================

set -euo pipefail

# Configuration
PRODUCTION_URL="${PRODUCTION_URL:-https://autorenta.com}"
SUPABASE_URL="${SUPABASE_URL:-https://obxvffplochgeiclibng.supabase.co}"
WORKER_URL="${WORKER_URL:-}"
LOG_FILE="logs/health-check-$(date +%Y%m%d_%H%M%S).log"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
ERROR_THRESHOLD=5
PENDING_PAYMENT_THRESHOLD=120  # 2 hours in minutes

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
total_checks=0
failed_checks=0

# Functions
log() { echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}[✅]${NC} $*" | tee -a "$LOG_FILE"; ((total_checks++)); }
error() { echo -e "${RED}[❌]${NC} $*" | tee -a "$LOG_FILE"; ((failed_checks++)); ((total_checks++)); }
warn() { echo -e "${YELLOW}[⚠️]${NC} $*" | tee -a "$LOG_FILE"; }

notify() {
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 AutoRenta Alert: $1\"}" 2>/dev/null || true
    fi
}

# Setup
mkdir -p logs
log "Starting health monitoring..."

# Check 1: Production website
log "Check 1/5: Production website health..."
if curl -sf -o /dev/null -w "%{http_code}" "$PRODUCTION_URL" | grep -q "200"; then
    success "Website is up ($PRODUCTION_URL)"
else
    error "Website is down ($PRODUCTION_URL)"
    notify "Website is DOWN!"
fi

# Check 2: Supabase database
log "Check 2/5: Supabase database connectivity..."
if curl -sf -o /dev/null "$SUPABASE_URL/rest/v1/" -H "apikey: ${SUPABASE_ANON_KEY:-test}"; then
    success "Supabase is reachable"
else
    error "Supabase is unreachable"
    notify "Database connectivity FAILED!"
fi

# Check 3: Worker endpoint (if configured)
if [ -n "$WORKER_URL" ]; then
    log "Check 3/5: Worker health..."
    status=$(curl -sf -o /dev/null -w "%{http_code}" "$WORKER_URL" || echo "000")
    if [ "$status" != "000" ]; then
        success "Worker is responding (HTTP $status)"
    else
        error "Worker is not responding"
        notify "Payment Worker is DOWN!"
    fi
else
    warn "Check 3/5: Worker URL not configured, skipping"
fi

# Check 4: Critical endpoints
log "Check 4/5: Critical endpoints..."
critical_endpoints=(
    "$PRODUCTION_URL/auth/login"
    "$PRODUCTION_URL/cars"
    "$PRODUCTION_URL/manifest.json"
)

for endpoint in "${critical_endpoints[@]}"; do
    if curl -sf -o /dev/null "$endpoint"; then
        success "Endpoint OK: $endpoint"
    else
        error "Endpoint FAILED: $endpoint"
    fi
done

# Check 5: Application logs (simulated - would query Supabase)
log "Check 5/5: Recent error logs..."
# In real implementation, query Supabase for recent errors
# For now, just check if we have too many failed checks
if [ $failed_checks -ge $ERROR_THRESHOLD ]; then
    error "Too many failures detected: $failed_checks/$total_checks"
    notify "Multiple health checks failing! ($failed_checks failures)"
else
    success "Error rate is acceptable: $failed_checks/$total_checks"
fi

# Summary
log ""
log "=========================================="
log "Health Check Summary"
log "=========================================="
log "Time: $(date +'%Y-%m-%d %H:%M:%S')"
log "Total checks: $total_checks"
log "Failed checks: $failed_checks"
log "Success rate: $(( (total_checks - failed_checks) * 100 / total_checks ))%"
log "=========================================="

# Exit code
if [ $failed_checks -eq 0 ]; then
    success "All health checks passed!"
    exit 0
else
    error "Some health checks failed!"
    exit 1
fi
