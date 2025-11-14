#!/bin/bash

# Script para inyectar variables de entorno en env.js durante build
# Este script reemplaza los placeholders ${VAR} con valores reales

set -e

ENV_FILE="dist/web/browser/env.js"

echo "🔧 Inyectando variables de entorno en env.js..."

# Verificar que el archivo existe
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: $ENV_FILE no encontrado"
  echo "   Asegúrate de ejecutar 'pnpm build' primero"
  exit 1
fi

# Cargar variables de entorno
if [ -f ".env.local" ]; then
  echo "📝 Cargando .env.local..."
  export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
  echo "📝 Cargando .env..."
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "⚠️  Advertencia: No se encontró .env.local ni .env"
  echo "   Usando variables de entorno del sistema"
fi

# Reemplazar placeholders
sed -i "s|\${NG_APP_SUPABASE_URL}|${NG_APP_SUPABASE_URL:-https://pisqjmoklivzpwufhscx.supabase.co}|g" "$ENV_FILE"
sed -i "s|\${NG_APP_SUPABASE_ANON_KEY}|${NG_APP_SUPABASE_ANON_KEY}|g" "$ENV_FILE"
sed -i "s|\${NG_APP_MAPBOX_ACCESS_TOKEN}|${NG_APP_MAPBOX_ACCESS_TOKEN}|g" "$ENV_FILE"
sed -i "s|\${NG_APP_MERCADOPAGO_PUBLIC_KEY}|${NG_APP_MERCADOPAGO_PUBLIC_KEY}|g" "$ENV_FILE"
sed -i "s|\${NG_APP_PAYMENTS_WEBHOOK_URL}|${NG_APP_PAYMENTS_WEBHOOK_URL:-http://localhost:8787/webhooks/payments}|g" "$ENV_FILE"

echo "✅ Variables inyectadas exitosamente en $ENV_FILE"

# Verificar que no quedaron placeholders
if grep -q '\${' "$ENV_FILE"; then
  echo "⚠️  Advertencia: Algunos placeholders no fueron reemplazados:"
  grep '\${' "$ENV_FILE"
  echo ""
  echo "Verifica que todas las variables estén definidas en .env.local"
fi

