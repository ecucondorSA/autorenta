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

# Issue 1: Día 1
echo -e "${BLUE}Creando Issue #1: Día 1 - Seguridad y Deployment...${NC}"
gh issue create \
  --title "🔒 Día 1: Seguridad y Deployment Crítico (Launch Checklist)" \
  --label "P0,deployment,security" \
  --assignee @me \
  --body-file .github/issues/issue-1-day-1.md

echo -e "${GREEN}✓ Issue #1 creado${NC}"
echo ""

# Issue 2: Día 2
echo -e "${BLUE}Creando Issue #2: Día 2 - Documentación...${NC}"
gh issue create \
  --title "📚 Día 2: Documentación y Preparación (Launch Checklist)" \
  --label "documentation,P1" \
  --assignee @me \
  --body-file .github/issues/issue-2-day-2.md

echo -e "${GREEN}✓ Issue #2 creado${NC}"
echo ""

# Issue 3: Día 3
echo -e "${BLUE}Creando Issue #3: Día 3 - Lanzamiento...${NC}"
gh issue create \
  --title "🚀 Día 3: Lanzamiento (Launch Checklist)" \
  --label "P0,launch" \
  --assignee @me \
  --body-file .github/issues/issue-3-day-3.md

echo -e "${GREEN}✓ Issue #3 creado${NC}"
echo ""

# Issue 4: Post-Launch
echo -e "${BLUE}Creando Issue #4: Post-Lanzamiento...${NC}"
gh issue create \
  --title "📊 Post-Lanzamiento: Primera Semana (Monitoring)" \
  --label "monitoring,P1" \
  --assignee @me \
  --body-file .github/issues/issue-4-post-launch.md

echo -e "${GREEN}✓ Issue #4 creado${NC}"
echo ""

echo -e "${GREEN}🎉 ¡Todos los issues creados exitosamente!${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Ve a: https://github.com/ecucondorSA/autorenta/issues"
echo "2. Verifica los 4 issues creados"
echo "3. Empieza con Issue #1"
echo ""
echo "¡Buena suerte con el lanzamiento! 🚀"
