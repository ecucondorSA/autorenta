#!/usr/bin/env bash

set -euo pipefail

# Script para obtener información útil de Chrome DevTools Protocol
# Compatible con chrome-devtools-mcp y debugging en vivo

CHROME_DEBUG_PORT="${CHROME_DEVTOOLS_PORT:-9222}"
CHROME_DEBUG_URL="http://127.0.0.1:${CHROME_DEBUG_PORT}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  🔍 Chrome DevTools Protocol Info (chrome-devtools-mcp)${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar si Chrome está corriendo con CDP
if ! curl -s "${CHROME_DEBUG_URL}/json/version" > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Chrome no está corriendo con CDP en puerto ${CHROME_DEBUG_PORT}${NC}"
  echo ""
  echo "Para iniciar Chrome con CDP:"
  echo "  ./scripts/chrome-dev.sh"
  echo "  # o"
  echo "  npm run debug:chrome"
  exit 1
fi

echo -e "${GREEN}✅ Chrome CDP está corriendo en puerto ${CHROME_DEBUG_PORT}${NC}"
echo ""

# 1. Obtener webSocketDebuggerUrl
echo -e "${BLUE}📡 WebSocket Debugger URL:${NC}"
WS_ENDPOINT=$(curl -sS "${CHROME_DEBUG_URL}/json/version" | jq -r '.webSocketDebuggerUrl' 2>/dev/null || echo "")

if [ -z "$WS_ENDPOINT" ] || [ "$WS_ENDPOINT" = "null" ]; then
  echo -e "${YELLOW}⚠️  No se pudo obtener webSocketDebuggerUrl${NC}"
else
  echo -e "${GREEN}   ${WS_ENDPOINT}${NC}"
  echo ""
  echo "Para usar con chrome-devtools-mcp:"
  echo "  --wsEndpoint=${WS_ENDPOINT}"
  echo "  # o"
  echo "  --browserUrl=${CHROME_DEBUG_URL}"
  echo ""
fi

# 2. Listar páginas abiertas
echo -e "${BLUE}📄 Páginas abiertas:${NC}"
PAGES_JSON=$(curl -sS "${CHROME_DEBUG_URL}/json/list" 2>/dev/null || echo "[]")

if [ "$PAGES_JSON" = "[]" ] || [ -z "$PAGES_JSON" ]; then
  echo -e "${YELLOW}   No hay páginas abiertas${NC}"
else
  echo "$PAGES_JSON" | jq -r '.[] | "   \(.id) - \(.title // "Untitled") - \(.url)"' 2>/dev/null || echo "$PAGES_JSON"
fi
echo ""

# 3. Información de versión
echo -e "${BLUE}ℹ️  Información de Chrome:${NC}"
VERSION_INFO=$(curl -sS "${CHROME_DEBUG_URL}/json/version" 2>/dev/null || echo "{}")

if [ "$VERSION_INFO" != "{}" ]; then
  echo "$VERSION_INFO" | jq -r '
    "   Browser: \(.Browser // "Unknown")
   Protocol-Version: \(.["Protocol-Version"] // "Unknown")
   User-Agent: \(.User-Agent // "Unknown")
   V8-Version: \(.["V8-Version"] // "Unknown")
   WebKit-Version: \(.["WebKit-Version"] // "Unknown")"
  ' 2>/dev/null || echo "$VERSION_INFO"
fi
echo ""

# 4. Instrucciones para chrome-devtools-mcp
echo -e "${BLUE}🔧 Uso con chrome-devtools-mcp:${NC}"
echo ""
echo "Si chrome-devtools-mcp está conectado, puedes:"
echo "  1. Inspeccionar flujos desde su UI/cliente"
echo "  2. Capturar DevTools y depurar performance/network"
echo "  3. Conectar con --wsEndpoint o --browserUrl"
echo ""
echo "Comandos útiles:"
echo "  # Obtener webSocketDebuggerUrl"
echo "  curl -sS ${CHROME_DEBUG_URL}/json/version | jq -r '.webSocketDebuggerUrl'"
echo ""
echo "  # Listar páginas abiertas"
echo "  curl -sS ${CHROME_DEBUG_URL}/json/list | jq ."
echo ""
echo "  # Obtener información completa"
echo "  curl -sS ${CHROME_DEBUG_URL}/json/version | jq ."
echo ""

# 5. Exportar variables de entorno útiles
if [ -n "$WS_ENDPOINT" ] && [ "$WS_ENDPOINT" != "null" ]; then
  echo -e "${BLUE}📋 Variables de entorno sugeridas:${NC}"
  echo ""
  echo "  export CHROME_CDP_WS_ENDPOINT='${WS_ENDPOINT}'"
  echo "  export CHROME_DEVTOOLS_PORT=${CHROME_DEBUG_PORT}"
  echo "  export PLAYWRIGHT_CDP_WS='${WS_ENDPOINT}'"
  echo ""
fi




