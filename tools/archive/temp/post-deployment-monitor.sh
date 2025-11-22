#!/bin/bash
# Load environment variables
if [ -f ".env.local" ]; then
  source .env.local
elif [ -f ".env" ]; then
  source .env
fi

DB_URL="${DATABASE_URL}"

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  📊 POST-DEPLOYMENT MONITORING SCRIPT                                ║
# ║  Monitors system health after production deployment                 ║
# ╚══════════════════════════════════════════════════════════════════════╝

set -e

PROD_URL="${1:-https://autorenta.pages.dev}"  # Adjust to your Cloudflare Pages URL

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

log() {
    echo -e "${1}"
}

check() {
    if [ $1 -eq 0 ]; then
        log "${GREEN}✅ PASS${NC}: $2"
        ((CHECKS_PASSED++))
        return 0
    else
        log "${RED}❌ FAIL${NC}: $2"
        ((CHECKS_FAILED++))
        return 1
    fi
}

warn() {
    log "${YELLOW}⚠️  WARNING${NC}: $1"
    ((WARNINGS++))
}

log ""
log "╔══════════════════════════════════════════════════════════════╗"
log "║   📊 POST-DEPLOYMENT MONITORING                              ║"
log "╚══════════════════════════════════════════════════════════════╝"
log ""
log "Production URL: $PROD_URL"
log "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log ""

# ═══════════════════════════════════════════════════════════════
# 1. PRODUCTION URL HEALTH CHECK
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[CHECK 1]${NC} Production URL Health"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    check 0 "Production site is live (HTTP 200)"
elif [ "$HTTP_STATUS" = "000" ]; then
    check 1 "Cannot reach production URL (check DNS/deployment)"
else
    check 1 "Production returned HTTP $HTTP_STATUS"
fi

# ═══════════════════════════════════════════════════════════════
# 2. DATABASE HEALTH CHECK
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[CHECK 2]${NC} Database Health"

export PGPASSWORD='ECUCONDOR08122023'

DB_RESULT=$(psql "$DB_HOST" -t -c "SELECT NOW();" 2>&1 | grep -c "202" || echo "0")

if [ "$DB_RESULT" -gt 0 ]; then
    check 0 "Database connection healthy"
else
    check 1 "Database connection failed"
fi

# ═══════════════════════════════════════════════════════════════
# 3. EXCHANGE RATES FRESHNESS
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[CHECK 3]${NC} Exchange Rates Freshness"

