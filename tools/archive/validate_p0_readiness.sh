#!/bin/bash
# ===========================================================================
# AutoRenta - Validación Rápida de P0 Readiness para Stage
# ===========================================================================
# Ejecutar: ./scripts/validate_p0_readiness.sh
# ===========================================================================

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASS=0
FAIL=0
WARN=0

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  AutoRenta - Validación P0 Readiness para Stage               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Función de check
check() {
  local name=$1
  local command=$2
  local expected=$3

  echo -n "Checking $name... "

  if eval "$command" &>/dev/null; then
    if [ -n "$expected" ]; then
      result=$(eval "$command" 2>&1)
      if echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
      else
        echo -e "${YELLOW}⚠ WARN${NC} (unexpected result)"
        ((WARN++))
      fi
    else
      echo -e "${GREEN}✓ PASS${NC}"
      ((PASS++))
    fi
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
  fi
}

# Función de check opcional (warning si falla)
check_warn() {
  local name=$1
  local command=$2

  echo -n "Checking $name... "

  if eval "$command" &>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠ WARN${NC} (recomendado pero no bloqueante)"
    ((WARN++))
  fi
}

echo "=== 1. DEPENDENCIES ==="
check "Node.js installed" "command -v node" ""
check "npm installed" "command -v npm" ""
check "Playwright installed" "command -v npx && npx playwright --version" ""

echo ""
echo "=== 2. PROJECT STRUCTURE ==="
check "Angular app exists" "test -f apps/web/angular.json" ""
check "Playwright config exists" "test -f playwright.config.ts" ""
check "Webhook worker exists" "test -f functions/workers/payments_webhook/src/index.ts" ""
check "Auth guard exists" "test -f apps/web/src/app/core/guards/auth.guard.ts" ""
check "Checkout payment service exists" "test -f apps/web/src/app/core/services/checkout-payment.service.ts" ""

echo ""
echo "=== 3. ENVIRONMENT CONFIGURATION ==="
check "Dev environment file exists" "test -f apps/web/.env.development.local" ""
check_warn "Supabase URL configured" "grep -q 'NG_APP_SUPABASE_URL' apps/web/.env.development.local" ""
check_warn "Supabase Anon Key configured" "grep -q 'NG_APP_SUPABASE_ANON_KEY' apps/web/.env.development.local" ""

echo ""
echo "=== 4. TYPES ==="
check "Database types exist" "test -f apps/web/src/app/core/types/database.types.ts" ""

# Check if types are recent (less than 7 days old)
if [ -f apps/web/src/app/core/types/database.types.ts ]; then
  DAYS_OLD=$(( ($(date +%s) - $(stat -c %Y apps/web/src/app/core/types/database.types.ts)) / 86400 ))
  if [ "$DAYS_OLD" -lt 7 ]; then
    echo -e "Database types age: ${GREEN}$DAYS_OLD days${NC} (fresh)"
    ((PASS++))
  else
    echo -e "Database types age: ${YELLOW}$DAYS_OLD days${NC} (considerar regenerar)"
    ((WARN++))
  fi
fi

echo ""
echo "=== 5. CRITICAL E2E TESTS ==="
check "Auth tests exist" "test -f tests/auth/02-login.spec.ts" ""
check "Booking flow test exists" "test -f tests/renter/booking/complete-booking-flow.spec.ts" ""
check "Payment wallet test exists" "test -f tests/renter/booking/payment-wallet.spec.ts" ""
check "Payment card test exists" "test -f tests/renter/booking/payment-card.spec.ts" ""
check "Webhook test exists" "test -f tests/critical/03-webhook-payments.spec.ts" ""

# Nuevos tests creados
check "Cancel/refund test exists" "test -f tests/renter/booking/06-cancel-and-refund.spec.ts" ""
check "Ledger consistency test exists" "test -f tests/critical/04-ledger-consistency.spec.ts" ""
check "Payout flow test exists" "test -f tests/owner/02-payout-flow.spec.ts" ""

