#!/usr/bin/env bash

set -euo pipefail

CHROME_DEBUG_PORT="${CHROME_DEVTOOLS_PORT:-9222}"
CHROME_DEBUG_URL="http://localhost:${CHROME_DEBUG_PORT}"

echo "🔍 Obteniendo WebSocket endpoint para Chrome CDP..."

# Verificar si Chrome está corriendo
if ! curl -s "${CHROME_DEBUG_URL}/json/version" > /dev/null; then
  echo "❌ Chrome no está corriendo con CDP en puerto ${CHROME_DEBUG_PORT}"
  echo "   Ejecuta: ./scripts/chrome-dev.sh"
  exit 1
fi

# Obtener WebSocket endpoint
WS_ENDPOINT=$(curl -s "${CHROME_DEBUG_URL}/json/version" | jq -r '.webSocketDebuggerUrl')

echo "✅ Chrome CDP corriendo en puerto ${CHROME_DEBUG_PORT}"
echo "🔗 WebSocket Endpoint:"
echo "   ${WS_ENDPOINT}"
echo ""
echo "📋 Para usar en tests:"
echo "   export CHROME_CDP_WS_ENDPOINT='${WS_ENDPOINT}'"
echo ""
echo "🧪 Para tests con Playwright:"
echo "   npx playwright test --config=playwright.config.cdp.ts --headed"
echo ""
echo "🎯 Para codegen en vivo:"
echo "   npx playwright codegen --target=chrome --port=${CHROME_DEBUG_PORT} http://localhost:4200"