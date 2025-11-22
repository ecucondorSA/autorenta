#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  🧪 PRODUCTION READINESS TEST - AUTORENTA                            ║
# ║  Comprehensive testing before deployment                            ║
# ╚══════════════════════════════════════════════════════════════════════╝

BASE_URL="${1:-http://localhost:4200}"
RESULTS_DIR="test-results-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$RESULTS_DIR"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

log() {
    echo -e "${1}" | tee -a "$RESULTS_DIR/test.log"
}

test_result() {
    if [ $1 -eq 0 ]; then
        log "${GREEN}✅ PASS${NC}: $2"
        ((TESTS_PASSED++))
        return 0
    else
        log "${RED}❌ FAIL${NC}: $2"
        ((TESTS_FAILED++))
        return 1
    fi
}

log ""
log "╔══════════════════════════════════════════════════════════════╗"
log "║   🧪 AUTORENTA PRODUCTION READINESS TEST                     ║"
log "╚══════════════════════════════════════════════════════════════╝"
log ""
log "Base URL: $BASE_URL"
log "Results dir: $RESULTS_DIR"
log ""

# ═══════════════════════════════════════════════════════════════
# 1. CHECK IF SERVER IS RUNNING
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[TEST 1]${NC} Server Availability"
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" > "$RESULTS_DIR/homepage-status.txt"
HTTP_STATUS=$(cat "$RESULTS_DIR/homepage-status.txt")

if [ "$HTTP_STATUS" = "200" ]; then
    test_result 0 "Server is running (HTTP 200)"
else
    test_result 1 "Server returned HTTP $HTTP_STATUS"
fi

# ═══════════════════════════════════════════════════════════════
# 2. CHECK HOMEPAGE CONTENT
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[TEST 2]${NC} Homepage Content"
curl -s "$BASE_URL" > "$RESULTS_DIR/homepage.html"

if grep -q "<app-root" "$RESULTS_DIR/homepage.html"; then
    test_result 0 "Angular app root found"
else
    test_result 1 "Angular app root not found"
fi

# ═══════════════════════════════════════════════════════════════
# 3. CHECK JAVASCRIPT BUNDLES
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[TEST 3]${NC} JavaScript Bundles"

# Extract script tags
grep -o 'src="[^"]*\.js"' "$RESULTS_DIR/homepage.html" | sed 's/src="//;s/"//' > "$RESULTS_DIR/scripts.txt"

SCRIPT_COUNT=$(wc -l < "$RESULTS_DIR/scripts.txt")
log "Found $SCRIPT_COUNT JavaScript files"

if [ "$SCRIPT_COUNT" -gt 0 ]; then
    test_result 0 "JavaScript bundles present"
else
    test_result 1 "No JavaScript bundles found"
fi

# ═══════════════════════════════════════════════════════════════
# 4. CHECK ENV.JS (Environment Configuration)
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[TEST 4]${NC} Environment Configuration"
curl -s "$BASE_URL/env.js" > "$RESULTS_DIR/env.js"

if grep -q "NG_APP_SUPABASE_URL" "$RESULTS_DIR/env.js"; then
    test_result 0 "Environment configuration loaded"
    
    # Check Supabase URL
    if grep -q "obxvffplochgeiclibng.supabase.co" "$RESULTS_DIR/env.js"; then
        log "  ${GREEN}✓${NC} Supabase URL configured"
    else
        log "  ${YELLOW}⚠${NC}  Supabase URL not found"
    fi
else
    test_result 1 "Environment configuration missing"
fi

# ═══════════════════════════════════════════════════════════════
# 5. CHECK SEARCH PAGE
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[TEST 5]${NC} Search Page"
curl -s "$BASE_URL/search" > "$RESULTS_DIR/search.html"

if [ -s "$RESULTS_DIR/search.html" ]; then
    test_result 0 "Search page accessible"
else
    test_result 1 "Search page not accessible"
fi

# ═══════════════════════════════════════════════════════════════
# 6. DATABASE CONNECTION TEST
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[TEST 6]${NC} Database Connection"

export PGPASSWORD='ECUCONDOR08122023'
DB_RESULT=$(psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "SELECT NOW();" 2>&1)

