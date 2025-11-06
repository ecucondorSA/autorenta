#!/bin/bash
# Script para configurar custom domain en Cloudflare Pages usando API

set -e

ACCOUNT_ID="5b448192fe4b369642b68ad8f53a7603"
PROJECT_NAME="autorenta-web"
DOMAIN="autorentar.com"

echo "🌐 Configurando custom domain $DOMAIN para proyecto $PROJECT_NAME..."

# Verificar que wrangler está autenticado
if ! npx wrangler whoami &>/dev/null; then
  echo "❌ Error: wrangler no está autenticado"
  echo "Ejecuta: npx wrangler login"
  exit 1
fi

# Obtener API token desde wrangler config
WRANGLER_CONFIG="$HOME/.wrangler/config/default.toml"
if [ -f "$WRANGLER_CONFIG" ]; then
  API_TOKEN=$(grep -E "^api_token" "$WRANGLER_CONFIG" | cut -d'"' -f2)
fi

# Si no encontramos token, intentar usar wrangler directamente
if [ -z "$API_TOKEN" ]; then
  echo "⚠️  No se encontró API token en config, usando wrangler auth..."
  # Wrangler maneja la autenticación automáticamente
fi

# API endpoint para agregar custom domain
API_URL="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/domains"

echo "📡 Agregando dominio $DOMAIN..."

# Usar curl con autenticación de wrangler
# Primero intentar con API token si está disponible
if [ -n "$API_TOKEN" ]; then
  RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"domain\":\"$DOMAIN\"}")
else
  # Si no hay token, usar wrangler auth
  echo "⚠️  Usando autenticación de wrangler..."
  echo "💡 Si esto falla, necesitarás configurar el dominio manualmente en el dashboard"
  echo ""
  echo "📋 Pasos manuales:"
  echo "1. Ve a: https://dash.cloudflare.com/$ACCOUNT_ID/pages/view/$PROJECT_NAME"
  echo "2. Click en 'Custom domains'"
  echo "3. Click en 'Set up a custom domain'"
  echo "4. Ingresar: $DOMAIN"
  echo "5. Seguir las instrucciones para configurar DNS"
  exit 0
fi

# Verificar respuesta
if echo "$RESPONSE" | grep -q "success"; then
  echo "✅ Dominio agregado exitosamente!"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
  echo "❌ Error al agregar dominio:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  echo ""
  echo "💡 Alternativa: Configurar manualmente en dashboard"
  echo "URL: https://dash.cloudflare.com/$ACCOUNT_ID/pages/view/$PROJECT_NAME/custom-domains"
  exit 1
fi

echo ""
echo "✅ Custom domain configurado!"
echo "⏳ Espera 2-5 minutos para que SSL se active"
echo "🔍 Verificar: curl -I https://$DOMAIN"


