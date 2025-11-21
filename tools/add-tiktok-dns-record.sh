#!/bin/bash
# Script para agregar registro TXT de TikTok en Cloudflare DNS

set -e

ACCOUNT_ID="5b448192fe4b369642b68ad8f53a7603"
DOMAIN="autorentar.com"
TXT_NAME="@"
TXT_CONTENT="tiktok-developers-site-verification=933WGFWSl55S6GpQilNQXer0Fbl7ggl3"
TTL=3600  # 1 hora (Automático en Cloudflare)

echo "🎵 Agregando registro TXT de TikTok para $DOMAIN..."

# Verificar que wrangler está autenticado
if ! npx wrangler whoami &>/dev/null; then
  echo "❌ Error: wrangler no está autenticado"
  echo "Ejecuta: npx wrangler login"
  exit 1
fi

# Obtener API token desde wrangler config
WRANGLER_CONFIG="$HOME/.wrangler/config/default.toml"
API_TOKEN=""

if [ -f "$WRANGLER_CONFIG" ]; then
  API_TOKEN=$(grep -E "^api_token" "$WRANGLER_CONFIG" | cut -d'"' -f2)
fi

# Si no encontramos token, intentar obtener de variables de entorno
if [ -z "$API_TOKEN" ]; then
  if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    API_TOKEN="$CLOUDFLARE_API_TOKEN"
  else
    echo "⚠️  No se encontró API token"
    echo "💡 Opciones:"
    echo "   1. Crear API token en: https://dash.cloudflare.com/profile/api-tokens"
    echo "   2. Agregar permisos: Zone / DNS / Edit"
    echo "   3. Exportar: export CLOUDFLARE_API_TOKEN='tu-token'"
    echo ""
    echo "📋 O agregar manualmente en dashboard:"
    echo "   URL: https://dash.cloudflare.com"
    echo "   1. Selecciona dominio: $DOMAIN"
    echo "   2. Click en 'DNS'"
    echo "   3. Click en 'Agregar registro'"
    echo "   4. Tipo: TXT"
    echo "   5. Nombre: $TXT_NAME"
    echo "   6. Contenido: $TXT_CONTENT"
    echo "   7. TTL: Automático"
    echo "   8. Proxy Status: Solo DNS"
    exit 1
  fi
fi

# Obtener Zone ID del dominio
echo "🔍 Obteniendo Zone ID para $DOMAIN..."
ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json")

ZONE_ID=$(echo "$ZONE_RESPONSE" | jq -r '.result[0].id // empty')

if [ -z "$ZONE_ID" ] || [ "$ZONE_ID" = "null" ]; then
  echo "❌ Error: No se pudo obtener Zone ID para $DOMAIN"
  echo "💡 Verifica que:"
  echo "   1. El dominio está agregado en Cloudflare"
  echo "   2. Tienes permisos para acceder al dominio"
  echo "   3. El API token tiene permisos de Zone / Read"
  echo ""
  echo "Respuesta de API:"
  echo "$ZONE_RESPONSE" | jq '.' 2>/dev/null || echo "$ZONE_RESPONSE"
  exit 1
fi

echo "✅ Zone ID obtenido: $ZONE_ID"

# Verificar si el registro ya existe
echo "🔍 Verificando si el registro ya existe..."
EXISTING_RECORDS=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=TXT&name=$DOMAIN" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json")

EXISTING_COUNT=$(echo "$EXISTING_RECORDS" | jq -r '.result | length')

if [ "$EXISTING_COUNT" -gt 0 ]; then
  echo "⚠️  Se encontraron $EXISTING_COUNT registros TXT existentes para $DOMAIN"

  # Verificar si ya existe el registro de TikTok
  TIKTOK_EXISTS=$(echo "$EXISTING_RECORDS" | jq -r ".result[] | select(.content | contains(\"tiktok-developers-site-verification\")) | .id" | head -1)

  if [ -n "$TIKTOK_EXISTS" ]; then
    echo "✅ El registro TXT de TikTok ya existe (ID: $TIKTOK_EXISTS)"
    echo "💡 Si necesitas actualizarlo, elimínalo primero desde el dashboard"
    exit 0
  fi
fi

# Agregar el registro TXT
echo "📝 Agregando registro TXT..."
ADD_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"TXT\",
    \"name\": \"$TXT_NAME\",
    \"content\": \"$TXT_CONTENT\",
    \"ttl\": $TTL,
    \"comment\": \"TikTok Developer Site Verification\"
  }")

SUCCESS=$(echo "$ADD_RESPONSE" | jq -r '.success // false')
RECORD_ID=$(echo "$ADD_RESPONSE" | jq -r '.result.id // empty')

if [ "$SUCCESS" = "true" ] && [ -n "$RECORD_ID" ]; then
  echo "✅ Registro TXT agregado exitosamente!"
  echo "   ID: $RECORD_ID"
  echo "   Tipo: TXT"
  echo "   Nombre: $TXT_NAME"
  echo "   Contenido: $TXT_CONTENT"
  echo ""
  echo "⏳ Espera 5-10 minutos para que el registro se propague"
  echo "🔍 Verificar en: https://dash.cloudflare.com/$ACCOUNT_ID/domains/$DOMAIN/dns"
  echo ""
  echo "📋 Próximos pasos:"
  echo "   1. Espera 5-10 minutos"
  echo "   2. Regresa a TikTok Developers"
  echo "   3. Haz click en 'Verify'"
else
  echo "❌ Error al agregar registro TXT:"
  echo "$ADD_RESPONSE" | jq '.' 2>/dev/null || echo "$ADD_RESPONSE"
  echo ""
  echo "💡 Alternativa: Agregar manualmente en dashboard"
  echo "   URL: https://dash.cloudflare.com/$ACCOUNT_ID/domains/$DOMAIN/dns"
  exit 1
fi



