#!/bin/bash
# Script para organizar archivos .md del root en docs/

# No usar set -e para que continúe aunque haya errores

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📚 Organizando documentación...${NC}\n"

# Crear estructura de carpetas
mkdir -p docs/archived/{sessions,sprints,summaries,old}
mkdir -p docs/implementation/{features,fixes,guides}
mkdir -p docs/audits/{code,database,security,features}
mkdir -p docs/reports/{status,testing,deployment,analysis}
mkdir -p docs/guides/{setup,deployment,features}

# Archivos críticos que NO se mueven
CRITICAL_FILES=(
  "CLAUDE.md"
  "README.md"
  "CONTRIBUTING.md"
  "CODE_OF_CONDUCT.md"
  "LICENSE"
  "MULTI_AGENT_WORKFLOW.md"
  "CURSOR_OPTIMIZED_GUIDE.md"
  "CLAUDE_SKILLS_GUIDE.md"
  "CLAUDE_CODE_IMPROVEMENTS.md"
  "PATTERNS.md"
)

# Función para verificar si un archivo es crítico
is_critical() {
  local file="$1"
  for critical in "${CRITICAL_FILES[@]}"; do
    if [[ "$file" == "$critical" ]]; then
      return 0
    fi
  done
  return 1
}

# Contador
MOVED=0
SKIPPED=0

# Obtener lista de archivos .md en el root
FILES=$(find . -maxdepth 1 -name "*.md" -type f -printf "%f\n" | sort)

# Procesar cada archivo
for file in $FILES; do
  # Verificar que el archivo existe
  [[ ! -f "$file" ]] && continue
  
  # Saltar archivos críticos
  if is_critical "$file"; then
    echo -e "${YELLOW}⏭️  Saltando (crítico): $file${NC}"
    ((SKIPPED++))
    continue
  fi
  
  # Determinar destino según patrones
  DEST=""
  
  # Sessions y resúmenes de sesiones
  if [[ "$file" =~ ^(SESSION_|SESION_|RESUMEN_SESION|RESUMEN-SESION) ]]; then
    DEST="docs/archived/sessions/"
  
  # Sprints
  elif [[ "$file" =~ ^(SPRINT) ]]; then
    DEST="docs/archived/sprints/"
  
  # Resúmenes generales
  elif [[ "$file" =~ ^(RESUMEN_|EXECUTIVE_SUMMARY|SUMMARY) ]]; then
    DEST="docs/archived/summaries/"
  
  # Análisis antiguos
  elif [[ "$file" =~ (OLD|OLD2|_OLD)$ ]]; then
    DEST="docs/archived/old/"
  
  # Auditorías
  elif [[ "$file" =~ ^(AUDIT_|AUDITORIA_) ]]; then
    if [[ "$file" =~ (DATABASE|DB|STRUCTURE) ]]; then
      DEST="docs/audits/database/"
    elif [[ "$file" =~ (SECURITY|SEGURIDAD) ]]; then
      DEST="docs/audits/security/"
    elif [[ "$file" =~ (CODE|CODIGO) ]]; then
      DEST="docs/audits/code/"
    else
      DEST="docs/audits/features/"
    fi
  
  # Implementaciones
  elif [[ "$file" =~ ^(IMPLEMENTATION_|IMPLEMENTACION_) ]]; then
    DEST="docs/implementation/features/"
  
  # Fixes y correcciones
  elif [[ "$file" =~ (FIX|FIXES|CORRECCION) ]]; then
    DEST="docs/implementation/fixes/"
  
  # Guías de deployment (ya tenemos docs/deployment-guide.md, mover duplicados)
  elif [[ "$file" =~ ^(DEPLOYMENT_|DEPLOY_|BUILD_) ]]; then
    DEST="docs/reports/deployment/"
  
  # Reportes de estado
  elif [[ "$file" =~ ^(STATUS_|REPORT_|ESTADO_) ]]; then
    DEST="docs/reports/status/"
  
  # Reportes de testing
  elif [[ "$file" =~ ^(TEST|TESTING_|E2E_) ]]; then
    DEST="docs/reports/testing/"
  
  # Análisis
  elif [[ "$file" =~ ^(ANALISIS_|ANALYSIS_) ]]; then
    DEST="docs/reports/analysis/"
  
  # Guías de setup
  elif [[ "$file" =~ (SETUP|GUIDE|GUIA|QUICKSTART) ]]; then
    if [[ "$file" =~ (DEPLOY|BUILD) ]]; then
      DEST="docs/guides/deployment/"
    else
      DEST="docs/guides/setup/"
    fi
  
  # Documentación de features específicas
  elif [[ "$file" =~ ^(BOOKING_|CAR_|WALLET_|MERCADOPAGO_|PAYMENT_|CHAT_|MESSAGING_) ]]; then
    DEST="docs/guides/features/"
  
  # Todo lo demás va a archived
  else
    DEST="docs/archived/old/"
  fi
  
  # Mover archivo
  if [[ -n "$DEST" ]]; then
    echo -e "${GREEN}📦 Moviendo: $file → $DEST${NC}"
    if mv "$file" "$DEST" 2>/dev/null; then
      ((MOVED++))
    else
      echo -e "${RED}❌ Error moviendo $file${NC}"
    fi
  else
    echo -e "${RED}❌ No se determinó destino para: $file${NC}"
  fi
done

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Organización completada${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "📦 Archivos movidos: ${GREEN}$MOVED${NC}"
echo -e "⏭️  Archivos saltados (críticos): ${YELLOW}$SKIPPED${NC}"
echo -e "\n${YELLOW}💡 Revisa los archivos movidos y ajusta si es necesario${NC}"
echo -e "${YELLOW}💡 Algunos archivos pueden necesitar revisión manual${NC}"