if [[ $DB_RESULT == *"202"* ]]; then
    test_result 0 "Database connection successful"
    echo "$DB_RESULT" > "$RESULTS_DIR/db-connection.txt"
else
    test_result 1 "Database connection failed"
    echo "$DB_RESULT" > "$RESULTS_DIR/db-connection-error.txt"
fi

# ═══════════════════════════════════════════════════════════════
# 7. CHECK CRON JOBS
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[TEST 7]${NC} Cron Jobs Status"

CRON_COUNT=$(psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "SELECT COUNT(*) FROM cron.job WHERE active = true;" 2>&1 | xargs)

if [ "$CRON_COUNT" -gt 0 ]; then
    test_result 0 "Cron Jobs active: $CRON_COUNT"
    
    # Get job details
    psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "SELECT jobname, schedule, active FROM cron.job;" > "$RESULTS_DIR/cron-jobs.txt" 2>&1
else
    test_result 1 "No active Cron Jobs found"
fi

# ═══════════════════════════════════════════════════════════════
# 8. CHECK REALTIME TABLES
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[TEST 8]${NC} Realtime Configuration"

REALTIME_COUNT=$(psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('exchange_rates', 'pricing_demand_snapshots', 'pricing_special_events');" 2>&1 | xargs)

if [ "$REALTIME_COUNT" = "3" ]; then
    test_result 0 "Realtime enabled on 3 tables"
    
    # List tables
    psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';" > "$RESULTS_DIR/realtime-tables.txt" 2>&1
else
    test_result 1 "Realtime not fully configured ($REALTIME_COUNT/3)"
fi

# ═══════════════════════════════════════════════════════════════
# 9. CHECK EXCHANGE RATES DATA
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[TEST 9]${NC} Exchange Rates Data"

RATES_COUNT=$(psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "SELECT COUNT(*) FROM exchange_rates WHERE is_active = true;" 2>&1 | xargs)

if [ "$RATES_COUNT" -gt 0 ]; then
    test_result 0 "Exchange rates active: $RATES_COUNT"
    
    # Get latest rate
    psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "SELECT pair, binance_rate, platform_rate, last_updated FROM exchange_rates WHERE is_active = true ORDER BY last_updated DESC LIMIT 3;" > "$RESULTS_DIR/exchange-rates.txt" 2>&1
else
    test_result 1 "No active exchange rates found"
fi

# ═══════════════════════════════════════════════════════════════
# 10. CHECK DEMAND SNAPSHOTS
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[TEST 10]${NC} Demand Snapshots"

SNAPSHOTS_COUNT=$(psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "SELECT COUNT(*) FROM pricing_demand_snapshots WHERE timestamp > NOW() - INTERVAL '1 hour';" 2>&1 | xargs)

if [ "$SNAPSHOTS_COUNT" -gt 0 ]; then
    test_result 0 "Demand snapshots in last hour: $SNAPSHOTS_COUNT"
    
    # Get recent snapshots
    psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "SELECT r.name, ds.surge_factor, ds.timestamp FROM pricing_demand_snapshots ds JOIN pricing_regions r ON ds.region_id = r.id ORDER BY ds.timestamp DESC LIMIT 5;" > "$RESULTS_DIR/demand-snapshots.txt" 2>&1
else
    test_result 1 "No recent demand snapshots (check Cron Job)"
fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

log ""
log "╔══════════════════════════════════════════════════════════════╗"
log "║                    TEST RESULTS SUMMARY                      ║"
log "╚══════════════════════════════════════════════════════════════╝"
log ""
log "Total Tests: $TOTAL_TESTS"
log "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
log "${RED}❌ Failed: $TESTS_FAILED${NC}"
log ""
log "Detailed results saved to: $RESULTS_DIR/"
log ""

if [ $TESTS_FAILED -eq 0 ]; then
    log "${GREEN}🎉 ALL TESTS PASSED - READY FOR PRODUCTION${NC}"
    exit 0
else
    log "${RED}⚠️  SOME TESTS FAILED - REVIEW BEFORE DEPLOYMENT${NC}"
    exit 1
fi
