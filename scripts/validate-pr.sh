#!/bin/bash

# Script de validación de PR antes de merge
# Uso: ./scripts/validate-pr.sh [branch-name]

set -e

BRANCH="${1:-$(git branch --show-current)}"
BASE_BRANCH="${2:-main}"

echo "🔍 Validando PR: $BRANCH → $BASE_BRANCH"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir errores
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para imprimir éxito
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para imprimir advertencias
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Contador de errores
ERRORS=0
WARNINGS=0

# 1. Verificar que estamos en un branch
if [ "$BRANCH" == "$BASE_BRANCH" ]; then
    error "No puedes validar desde $BASE_BRANCH. Crea un branch primero."
    exit 1
fi

success "Branch: $BRANCH"

# 2. Verificar que el branch está actualizado
echo ""
echo "📥 Verificando que branch está actualizado..."
git fetch origin $BASE_BRANCH
if ! git merge-base --is-ancestor origin/$BASE_BRANCH $BRANCH 2>/dev/null; then
    warning "Branch no está basado en $BASE_BRANCH más reciente"
    WARNINGS=$((WARNINGS + 1))
fi

# 3. Verificar tamaño del PR
echo ""
echo "📊 Analizando tamaño del PR..."
FILES_CHANGED=$(git diff --name-only origin/$BASE_BRANCH...$BRANCH | wc -l)
LINES_ADDED=$(git diff --stat origin/$BASE_BRANCH...$BRANCH | tail -1 | awk '{print $4}')
LINES_DELETED=$(git diff --stat origin/$BASE_BRANCH...$BRANCH | tail -1 | awk '{print $6}')

echo "  Archivos modificados: $FILES_CHANGED"
echo "  Líneas agregadas: $LINES_ADDED"
echo "  Líneas eliminadas: $LINES_DELETED"

if [ "$FILES_CHANGED" -gt 50 ]; then
    error "PR muy grande ($FILES_CHANGED archivos). Considera dividirlo."
    ERRORS=$((ERRORS + 1))
elif [ "$FILES_CHANGED" -gt 30 ]; then
    warning "PR grande ($FILES_CHANGED archivos). Asegúrate de que sea necesario."
    WARNINGS=$((WARNINGS + 1))
else
    success "Tamaño de PR aceptable"
fi

# 4. Verificar secrets
echo ""
echo "🔒 Verificando secrets hardcoded..."
if git diff origin/$BASE_BRANCH...$BRANCH -- '*.ts' '*.js' '*.tsx' '*.jsx' | grep -E "(APP_USR-|sk_live|pk_live|DATABASE_URL|SUPABASE.*KEY)" > /dev/null; then
    error "Posibles secrets encontrados en el código!"
    ERRORS=$((ERRORS + 1))
else
    success "No se encontraron secrets"
fi

# 5. Verificar console.log
echo ""
echo "🔍 Verificando console.log..."
CONSOLE_LOGS=$(git diff origin/$BASE_BRANCH...$BRANCH -- '*.ts' '*.js' '*.tsx' '*.jsx' | grep -c "console.log" || echo "0")
if [ "$CONSOLE_LOGS" -gt 0 ]; then
    warning "Encontrados $CONSOLE_LOGS console.log. Considera eliminarlos o usar logging apropiado."
    WARNINGS=$((WARNINGS + 1))
else
    success "No hay console.log nuevos"
fi

# 6. Verificar migrations
echo ""
echo "🗄️  Verificando migrations..."
MIGRATIONS=$(git diff --name-only origin/$BASE_BRANCH...$BRANCH | grep -E "migrations.*\.sql$" || echo "")
if [ -n "$MIGRATIONS" ]; then
    warning "Este PR contiene migrations:"
    echo "$MIGRATIONS" | sed 's/^/  - /'
    echo ""
    echo "  ⚠️  Asegúrate de:"
    echo "    1. Migrations probadas en staging"
    echo "    2. Plan de rollback documentado"
    echo "    3. Backup considerado"
    WARNINGS=$((WARNINGS + 1))
else
    success "No hay migrations nuevas"
fi

# 7. Ejecutar lint
echo ""
echo "🧹 Ejecutando lint..."
if npm run lint > /dev/null 2>&1; then
    success "Lint pasó"
else
    error "Lint falló. Ejecuta 'npm run lint' para ver errores."
    ERRORS=$((ERRORS + 1))
fi

# 8. Ejecutar tests
echo ""
echo "🧪 Ejecutando tests..."
if npm run test:quick > /dev/null 2>&1; then
    success "Tests pasaron"
else
    error "Tests fallaron. Ejecuta 'npm run test' para ver errores."
    ERRORS=$((ERRORS + 1))
fi

# 9. Verificar build
echo ""
echo "🏗️  Verificando build..."
if npm run build > /dev/null 2>&1; then
    success "Build exitoso"
else
    error "Build falló. Ejecuta 'npm run build' para ver errores."
    ERRORS=$((ERRORS + 1))
fi

# 10. Verificar TypeScript
echo ""
echo "📘 Verificando TypeScript..."
cd apps/web
if npx tsc --noEmit > /dev/null 2>&1; then
    success "TypeScript válido"
else
    error "TypeScript tiene errores. Ejecuta 'npx tsc --noEmit' para ver errores."
    ERRORS=$((ERRORS + 1))
fi
cd ../..

# Resumen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumen de Validación"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "¡Todo listo! PR está listo para review."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    warning "PR tiene $WARNINGS advertencia(s). Revisa antes de abrir PR."
    exit 0
else
    error "PR tiene $ERRORS error(es) y $WARNINGS advertencia(s)."
    error "Corrige los errores antes de abrir PR."
    exit 1
fi








