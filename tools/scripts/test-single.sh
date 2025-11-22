#!/bin/bash
#
# Test simple para verificar configuración E2E
# Ejecuta solo el test de booking history (el más simple)
#

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AutoRenta - Test de Verificación E2E"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check dev server
echo "[1/3] Verificando servidor de desarrollo..."
if curl -s http://localhost:4200 > /dev/null 2>&1; then
    echo "✓ Servidor corriendo en http://localhost:4200"
else
    echo "✗ ERROR: Servidor NO está corriendo"
    echo "  Ejecuta 'pnpm run dev' primero"
    exit 1
fi

# Check .env.test
echo "[2/3] Verificando .env.test..."
if [ -f ".env.test" ]; then
    echo "✓ Archivo .env.test encontrado"
else
    echo "✗ ERROR: .env.test no encontrado"
    exit 1
fi

# Check test file
echo "[3/3] Verificando archivos de test..."
if [ -f "tests/e2e/renter/booking-history.spec.ts" ]; then
    echo "✓ Test file encontrado"
else
    echo "✗ ERROR: Test file no encontrado"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Ejecutando Test: Booking History"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run test with verbose output
npx playwright test tests/e2e/renter/booking-history.spec.ts \
    --project=chromium:e2e \
    --reporter=list

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $EXIT_CODE -eq 0 ]; then
    echo "  ✓ TEST PASSED"
else
    echo "  ✗ TEST FAILED (Exit code: $EXIT_CODE)"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $EXIT_CODE