echo ""
echo "=== 6. WEBHOOK CONFIGURATION ==="
check "Webhook wrangler.toml exists" "test -f functions/workers/payments_webhook/wrangler.toml" ""

if [ -f functions/workers/payments_webhook/wrangler.toml ]; then
  check "KV namespace configured" "grep -q 'AUTORENT_WEBHOOK_KV' functions/workers/payments_webhook/wrangler.toml" ""
  check "Account ID configured" "grep -q 'account_id' functions/workers/payments_webhook/wrangler.toml" ""
fi

echo ""
echo "=== 7. ROUTES PROTECTION ==="
# Check que rutas críticas tienen AuthGuard
check "Bookings routes protected" "grep -q 'AuthGuard' apps/web/src/app/features/bookings/bookings.routes.ts" ""
check "Wallet routes protected" "grep -q 'canMatch.*AuthGuard' apps/web/src/app/app.routes.ts | grep wallet" ""
check "Admin routes protected" "grep -q 'canMatch.*AuthGuard' apps/web/src/app/app.routes.ts | grep admin" ""

echo ""
echo "=== 8. BUILD VALIDATION ==="
echo "Attempting production build (this may take a moment)..."

if npm run build --prefix apps/web &>/dev/null; then
  echo -e "${GREEN}✓ Production build successful${NC}"
  ((PASS++))
else
  echo -e "${RED}✗ Production build failed${NC}"
  echo "Run 'npm run build' in apps/web/ to see errors"
  ((FAIL++))
fi

echo ""
echo "=== 9. PLAYWRIGHT SETUP ==="
if npx playwright test --list &>/dev/null; then
  SPEC_COUNT=$(npx playwright test --list 2>/dev/null | grep -c "\.spec\.ts" || echo "0")
  echo -e "${GREEN}✓ Playwright can list tests${NC} ($SPEC_COUNT specs found)"
  ((PASS++))
else
  echo -e "${YELLOW}⚠ Playwright needs setup${NC}"
  echo "Run: npx playwright install --with-deps"
  ((WARN++))
fi

echo ""
echo "=== 10. DOCUMENTATION ==="
check "Stage readiness report exists" "test -f STAGE_P0_READINESS_REPORT.md" ""
check "RLS audit script exists" "test -f scripts/audit_rls_policies.sql" ""
check "CLAUDE.md exists" "test -f CLAUDE.md" ""

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  SUMMARY                                                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "Passed:   ${GREEN}$PASS${NC}"
echo -e "Failed:   ${RED}$FAIL${NC}"
echo -e "Warnings: ${YELLOW}$WARN${NC}"
echo ""

# Calcular porcentaje
TOTAL=$((PASS + FAIL + WARN))
if [ "$TOTAL" -gt 0 ]; then
  PERCENTAGE=$(( (PASS * 100) / TOTAL ))
  echo "Readiness: $PERCENTAGE%"
else
  PERCENTAGE=0
fi

echo ""
echo "=== NEXT STEPS ==="

if [ "$FAIL" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  echo -e "${GREEN}🎉 All checks passed! Ready for Stage deployment.${NC}"
  echo ""
  echo "Recommended actions:"
  echo "1. Run E2E tests: npm run e2e:headless"
  echo "2. Audit RLS policies: psql \$DATABASE_URL -f scripts/audit_rls_policies.sql"
  echo "3. Deploy webhook: cd functions/workers/payments_webhook && wrangler deploy"
  echo "4. Test webhook: curl https://YOUR-WORKER.workers.dev/webhooks/payments"
  exit 0
elif [ "$FAIL" -eq 0 ]; then
  echo -e "${YELLOW}⚠ Some warnings found, but no blockers.${NC}"
  echo ""
  echo "Review warnings above and fix if possible."
  echo "You can proceed to Stage with caution."
  exit 0
else
  echo -e "${RED}✗ $FAIL critical checks failed.${NC}"
  echo ""
  echo "Fix the failed checks before deploying to Stage."
  echo "See STAGE_P0_READINESS_REPORT.md for detailed action plan."
  exit 1
fi
