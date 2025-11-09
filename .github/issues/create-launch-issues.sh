#!/bin/bash
# Script para crear los 4 issues de lanzamiento en GitHub
# Requiere: gh CLI configurado con permisos

set -e

echo "🚀 Creando issues de Launch Checklist en GitHub..."
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar que gh CLI está instalado
if ! command -v gh &> /dev/null; then
    echo "❌ Error: gh CLI no está instalado"
    echo "Instala desde: https://cli.github.com/"
    exit 1
fi

# Verificar que estamos autenticados
if ! gh auth status &> /dev/null; then
    echo "❌ Error: No estás autenticado con gh CLI"
    echo "Ejecuta: gh auth login"
    exit 1
fi

# Verificar que los archivos markdown existen
ISSUE_FILES=(
    ".github/issues/issue-1-day-1.md"
    ".github/issues/issue-2-day-2.md"
    ".github/issues/issue-3-day-3.md"
    ".github/issues/issue-4-post-launch.md"
)

for file in "${ISSUE_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Archivo no encontrado: $file"
        exit 1
    fi
done

# Issue 1: Día 1
echo -e "${BLUE}Creando Issue #1: Día 1 - Seguridad y Deployment...${NC}"
gh issue create \
  --title "🔒 Día 1: Seguridad y Deployment Crítico (Launch Checklist)" \
  --label "P0,deployment,security" \
  --body-file .github/issues/issue-1-day-1.md || {
    echo "⚠️  Issue #1 ya existe o hubo un error. Continuando..."
}
echo -e "${GREEN}✓ Issue #1 procesado${NC}"
echo ""

# Issue 2: Día 2
echo -e "${BLUE}Creando Issue #2: Día 2 - Documentación...${NC}"
gh issue create \
  --title "📚 Día 2: Documentación y Preparación (Launch Checklist)" \
  --label "documentation,P1" \
  --body-file .github/issues/issue-2-day-2.md || {
    echo "⚠️  Issue #2 ya existe o hubo un error. Continuando..."
}
echo -e "${GREEN}✓ Issue #2 procesado${NC}"
echo ""

# Issue 3: Día 3
echo -e "${BLUE}Creando Issue #3: Día 3 - Lanzamiento...${NC}"
gh issue create \
  --title "🚀 Día 3: Lanzamiento (Launch Checklist)" \
  --label "P0,launch" \
  --body-file .github/issues/issue-3-day-3.md || {
    echo "⚠️  Issue #3 ya existe o hubo un error. Continuando..."
}
echo -e "${GREEN}✓ Issue #3 procesado${NC}"
echo ""

# Issue 4: Post-Launch
echo -e "${BLUE}Creando Issue #4: Post-Lanzamiento...${NC}"
gh issue create \
  --title "📊 Post-Lanzamiento: Primera Semana (Monitoring)" \
  --label "monitoring,P1" \
  --body-file .github/issues/issue-4-post-launch.md || {
    echo "⚠️  Issue #4 ya existe o hubo un error. Continuando..."
}
echo -e "${GREEN}✓ Issue #4 procesado${NC}"
echo ""

echo -e "${GREEN}🎉 ¡Proceso completado!${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Ve a: https://github.com/ecucondorSA/autorenta/issues"
echo "2. Verifica los issues creados"
echo "3. Empieza con Issue #1"
echo ""
echo "¡Buena suerte con el lanzamiento! 🚀"

