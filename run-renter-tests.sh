#!/bin/bash
#
# AutoRenta E2E Test Runner - Renter Tests
# Ejecuta tests de locatarios con logs detallados
#
# Usage: ./run-renter-tests.sh [--headed] [--debug]
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Log functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_test() {
    echo -e "${MAGENTA}🧪${NC} $1"
}

log_section() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Parse arguments
HEADED=""
DEBUG=""
for arg in "$@"; do
    case $arg in
        --headed)
            HEADED="--headed"
            ;;
        --debug)
            DEBUG="--debug"
            ;;
    esac
done

# Start
log_section "AUTORENTA E2E TESTS - RENTER FLOWS"
log_info "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
log_info "Usuario: $(whoami)"
echo ""

# Check if dev server is running
log_info "Verificando servidor de desarrollo..."
if curl -s http://localhost:4200 > /dev/null 2>&1; then
    log_success "Servidor Angular corriendo en http://localhost:4200"
else
    log_error "Servidor Angular NO está corriendo"
    log_warning "Ejecuta 'pnpm run dev' en otra terminal primero"
    exit 1
fi

# Check Supabase connection
log_info "Verificando conexión a Supabase..."
if [ -f ".env.test" ]; then
    log_success "Archivo .env.test encontrado"
else
    log_error "Archivo .env.test NO encontrado"
    log_warning "Crea .env.test con tus credenciales de Supabase"
    exit 1
fi

# Create test results directory
mkdir -p test-results/renter-tests
log_success "Directorio de resultados creado: test-results/renter-tests"

echo ""
log_section "EJECUTANDO TESTS P0 (CRITICAL)"

# Test 1: Check-in Flow
log_test "TEST 1/7: Check-in Flow"
log_info "Archivo: tests/e2e/renter/check-in-flow.spec.ts"
log_info "Duración estimada: 45-60 segundos"
echo ""

npx playwright test tests/e2e/renter/check-in-flow.spec.ts \
    --project=chromium:e2e \
    --reporter=list \
    $HEADED $DEBUG \
    2>&1 | tee test-results/renter-tests/check-in-flow.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_success "✅ Check-in Flow: PASSED"
else
    log_error "❌ Check-in Flow: FAILED"
fi

echo ""
echo ""

# Test 2: Check-out Flow
log_test "TEST 2/7: Check-out Flow"
log_info "Archivo: tests/e2e/renter/check-out-flow.spec.ts"
log_info "Duración estimada: 60-75 segundos"
echo ""

npx playwright test tests/e2e/renter/check-out-flow.spec.ts \
    --project=chromium:e2e \
    --reporter=list \
    $HEADED $DEBUG \
    2>&1 | tee test-results/renter-tests/check-out-flow.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_success "✅ Check-out Flow: PASSED"
else
    log_error "❌ Check-out Flow: FAILED"
fi

echo ""
echo ""

# Test 3: Active Booking View
log_test "TEST 3/7: Active Booking View"
log_info "Archivo: tests/e2e/renter/active-booking-view.spec.ts"
log_info "Duración estimada: 30-45 segundos"
echo ""

npx playwright test tests/e2e/renter/active-booking-view.spec.ts \
    --project=chromium:e2e \
    --reporter=list \
    $HEADED $DEBUG \
    2>&1 | tee test-results/renter-tests/active-booking-view.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_success "✅ Active Booking View: PASSED"
else
    log_error "❌ Active Booking View: FAILED"
fi

echo ""
echo ""

# Test 4: Payment Split Verification
log_test "TEST 4/7: Payment Split Verification"
log_info "Archivo: tests/e2e/renter/payment-split-verification.spec.ts"
log_info "Duración estimada: 45-60 segundos"
echo ""

npx playwright test tests/e2e/renter/payment-split-verification.spec.ts \
    --project=chromium:e2e \
    --reporter=list \
    $HEADED $DEBUG \
    2>&1 | tee test-results/renter-tests/payment-split-verification.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_success "✅ Payment Split Verification: PASSED"
else
    log_error "❌ Payment Split Verification: FAILED"
fi

echo ""
log_section "EJECUTANDO TESTS P1 (IMPORTANT)"

# Test 5: Report Incident
log_test "TEST 5/7: Report Incident"
log_info "Archivo: tests/e2e/renter/report-incident.spec.ts"
log_info "Duración estimada: 30-45 segundos"
echo ""

npx playwright test tests/e2e/renter/report-incident.spec.ts \
    --project=chromium:e2e \
    --reporter=list \
    $HEADED $DEBUG \
    2>&1 | tee test-results/renter-tests/report-incident.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_success "✅ Report Incident: PASSED"
else
    log_error "❌ Report Incident: FAILED"
fi

echo ""
echo ""

# Test 6: Leave Review
log_test "TEST 6/7: Leave Review"
log_info "Archivo: tests/e2e/renter/leave-review.spec.ts"
log_info "Duración estimada: 30-45 segundos"
echo ""

npx playwright test tests/e2e/renter/leave-review.spec.ts \
    --project=chromium:e2e \
    --reporter=list \
    $HEADED $DEBUG \
    2>&1 | tee test-results/renter-tests/leave-review.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_success "✅ Leave Review: PASSED"
else
    log_error "❌ Leave Review: FAILED"
fi

echo ""
echo ""

# Test 7: Booking History
log_test "TEST 7/7: Booking History"
log_info "Archivo: tests/e2e/renter/booking-history.spec.ts"
log_info "Duración estimada: 30-45 segundos"
echo ""

npx playwright test tests/e2e/renter/booking-history.spec.ts \
    --project=chromium:e2e \
    --reporter=list \
    $HEADED $DEBUG \
    2>&1 | tee test-results/renter-tests/booking-history.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_success "✅ Booking History: PASSED"
else
    log_error "❌ Booking History: FAILED"
fi

echo ""
log_section "RESUMEN DE RESULTADOS"

# Count results
PASSED=$(grep -r "PASSED" test-results/renter-tests/*.log 2>/dev/null | wc -l || echo "0")
FAILED=$(grep -r "FAILED" test-results/renter-tests/*.log 2>/dev/null | wc -l || echo "0")
TOTAL=$((PASSED + FAILED))

echo ""
log_info "Tests ejecutados: $TOTAL"
log_success "Tests pasados: $PASSED"
if [ "$FAILED" -gt 0 ]; then
    log_error "Tests fallidos: $FAILED"
else
    log_success "Tests fallidos: 0"
fi

echo ""
log_info "Logs guardados en: test-results/renter-tests/"
log_info "Reporte HTML: pnpm run test:e2e:report"

if [ "$FAILED" -eq 0 ] && [ "$TOTAL" -gt 0 ]; then
    echo ""
    log_section "🎉 TODOS LOS TESTS PASARON 🎉"
    exit 0
else
    echo ""
    log_section "⚠️ ALGUNOS TESTS FALLARON"
    log_warning "Revisa los logs en test-results/renter-tests/"
    exit 1
fi
