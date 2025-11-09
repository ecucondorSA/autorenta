#!/bin/bash

###############################################################################
# CHECK DEVELOPMENT GUIDELINES
###############################################################################
# Script para verificar que el código sigue las development guidelines
# Basado en DEVELOPMENT_GUIDELINES.md
#
# Uso:
#   ./tools/check-dev-guidelines.sh
#   ./tools/check-dev-guidelines.sh --fix  # Intenta auto-fix algunos errores
#
# Exit codes:
#   0: Todos los checks pasan
#   1: Algunos checks fallan
###############################################################################

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Obtener directorio raíz
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Flags
AUTO_FIX=false
if [ "${1:-}" == "--fix" ]; then
  AUTO_FIX=true
fi

# Contadores
ERRORS=0
WARNINGS=0

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  🔍 Development Guidelines Check"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}\n"

# Check 1: Toast Service calls con 1 parámetro
echo -e "${BLUE}📋 Check 1: Toast Service API (debe tener 2-3 parámetros)${NC}"
TOAST_ERRORS=$(grep -rn "toastService\.\(success\|error\|warning\|info\)('[^,]*');" apps/web/src --include="*.ts" 2>/dev/null | wc -l 2>/dev/null || echo "0")
TOAST_ERRORS=${TOAST_ERRORS// /}  # Remove spaces
if [ "${TOAST_ERRORS:-0}" -gt 0 ]; then
  echo -e "${RED}❌ Encontrados $TOAST_ERRORS toast calls con 1 parámetro${NC}"
  grep -rn "toastService\.\(success\|error\|warning\|info\)('[^,]*');" apps/web/src --include="*.ts" 2>/dev/null | head -5
  ERRORS=$((ERRORS + TOAST_ERRORS))
else
  echo -e "${GREEN}✅ Todos los toast calls tienen parámetros correctos${NC}"
fi
echo ""

# Check 2: Templates inline grandes (>50 líneas estimado)
echo -e "${BLUE}📋 Check 2: Templates inline grandes (>50 líneas)${NC}"
TEMPLATE_COUNT=0
while IFS= read -r file; do
  if [ -f "$file" ] && grep -q "template:" "$file" 2>/dev/null; then
    # Verificar si tiene template inline (no templateUrl)
    if grep -q "template:" "$file" && ! grep -q "templateUrl:" "$file"; then
      # Contar líneas aproximadas del template
      TEMPLATE_START=$(grep -n "template:" "$file" | head -1 | cut -d: -f1)
      TEMPLATE_END=$(grep -n -E "styles:|^}" "$file" | head -1 | cut -d: -f1)
      if [ -n "$TEMPLATE_START" ] && [ -n "$TEMPLATE_END" ] && [ "$TEMPLATE_START" -lt "$TEMPLATE_END" ]; then
        LINES=$((TEMPLATE_END - TEMPLATE_START))
        if [ "$LINES" -gt 50 ]; then
          echo -e "${YELLOW}⚠️  $file: Template inline de ~$LINES líneas (considera extraer a .html)${NC}"
          TEMPLATE_COUNT=$((TEMPLATE_COUNT + 1))
          WARNINGS=$((WARNINGS + 1))
        fi
      fi
    fi
  fi
done < <(find apps/web/src -name "*.ts" -type f | head -20)
if [ "$TEMPLATE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No se encontraron templates inline grandes${NC}"
fi
echo ""

# Check 3: Imports a módulos inexistentes (supabase.service)
echo -e "${BLUE}📋 Check 3: Imports a módulos inexistentes${NC}"
BAD_IMPORTS=$(grep -rn "from.*supabase\.service" apps/web/src --include="*.ts" 2>/dev/null | wc -l 2>/dev/null || echo "0")
BAD_IMPORTS=${BAD_IMPORTS// /}  # Remove spaces
if [ "${BAD_IMPORTS:-0}" -gt 0 ]; then
  echo -e "${RED}❌ Encontrados $BAD_IMPORTS imports a 'supabase.service' (debe ser 'supabase-client.service')${NC}"
  grep -rn "from.*supabase\.service" apps/web/src --include="*.ts" 2>/dev/null
  ERRORS=$((ERRORS + BAD_IMPORTS))
else
  echo -e "${GREEN}✅ No se encontraron imports a módulos inexistentes${NC}"
fi
echo ""

# Check 4: Componentes Ionic sin IonicModule importado
echo -e "${BLUE}📋 Check 4: Componentes Ionic sin IonicModule${NC}"
IONIC_ERRORS=0
while IFS= read -r file; do
  if [ -f "$file" ]; then
    # Verificar si usa componentes ion-* pero no importa IonicModule
    if grep -q "<ion-" "$file" 2>/dev/null; then
      if ! grep -q "IonicModule" "$file" 2>/dev/null; then
        echo -e "${RED}❌ $file: Usa componentes Ionic pero no importa IonicModule${NC}"
        IONIC_ERRORS=$((IONIC_ERRORS + 1))
      fi
    fi
  fi
done < <(find apps/web/src -name "*.ts" -type f | head -30)
if [ "$IONIC_ERRORS" -eq 0 ]; then
  echo -e "${GREEN}✅ Todos los componentes Ionic tienen IonicModule importado${NC}"
else
  ERRORS=$((ERRORS + IONIC_ERRORS))
fi
echo ""

# Check 5: Arrow functions en templates (búsqueda básica)
echo -e "${BLUE}📋 Check 5: Arrow functions en templates (búsqueda básica)${NC}"
ARROW_FUNCTIONS=$(grep -rn "\.reduce\|\.filter\|\.map" apps/web/src --include="*.html" 2>/dev/null | grep -E "=>|\(.*\) =>" | wc -l 2>/dev/null || echo "0")
ARROW_FUNCTIONS=${ARROW_FUNCTIONS// /}  # Remove spaces
if [ "${ARROW_FUNCTIONS:-0}" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Encontradas ~$ARROW_FUNCTIONS posibles arrow functions en templates${NC}"
  echo -e "${YELLOW}   Considera mover la lógica a métodos del componente${NC}"
  WARNINGS=$((WARNINGS + ARROW_FUNCTIONS))
else
  echo -e "${GREEN}✅ No se encontraron arrow functions obvias en templates${NC}"
fi
echo ""

# Check 6: Verificar que database.types.ts existe y no está vacío
echo -e "${BLUE}📋 Check 6: Supabase types sincronizados${NC}"
TYPES_FILE="apps/web/src/app/core/types/database.types.ts"
if [ ! -f "$TYPES_FILE" ]; then
  echo -e "${RED}❌ $TYPES_FILE no existe${NC}"
  echo -e "${YELLOW}   Ejecuta: npm run sync:types:remote${NC}"
  ERRORS=$((ERRORS + 1))
elif [ ! -s "$TYPES_FILE" ]; then
  echo -e "${RED}❌ $TYPES_FILE está vacío${NC}"
  echo -e "${YELLOW}   Ejecuta: npm run sync:types:remote${NC}"
  ERRORS=$((ERRORS + 1))
else
  LINES=$(wc -l < "$TYPES_FILE" || echo "0")
  if [ "$LINES" -lt 100 ]; then
    echo -e "${YELLOW}⚠️  $TYPES_FILE tiene solo $LINES líneas (puede estar desactualizado)${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✅ database.types.ts existe y tiene $LINES líneas${NC}"
  fi
fi
echo ""

# Resumen
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  📊 Resumen"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}Errores encontrados:${NC} ${RED}$ERRORS${NC}"
echo -e "${BLUE}Warnings encontrados:${NC} ${YELLOW}$WARNINGS${NC}"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}❌ Algunos checks fallaron. Revisa DEVELOPMENT_GUIDELINES.md${NC}"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Algunos warnings encontrados. Considera revisarlos.${NC}"
  exit 0
else
  echo -e "${GREEN}✅ Todos los checks pasaron${NC}"
  exit 0
fi

