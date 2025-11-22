#!/bin/bash
#
# AutoRenta E2E Test Runner - Simple Renter Tests
# Ejecuta tests de locatarios uno por uno con logs detallados
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  AUTORENTA E2E TESTS - LOCATARIOS (RENTERS)${NC}"
echo -e "${CYAN}  Fecha: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check dev server
echo -e "${BLUE}[1/2]${NC} Verificando servidor de desarrollo..."
if curl -s http://localhost:4200 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Servidor Angular corriendo en http://localhost:4200"
else
    echo -e "${RED}✗${NC} ERROR: Servidor Angular NO está corriendo"
    echo -e "${YELLOW}⚠${NC} Ejecuta 'pnpm run dev' en otra terminal primero"
    exit 1
fi

# Check .env.test
echo -e "${BLUE}[2/2]${NC} Verificando configuración de tests..."
if [ -f ".env.test" ]; then
    echo -e "${GREEN}✓${NC} Archivo .env.test encontrado"
else
    echo -e "${RED}✗${NC} ERROR: Archivo .env.test NO encontrado"
    exit 1
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  TESTS P0 - CRITICAL (4 tests)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create results directory
mkdir -p test-results/renter-tests-$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="test-results/renter-tests-$(date +%Y%m%d-%H%M%S)"

# Run tests
TESTS=(
    "check-in-flow:P0:Check-in Flow (Geolocation + Fotos + Firma)"
    "check-out-flow:P0:Check-out Flow (Inspección final + Fondos)"
    "active-booking-view:P0:Active Booking View (Ver booking activo)"
    "payment-split-verification:P0:Payment Split (85/15 verification)"
    "report-incident:P1:Report Incident (Reportar problema)"
    "leave-review:P1:Leave Review (Dejar reseña)"
    "booking-history:P1:Booking History (Historial de reservas)"
)

PASSED=0
FAILED=0
SKIPPED=0

for test_info in "${TESTS[@]}"; do
    IFS=':' read -r test_name priority description <<< "$test_info"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}TEST: ${description}${NC}"
    echo -e "${BLUE}Prioridad: ${priority}${NC}"
    echo -e "${BLUE}Archivo: tests/e2e/renter/${test_name}.spec.ts${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Run test
    if npx playwright test "tests/e2e/renter/${test_name}.spec.ts" \
        --project=chromium:e2e \
        --reporter=list \
        2>&1 | tee "${RESULTS_DIR}/${test_name}.log"; then
        
        echo ""
        echo -e "${GREEN}✓ PASSED${NC} - ${description}"
        PASSED=$((PASSED + 1))
    else
        EXIT_CODE=${PIPESTATUS[0]}
        echo ""
        if [ $EXIT_CODE -eq 2 ]; then
            echo -e "${YELLOW}⊘ SKIPPED${NC} - ${description} (Feature no implementada)"
            SKIPPED=$((SKIPPED + 1))
        else
            echo -e "${RED}✗ FAILED${NC} - ${description}"
            FAILED=$((FAILED + 1))
        fi
    fi
    
    echo ""
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  RESUMEN FINAL${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
TOTAL=$((PASSED + FAILED + SKIPPED))
echo -e "Total tests ejecutados: ${BLUE}${TOTAL}${NC}"
echo -e "Tests pasados:          ${GREEN}${PASSED}${NC}"
echo -e "Tests fallidos:         ${RED}${FAILED}${NC}"
echo -e "Tests saltados:         ${YELLOW}${SKIPPED}${NC}"
echo ""
echo -e "Logs guardados en: ${BLUE}${RESULTS_DIR}/${NC}"
echo -e "Ver reporte HTML: ${BLUE}pnpm run test:e2e:report${NC}"
echo ""

if [ "$FAILED" -eq 0 ] && [ "$TOTAL" -gt 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  🎉 TODOS LOS TESTS PASARON 🎉${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ⚠️ ALGUNOS TESTS FALLARON O FUERON SALTADOS${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