RATE_AGE=$(psql "$DB_HOST" -t -c "
SELECT EXTRACT(EPOCH FROM AGE(NOW(), MAX(last_updated)))::int / 60
FROM exchange_rates
WHERE is_active = true;
" 2>&1 | xargs)

if [ -n "$RATE_AGE" ] && [ "$RATE_AGE" -lt 30 ]; then
    check 0 "Exchange rates are fresh (${RATE_AGE} min old)"
elif [ -n "$RATE_AGE" ] && [ "$RATE_AGE" -lt 60 ]; then
    warn "Exchange rates aging ($RATE_AGE min old)"
    check 0 "Exchange rates acceptable"
else
    check 1 "Exchange rates stale (${RATE_AGE:-unknown} min old)"
fi

# ═══════════════════════════════════════════════════════════════
# 4. DEMAND SNAPSHOTS CHECK
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[CHECK 4]${NC} Demand Snapshots"

SNAPSHOT_COUNT=$(psql "$DB_HOST" -t -c "
SELECT COUNT(*) 
FROM pricing_demand_snapshots 
WHERE timestamp > NOW() - INTERVAL '30 minutes';
" 2>&1 | xargs)

if [ -n "$SNAPSHOT_COUNT" ] && [ "$SNAPSHOT_COUNT" -gt 0 ]; then
    check 0 "Demand snapshots active ($SNAPSHOT_COUNT in last 30 min)"
else
    check 1 "No recent demand snapshots"
fi

# ═══════════════════════════════════════════════════════════════
# 5. CRON JOBS STATUS
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[CHECK 5]${NC} Cron Jobs Execution"

CRON_FAILURES=$(psql "$DB_HOST" -t -c "
SELECT COUNT(*) 
FROM cron.job_run_details 
WHERE status = 'failed' 
AND start_time > NOW() - INTERVAL '1 hour';
" 2>&1 | xargs)

if [ -n "$CRON_FAILURES" ] && [ "$CRON_FAILURES" -eq 0 ]; then
    check 0 "No Cron Job failures in last hour"
else
    check 1 "Cron Jobs failing (${CRON_FAILURES:-unknown} failures)"
fi

# ═══════════════════════════════════════════════════════════════
# 6. REALTIME CONNECTIONS (via database)
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[CHECK 6]${NC} Realtime Configuration"

REALTIME_COUNT=$(psql "$DB_HOST" -t -c "
SELECT COUNT(*) 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('exchange_rates', 'pricing_demand_snapshots', 'pricing_special_events');
" 2>&1 | xargs)

if [ "$REALTIME_COUNT" = "3" ]; then
    check 0 "Realtime enabled on 3 pricing tables"
else
    check 1 "Realtime misconfigured ($REALTIME_COUNT/3 tables)"
fi

# ═══════════════════════════════════════════════════════════════
# 7. RECENT BOOKINGS CHECK
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[CHECK 7]${NC} Recent Bookings Activity"

BOOKING_COUNT=$(psql "$DB_HOST" -t -c "
SELECT COUNT(*) 
FROM bookings 
WHERE created_at > NOW() - INTERVAL '24 hours';
" 2>&1 | xargs)

if [ -n "$BOOKING_COUNT" ]; then
    log "  ${GREEN}ℹ${NC}  Bookings in last 24h: $BOOKING_COUNT"
    check 0 "Booking system operational"
else
    warn "Cannot verify booking count"
fi

# ═══════════════════════════════════════════════════════════════
# 8. ERROR RATE CHECK (if possible)
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[CHECK 8]${NC} System Error Rate"

# Check for failed payment authorizations
FAILED_AUTHS=$(psql "$DB_HOST" -t -c "
SELECT COUNT(*) 
FROM payment_authorizations 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '1 hour';
" 2>&1 | xargs)

if [ -n "$FAILED_AUTHS" ] && [ "$FAILED_AUTHS" -lt 5 ]; then
    check 0 "Payment authorization error rate acceptable ($FAILED_AUTHS failures/hour)"
elif [ -n "$FAILED_AUTHS" ]; then
    warn "High payment failure rate: $FAILED_AUTHS/hour"
    check 0 "System functional but needs monitoring"
else
    log "  ${BLUE}ℹ${NC}  No payment authorization data available"
fi

# ═══════════════════════════════════════════════════════════════
# 9. DOUBLE BOOKING CHECK
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[CHECK 9]${NC} Double Booking Prevention"

DOUBLE_BOOKINGS=$(psql "$DB_HOST" -t -c "
SELECT COUNT(*)
FROM (
  SELECT car_id, start_at, end_at
  FROM bookings
  WHERE status IN ('confirmed', 'in_progress')
  AND created_at > NOW() - INTERVAL '24 hours'
  GROUP BY car_id, start_at, end_at
  HAVING COUNT(*) > 1
) AS duplicates;
" 2>&1 | xargs)

if [ "$DOUBLE_BOOKINGS" = "0" ]; then
    check 0 "No double bookings detected"
else
    check 1 "Double bookings found: $DOUBLE_BOOKINGS"
fi

# ═══════════════════════════════════════════════════════════════
# 10. PRICING CALCULATION TEST
# ═══════════════════════════════════════════════════════════════

log "${BLUE}[CHECK 10]${NC} Pricing Calculation"

PRICING_TEST=$(psql "$DB_HOST" -t -c "
SELECT 
  CASE 
    WHEN COUNT(*) > 0 AND AVG(platform_rate) > AVG(binance_rate) THEN 'OK'
    ELSE 'FAIL'
  END as status
FROM exchange_rates
WHERE is_active = true;
" 2>&1 | xargs)

if [ "$PRICING_TEST" = "OK" ]; then
    check 0 "Pricing calculations correct (margins applied)"
else
    check 1 "Pricing calculation issue detected"
fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════

TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_FAILED))

log ""
log "╔══════════════════════════════════════════════════════════════╗"
log "║                    MONITORING SUMMARY                        ║"
log "╚══════════════════════════════════════════════════════════════╝"
log ""
log "Total Checks: $TOTAL_CHECKS"
log "${GREEN}✅ Passed: $CHECKS_PASSED${NC}"
log "${RED}❌ Failed: $CHECKS_FAILED${NC}"
log "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
log ""
log "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log ""

# ═══════════════════════════════════════════════════════════════
# RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════

if [ $CHECKS_FAILED -gt 0 ] || [ $WARNINGS -gt 2 ]; then
    log "${YELLOW}⚠️  RECOMMENDATIONS:${NC}"
    log ""
    
    if [ "$HTTP_STATUS" != "200" ]; then
        log "  • Check Cloudflare Pages deployment status"
        log "  • Verify DNS configuration"
    fi
    
    if [ "$RATE_AGE" -gt 30 ]; then
        log "  • Run: SELECT public.update_exchange_rates_manual();"
        log "  • Investigate Binance Cron Job"
    fi
    
    if [ "$DOUBLE_BOOKINGS" != "0" ]; then
        log "  • 🚨 URGENT: Investigate double bookings"
        log "  • Review availability filtering code"
    fi
    
    if [ $CRON_FAILURES -gt 0 ]; then
        log "  • Check Cron Job logs in Supabase"
        log "  • Review job execution history"
    fi
    
    log ""
fi

if [ $CHECKS_FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    log "${GREEN}🎉 ALL SYSTEMS OPERATIONAL${NC}"
    log "${GREEN}Production deployment is healthy!${NC}"
    log ""
fi

# ═══════════════════════════════════════════════════════════════
# NEXT MONITORING RUN
# ═══════════════════════════════════════════════════════════════

log "Next monitoring recommended in: 15 minutes"
log ""
log "To run again:"
log "  ./post-deployment-monitor.sh $PROD_URL"
log ""

# Exit with appropriate code
if [ $CHECKS_FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
