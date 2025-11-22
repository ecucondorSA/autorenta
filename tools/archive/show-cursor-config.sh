#!/bin/bash
# ============================================================================
# Mostrar Configuración de Cursor Lista para Copiar/Pegar
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo "========================================"
echo "⚙️  Configuración de Cursor - AutoRenta"
echo "========================================"
echo ""

# Leer configuración
RUNTIME_CONFIG=".cursor/runtime-config.json"
SECRETS_CONFIG=".cursor/secrets-config.json"

if [ ! -f "$RUNTIME_CONFIG" ] || [ ! -f "$SECRETS_CONFIG" ]; then
  echo "❌ Archivos de configuración no encontrados"
  echo "   Ejecuta: ./tools/configure-cursor-auto.sh"
  exit 1
fi

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 RUNTIME CONFIGURATION${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

INSTALL_SCRIPT=$(jq -r '.installScript' "$RUNTIME_CONFIG" 2>/dev/null || echo "npm run install")
START_SCRIPT=$(jq -r '.startScript' "$RUNTIME_CONFIG" 2>/dev/null || echo "npm run dev")

echo -e "${GREEN}✅ Install Script:${NC}"
echo "   $INSTALL_SCRIPT"
echo ""
echo -e "${GREEN}✅ Start Script:${NC}"
echo "   $START_SCRIPT"
echo ""

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔐 SECRETS${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Extraer secrets del JSON
if command -v jq &> /dev/null; then
  echo "Copia y pega cada secret en la interfaz de Cursor:"
  echo ""
  
  jq -r '.secrets[] | "\(.name)|\(.value)"' "$SECRETS_CONFIG" | while IFS='|' read -r name value; do
    echo -e "${CYAN}Secret name:${NC} $name"
    if [[ "$value" == *"["* ]]; then
      echo -e "${YELLOW}Secret value:${NC} $value"
    else
      echo -e "${GREEN}Secret value:${NC} $value"
    fi
    echo ""
  done
else
  # Fallback sin jq - leer directamente del JSON
  echo "Copia y pega cada secret en la interfaz de Cursor:"
  echo ""
  echo -e "${CYAN}Secret name:${NC} NG_APP_SUPABASE_URL"
  echo -e "${GREEN}Secret value:${NC} https://obxvffplochgeiclibng.supabase.co"
  echo ""
  echo -e "${CYAN}Secret name:${NC} NG_APP_SUPABASE_ANON_KEY"
  echo -e "${GREEN}Secret value:${NC} eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU"
  echo ""
  echo -e "${CYAN}Secret name:${NC} NG_APP_MAPBOX_ACCESS_TOKEN"
  echo -e "${YELLOW}Secret value:${NC} [OBTENER DESDE MAPBOX DASHBOARD]"
  echo ""
  echo -e "${CYAN}Secret name:${NC} NG_APP_PAYPAL_CLIENT_ID"
  echo -e "${YELLOW}Secret value:${NC} [OPCIONAL]"
  echo ""
fi

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📝 INSTRUCCIONES${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Runtime Configuration:"
echo "   - Cursor puede detectar automáticamente .cursor/runtime-config.json"
echo "   - O copia manualmente los valores arriba en la interfaz"
echo ""
echo "2. Secrets:"
echo "   - Abre la sección 'Secrets' en Cursor"
echo "   - Para cada secret arriba:"
echo "     • Copia el 'Secret name'"
echo "     • Copia el 'Secret value'"
echo "     • Pega ambos en la interfaz"
echo "     • Click en 'Create'"
echo ""
echo -e "${GREEN}✅ Configuración lista!${NC}"
echo ""

