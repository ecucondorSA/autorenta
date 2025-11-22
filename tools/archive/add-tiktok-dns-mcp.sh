#!/bin/bash
# Script para agregar registro TXT de TikTok usando MCP de AutoRenta Platform

set -e

DOMAIN="autorentar.com"
TXT_CONTENT="tiktok-developers-site-verification=933WGFWSl55S6GpQilNQXer0Fbl7ggl3"

echo "🎵 Agregando registro TXT de TikTok usando MCP..."
echo ""

# Verificar si el API token está configurado
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ Error: CLOUDFLARE_API_TOKEN no está configurado"
  echo ""
  echo "📋 Pasos para obtener el API token:"
  echo "   1. Ve a: https://dash.cloudflare.com/profile/api-tokens"
  echo "   2. Click en 'Create Token'"
  echo "   3. Usa template 'Edit zone DNS' o crea custom:"
  echo "      - Permisos: Zone / DNS / Edit"
  echo "      - Zone Resources: Include / Specific zone / autorentar.com"
  echo "   4. Copia el token generado"
  echo "   5. Exporta: export CLOUDFLARE_API_TOKEN='tu-token'"
  echo ""
  echo "💡 O ejecuta este script después de exportar el token:"
  echo "   export CLOUDFLARE_API_TOKEN='tu-token'"
  echo "   ./tools/add-tiktok-dns-mcp.sh"
  exit 1
fi

echo "✅ API Token encontrado"
echo "🔧 Usando herramienta MCP: add_cloudflare_dns_record"
echo ""

# Crear payload JSON para la herramienta MCP
PAYLOAD=$(cat <<EOF
{
  "domain": "$DOMAIN",
  "type": "TXT",
  "name": "@",
  "content": "$TXT_CONTENT",
  "ttl": 3600,
  "comment": "TikTok Developer Site Verification - Added via MCP"
}
EOF
)

echo "📝 Parámetros:"
echo "   Domain: $DOMAIN"
echo "   Type: TXT"
echo "   Name: @"
echo "   Content: $TXT_CONTENT"
echo ""

# Nota: Para usar la herramienta MCP directamente desde Claude Code,
# simplemente pide: "Agrega el registro TXT de TikTok usando MCP"
# Claude Code usará la herramienta add_cloudflare_dns_record automáticamente

echo "💡 Para usar esta herramienta desde Claude Code:"
echo "   Simplemente di: 'Agrega el registro TXT de TikTok usando MCP'"
echo ""
echo "   O usa directamente la herramienta MCP con estos parámetros:"
echo "   - domain: $DOMAIN"
echo "   - type: TXT"
echo "   - name: @"
echo "   - content: $TXT_CONTENT"
echo ""

echo "✅ Herramienta MCP lista para usar"
echo "📋 La herramienta 'add_cloudflare_dns_record' está disponible en el servidor MCP autorenta-platform"





