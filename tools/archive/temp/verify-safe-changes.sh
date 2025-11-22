#!/bin/bash
# verify-safe-changes.sh
# Script para verificar que los cambios son seguros antes de commit

set -e  # Exit on error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verificando seguridad de cambios..."
echo ""

# 1. Verificar que hay un build baseline
echo "📦 1. Verificando build actual..."
if npm run build:web > /tmp/build-current.log 2>&1; then
    echo -e "${GREEN}✅ Build actual funciona${NC}"
else
    echo -e "${RED}❌ Build actual falla - revisar antes de hacer cambios${NC}"
    cat /tmp/build-current.log | tail -20
    exit 1
fi

# 2. Guardar estado de linting actual
echo ""
echo "🔎 2. Guardando estado de linting..."
npm run lint > /tmp/lint-before.log 2>&1 || true
LINT_ERRORS_BEFORE=$(grep -c "error" /tmp/lint-before.log || echo "0")
LINT_WARNINGS_BEFORE=$(grep -c "warning" /tmp/lint-before.log || echo "0")
echo -e "${YELLOW}Estado actual: $LINT_ERRORS_BEFORE errores, $LINT_WARNINGS_BEFORE warnings${NC}"

# 3. Verificar git status
echo ""
echo "📝 3. Verificando estado de git..."
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✅ Git working directory limpio${NC}"
else
    echo -e "${YELLOW}⚠️  Hay cambios sin commit:${NC}"
    git status --short | head -10
    echo ""
    read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 4. Crear backup branch
echo ""
echo "💾 4. Creando branch de backup..."
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
git branch $BACKUP_BRANCH
echo -e "${GREEN}✅ Branch creada: $BACKUP_BRANCH${NC}"

# 5. Verificar archivos críticos
echo ""
echo "🎯 5. Identificando archivos críticos..."
CRITICAL_FILES=(
    "apps/web/src/app/core/services/bookings.service.ts"
    "apps/web/src/app/core/services/auth.service.ts"
    "apps/web/src/app/core/services/checkout-payment.service.ts"
    "apps/web/src/app/core/services/wallet.service.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  📄 $file - OK"
    else
        echo -e "${RED}  ❌ $file - NO ENCONTRADO${NC}"
    fi
done

# 6. Contar console.log actual
echo ""
echo "📊 6. Analizando código actual..."
CONSOLE_LOGS=$(grep -r "console.log" apps/web/src --include="*.ts" | wc -l)
EMPTY_CATCHES=$(grep -r "} catch.*{}" apps/web/src --include="*.ts" | wc -l)
ANY_TYPES=$(grep -r ": any" apps/web/src/app/core/services --include="*.ts" | wc -l)

echo "  console.log: $CONSOLE_LOGS"
echo "  empty catches: $EMPTY_CATCHES (aproximado)"
echo "  'any' types: $ANY_TYPES"

# 7. Verificar tests
echo ""
echo "🧪 7. Estado de tests..."
if npm run test:quick > /tmp/test-results.log 2>&1; then
    echo -e "${GREEN}✅ Tests pasan${NC}"
else
    FAILED_TESTS=$(grep -c "FAILED" /tmp/test-results.log || echo "0")
    echo -e "${YELLOW}⚠️  $FAILED_TESTS tests fallan (baseline)${NC}"
fi

# 8. Resumen
echo ""
echo "═══════════════════════════════════════════════════════"
echo "📋 RESUMEN - Estado del código ANTES de cambios"
echo "═══════════════════════════════════════════════════════"
echo "Build:          ✅ FUNCIONAL"
echo "Linting:        $LINT_ERRORS_BEFORE errores, $LINT_WARNINGS_BEFORE warnings"
echo "console.log:    $CONSOLE_LOGS ocurrencias"
echo "empty catches:  ~$EMPTY_CATCHES ocurrencias"
echo "Backup branch:  $BACKUP_BRANCH"
echo ""
echo -e "${GREEN}✅ Sistema listo para aplicar cambios${NC}"
echo ""
echo "Próximos pasos:"
echo "  1. Aplicar cambios según plan"
echo "  2. Ejecutar: ./verify-after-changes.sh"
echo "  3. Si todo OK: git commit"
echo "  4. Si falla: git reset --hard $BACKUP_BRANCH"
echo ""
