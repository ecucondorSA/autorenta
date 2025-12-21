#!/bin/bash
# ===========================================================================
# AutoRenta - Clean Restart (fix HMR/compilation issues)
# ===========================================================================

set -e

echo "🧹 Limpiando caches y procesos..."

# 1. Detener procesos de desarrollo
pkill -f "ng serve" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*start" 2>/dev/null || true

# 2. Limpiar caches
rm -rf .angular/cache
rm -rf node_modules/.cache
rm -rf dist

echo "✓ Caches limpiadas"

# 3. Esperar a que los procesos terminen
sleep 2

# 4. Verificar que no haya procesos colgados
if pgrep -f "ng serve" >/dev/null || pgrep -f "vite" >/dev/null; then
  echo "⚠️ Procesos aún activos, forzando cierre..."
  pkill -9 -f "ng serve" 2>/dev/null || true
  pkill -9 -f "vite" 2>/dev/null || true
  sleep 1
fi

echo "✓ Procesos detenidos"

# 5. Reiniciar servidor
echo ""
echo "🚀 Reiniciando servidor de desarrollo..."
echo ""

npm run start
