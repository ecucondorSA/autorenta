#!/bin/bash
# Script para agregar registro TXT de TikTok - Intenta múltiples métodos

set -e

DOMAIN="autorentar.com"
TXT_CONTENT="tiktok-developers-site-verification=933WGFWSl55S6GpQilNQXer0Fbl7ggl3"
ACCOUNT_ID="5b448192fe4b369642b68ad8f53a7603"

echo "🎵 Agregando registro TXT de TikTok para $DOMAIN..."
echo ""

# Método 1: Intentar con API token de variable de entorno
if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
  echo "✅ Usando API token de variable de entorno"
  API_TOKEN="$CLOUDFLARE_API_TOKEN"

  # Obtener Zone ID
  echo "🔍 Obteniendo Zone ID..."
  ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json")

  ZONE_ID=$(echo "$ZONE_RESPONSE" | jq -r '.result[0].id // empty' 2>/dev/null)

  if [ -z "$ZONE_ID" ] || [ "$ZONE_ID" = "null" ]; then
    echo "❌ Error: No se pudo obtener Zone ID"
    echo "Respuesta: $ZONE_RESPONSE" | jq '.' 2>/dev/null || echo "$ZONE_RESPONSE"
    exit 1
  fi

  echo "✅ Zone ID: $ZONE_ID"

  # Verificar si ya existe
  echo "🔍 Verificando si el registro ya existe..."
  EXISTING=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=TXT&name=$DOMAIN" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json")

  TIKTOK_EXISTS=$(echo "$EXISTING" | jq -r ".result[] | select(.content | contains(\"tiktok-developers-site-verification\")) | .id" 2>/dev/null | head -1)

  if [ -n "$TIKTOK_EXISTS" ]; then
    echo "✅ El registro TXT de TikTok ya existe (ID: $TIKTOK_EXISTS)"
    echo "💡 Si necesitas actualizarlo, elimínalo primero desde el dashboard"
    exit 0
  fi

  # Agregar registro
  echo "📝 Agregando registro TXT..."
  ADD_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"TXT\",
      \"name\": \"$DOMAIN\",
      \"content\": \"$TXT_CONTENT\",
      \"ttl\": 3600,
      \"comment\": \"TikTok Developer Site Verification\"
    }")

  SUCCESS=$(echo "$ADD_RESPONSE" | jq -r '.success // false' 2>/dev/null)
  RECORD_ID=$(echo "$ADD_RESPONSE" | jq -r '.result.id // empty' 2>/dev/null)

  if [ "$SUCCESS" = "true" ] && [ -n "$RECORD_ID" ]; then
    echo "✅ Registro TXT agregado exitosamente!"
    echo "   ID: $RECORD_ID"
    echo "   Tipo: TXT"
    echo "   Nombre: $DOMAIN"
    echo "   Contenido: $TXT_CONTENT"
    echo ""
    echo "⏳ Espera 5-10 minutos para que el registro se propague"
    echo "🔍 Verificar en: https://dash.cloudflare.com/$ACCOUNT_ID/domains/$DOMAIN/dns"
    echo ""
    echo "📋 Próximos pasos:"
    echo "   1. Espera 5-10 minutos"
    echo "   2. Regresa a TikTok Developers"
    echo "   3. Haz click en 'Verify'"
    exit 0
  else
    echo "❌ Error al agregar registro:"
    echo "$ADD_RESPONSE" | jq '.' 2>/dev/null || echo "$ADD_RESPONSE"
    exit 1
  fi
fi

# Si no hay token, mostrar instrucciones
echo "❌ CLOUDFLARE_API_TOKEN no está configurado"
echo ""
echo "📋 Para agregar el registro automáticamente:"
echo ""
echo "   1. Obtén API token:"
echo "      https://dash.cloudflare.com/profile/api-tokens"
echo ""
echo "   2. Crea token con permisos:"
echo "      - Zone / DNS / Edit"
echo "      - Zone Resources: Include / Specific zone / autorentar.com"
echo ""
echo "   3. Ejecuta:"
echo "      export CLOUDFLARE_API_TOKEN='tu-token'"
echo "      ./tools/add-tiktok-dns-now.sh"
echo ""
echo "💡 O agrega manualmente en el dashboard:"
echo "   https://dash.cloudflare.com/$ACCOUNT_ID/domains/$DOMAIN/dns"
echo ""
echo "   Campos:"
echo "   - Tipo: TXT"
echo "   - Nombre: @"
echo "   - Contenido: $TXT_CONTENT"
echo "   - TTL: Automático"
echo "   - Proxy Status: Solo DNS"
exit 1



