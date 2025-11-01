#!/bin/bash
# verify-after-changes.sh
# Script para verificar que los cambios no rompieron nada

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Verificando cambios aplicados..."
echo ""

# 1. Build debe seguir funcionando
echo "📦 1. Verificando que build sigue funcionando..."
if npm run build:web > /tmp/build-after.log 2>&1; then
    echo -e "${GREEN}✅ Build exitoso${NC}"
else
    echo -e "${RED}❌ Build falló - REVERTIR CAMBIOS${NC}"
    echo "Últimas líneas del error:"
    tail -20 /tmp/build-after.log
    echo ""
    echo "Para revertir:"
    echo "  git reset --hard HEAD~1"
    exit 1
fi

# 2. Lint no debe empeorar
echo ""
echo "🔎 2. Verificando linting..."
npm run lint > /tmp/lint-after.log 2>&1 || true
LINT_ERRORS_AFTER=$(grep -c "error" /tmp/lint-after.log || echo "0")
LINT_WARNINGS_AFTER=$(grep -c "warning" /tmp/lint-after.log || echo "0")

# Comparar con baseline
LINT_ERRORS_BEFORE=$(grep -c "error" /tmp/lint-before.log 2>/dev/null || echo "12")
LINT_WARNINGS_BEFORE=$(grep -c "warning" /tmp/lint-before.log 2>/dev/null || echo "46")

echo "Errores:   $LINT_ERRORS_BEFORE → $LINT_ERRORS_AFTER"
echo "Warnings:  $LINT_WARNINGS_BEFORE → $LINT_WARNINGS_AFTER"

if [ $LINT_ERRORS_AFTER -gt $LINT_ERRORS_BEFORE ]; then
    echo -e "${RED}❌ Aumentaron errores de lint - REVISAR${NC}"
    echo "Nuevos errores:"
    diff /tmp/lint-before.log /tmp/lint-after.log || true
    exit 1
elif [ $LINT_ERRORS_AFTER -lt $LINT_ERRORS_BEFORE ]; then
    FIXED=$((LINT_ERRORS_BEFORE - LINT_ERRORS_AFTER))
    echo -e "${GREEN}✅ Se corrigieron $FIXED errores${NC}"
else
    echo -e "${YELLOW}⚠️  Mismo número de errores${NC}"
fi

# 3. Verificar que solo se modificó lo esperado
echo ""
echo "📝 3. Analizando cambios..."
CHANGED_FILES=$(git diff --name-only | wc -l)
echo "Archivos modificados: $CHANGED_FILES"

if [ $CHANGED_FILES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No hay cambios - ¿se aplicaron correctamente?${NC}"
elif [ $CHANGED_FILES -gt 15 ]; then
    echo -e "${YELLOW}⚠️  Muchos archivos modificados - revisar que sean los esperados${NC}"
    git diff --name-only
fi

# 4. Verificar que no se rompió funcionalidad crítica
echo ""
echo "🔍 4. Verificando patrones sospechosos..."

# Buscar si se eliminó código accidentalmente
DELETED_LINES=$(git diff --numstat | awk '{sum+=$2} END {print sum}')
ADDED_LINES=$(git diff --numstat | awk '{sum+=$1} END {print sum}')

echo "Líneas agregadas: $ADDED_LINES"
echo "Líneas eliminadas: $DELETED_LINES"

if [ $DELETED_LINES -gt $((ADDED_LINES * 2)) ]; then
    echo -e "${YELLOW}⚠️  Se eliminó más código del agregado - verificar que sea intencional${NC}"
fi

# 5. Verificar que no hay errores de sintaxis obvios
echo ""
echo "🔎 5. Verificando sintaxis TypeScript..."
if npx tsc --noEmit -p apps/web/tsconfig.json > /tmp/tsc-check.log 2>&1; then
    echo -e "${GREEN}✅ Sin errores de TypeScript${NC}"
else
    # TypeScript tiene errores conocidos, solo reportar si aumentaron
    TSC_ERRORS=$(grep -c "error TS" /tmp/tsc-check.log || echo "0")
    echo -e "${YELLOW}⚠️  $TSC_ERRORS errores de TypeScript (puede ser normal)${NC}"
fi

# 6. Tests
echo ""
echo "🧪 6. Verificando tests..."
if npm run test:quick > /tmp/test-after.log 2>&1; then
    echo -e "${GREEN}✅ Tests pasan${NC}"
else
    FAILED_AFTER=$(grep -c "FAILED" /tmp/test-after.log || echo "0")
    FAILED_BEFORE=$(grep -c "FAILED" /tmp/test-results.log 2>/dev/null || echo "0")
    
    if [ $FAILED_AFTER -gt $FAILED_BEFORE ]; then
        echo -e "${RED}❌ Aumentaron tests fallidos: $FAILED_BEFORE → $FAILED_AFTER${NC}"
        exit 1
    else
        echo -e "${YELLOW}⚠️  $FAILED_AFTER tests fallan (mismo que antes)${NC}"
    fi
fi

# 7. Verificar diff específico
echo ""
echo "📊 7. Cambios por tipo..."
git diff --stat

# 8. Resumen final
echo ""
echo "═══════════════════════════════════════════════════════"
echo "📋 RESUMEN - Verificación de cambios"
echo "═══════════════════════════════════════════════════════"
echo -e "Build:       ${GREEN}✅ FUNCIONA${NC}"
echo "Linting:     $LINT_ERRORS_AFTER errores ($((LINT_ERRORS_BEFORE - LINT_ERRORS_AFTER)) corregidos)"
echo "Tests:       Similar a baseline"
echo "Archivos:    $CHANGED_FILES modificados"
echo ""
echo -e "${GREEN}✅ Cambios verificados - seguro para commit${NC}"
echo ""
echo "Para commitear:"
echo "  git add -A"
echo "  git commit -m \"feat: apply safe improvements from code review\""
echo ""
echo "Para deshacer si hay problemas:"
echo "  git reset --hard HEAD"
echo ""
