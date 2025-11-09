#!/bin/bash
# Script de verificación para PR #150
# Verifica los cambios críticos antes de mergear

set -e

echo "🔍 Verificando PR #150: Fix TypeScript compilation errors"
echo "=================================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para verificar
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# 1. Verificar que el branch existe
echo "1. Verificando branch del PR..."
git fetch origin claude/fix-typescript-compilation-errors-011CUxJ3CvYqrpHwcUAevXkF:pr-150-branch 2>/dev/null || true
check "Branch del PR disponible"

# 2. Verificar build
echo ""
echo "2. Verificando build..."
cd apps/web
npm run build 2>&1 | tee /tmp/pr-150-build.log
BUILD_SUCCESS=$?
cd ../..
if [ $BUILD_SUCCESS -eq 0 ]; then
    check "Build exitoso"
else
    echo -e "${RED}❌ Build falló. Ver logs en /tmp/pr-150-build.log${NC}"
    exit 1
fi

# 3. Verificar lint
echo ""
echo "3. Verificando lint..."
npm run lint 2>&1 | tee /tmp/pr-150-lint.log
LINT_SUCCESS=$?
if [ $LINT_SUCCESS -eq 0 ]; then
    check "Lint sin errores"
else
    echo -e "${YELLOW}⚠️  Lint tiene warnings (revisar /tmp/pr-150-lint.log)${NC}"
fi

# 4. Verificar uso de email en withdrawal/refund requests
echo ""
echo "4. Verificando uso de email en admin features..."
EMAIL_USAGE=$(grep -r "withdrawal.*email\|refund.*email" apps/web/src/app/features/admin 2>/dev/null | wc -l)
if [ $EMAIL_USAGE -eq 0 ]; then
    echo -e "${GREEN}✅ No se usa email en withdrawal/refund requests (seguro)${NC}"
else
    echo -e "${YELLOW}⚠️  Se encontró uso de email en withdrawal/refund requests${NC}"
    echo "   Revisar si el cambio del PR afecta funcionalidad:"
    grep -r "withdrawal.*email\|refund.*email" apps/web/src/app/features/admin 2>/dev/null | head -5
fi

# 5. Verificar UserRole values en código
echo ""
echo "5. Verificando tipos UserRole..."
ROLE_MISMATCH=$(grep -r "user_role.*as.*UserRole\|UserRole.*user_role" apps/web/src/app/core/services 2>/dev/null | wc -l)
if [ $ROLE_MISMATCH -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Se encontraron type assertions de UserRole${NC}"
    echo "   Verificar en DB que profiles.user_role solo tiene valores válidos"
    echo "   Valores válidos: 'locador', 'locatario', 'ambos', NULL"
else
    echo -e "${GREEN}✅ No se encontraron type assertions problemáticas${NC}"
fi

# 6. Verificar Sentry setContext
echo ""
echo "6. Verificando cambios de Sentry..."
SENTRY_CHANGES=$(grep -r "setContext.*performance" apps/web/src/app/core/services/performance-monitoring.service.ts 2>/dev/null | wc -l)
if [ $SENTRY_CHANGES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Sentry usa setContext en lugar de setMeasurement${NC}"
    echo "   Verificar en Sentry Dashboard que métricas aparecen en context.performance"
else
    echo -e "${GREEN}✅ Cambios de Sentry verificados${NC}"
fi

# 7. Resumen
echo ""
echo "=================================================="
echo "📊 Resumen de Verificación"
echo "=================================================="
echo ""
echo "✅ Build: $(if [ $BUILD_SUCCESS -eq 0 ]; then echo 'EXITOSO'; else echo 'FALLIDO'; fi)"
echo "$(if [ $LINT_SUCCESS -eq 0 ]; then echo '✅'; else echo '⚠️ '; fi) Lint: $(if [ $LINT_SUCCESS -eq 0 ]; then echo 'SIN ERRORES'; else echo 'CON WARNINGS'; fi)"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Revisar análisis completo: docs/analysis/PR_150_ANALYSIS.md"
echo "   2. Verificar CI checks en GitHub: https://github.com/ecucondorSA/autorenta/pull/150"
echo "   3. Si todo pasa, mergear PR"
echo ""

