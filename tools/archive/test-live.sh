#!/usr/bin/env bash

set -euo pipefail

echo "🚀 AutoRenta Live Testing Setup"
echo "=============================="

# 1. Verificar si Chrome ya está corriendo
if ! curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
  echo "📱 Iniciando Chrome con CDP..."
  ./scripts/chrome-dev.sh http://localhost:4200 &
  CHROME_PID=$!
  
  # Esperar a que Chrome esté listo
  echo "⏳ Esperando Chrome CDP..."
  for i in {1..10}; do
    if curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
      echo "✅ Chrome CDP listo"
      break
    fi
    sleep 1
  done
else
  echo "✅ Chrome CDP ya está corriendo"
fi

# 2. Obtener WebSocket endpoint
echo "🔗 Obteniendo WebSocket endpoint..."
WS_ENDPOINT=$(curl -s http://localhost:9222/json/version | jq -r '.webSocketDebuggerUrl')
export CHROME_CDP_WS_ENDPOINT="$WS_ENDPOINT"

echo "   WebSocket: $WS_ENDPOINT"

# 3. Verificar dev server
if ! curl -s http://localhost:4200 > /dev/null 2>&1; then
  echo "❌ Dev server no está corriendo en http://localhost:4200"
  echo "   Ejecuta en otra terminal: pnpm run dev"
  exit 1
fi

echo "✅ Dev server corriendo en http://localhost:4200"

# 4. Ejecutar tests según parámetro
case "${1:-test}" in
  "test")
    echo "🧪 Ejecutando tests con Playwright CDP..."
    npx playwright test --config=playwright.config.cdp.ts --headed
    ;;
  "ui")
    echo "🎛️  Abriendo Playwright UI..."
    npx playwright test --config=playwright.config.cdp.ts --ui
    ;;
  "codegen")
    echo "🎯 Iniciando codegen en vivo..."
    echo "   Conectándose a Chrome CDP existente..."
    npx playwright codegen --browser=chromium http://localhost:4200
    ;;
  "testsprite")
    echo "🧪 Ejecutando Testsprite..."
    # Testsprite debería usar la misma Chrome instance
    npx testsprite run
    ;;
  *)
    echo "❓ Uso: $0 [test|ui|codegen|testsprite]"
    echo "   test     - Ejecutar tests con Playwright CDP"
    echo "   ui       - Abrir Playwright UI"
    echo "   codegen  - Codegen en vivo"
    echo "   testsprite - Ejecutar Testsprite"
    ;;
esac

echo "🏁 Done!"