#!/bin/bash

# Script para consultar MCP de MercadoPago sobre marketplace

set -e

MP_TOKEN="APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571"
APPLICATION_ID="4340262352975191"
MARKETPLACE_ID="2302679571"

echo "🔍 Consultando MCP de MercadoPago..."
echo ""

# 1. Listar tools disponibles
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 TOOLS DISPONIBLES EN MCP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

curl -s -X POST "https://mcp.mercadopago.com/mcp" \
  -H "Authorization: Bearer ${MP_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }' | jq -r '.result.tools[]? | "✓ \(.name): \(.description)"' || echo "No se pudieron listar las tools"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 BUSCAR DOCUMENTACIÓN: MARKETPLACE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 2. Buscar en documentación sobre marketplace
curl -s -X POST "https://mcp.mercadopago.com/mcp" \
  -H "Authorization: Bearer ${MP_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search-documentation",
      "arguments": {
        "query": "marketplace split payments configuration Argentina"
      }
    }
  }' | jq '.' || echo "No se pudo buscar en la documentación"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CONSULTAR API: USER INFO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 3. Verificar información del usuario via API directa
curl -s -X GET "https://api.mercadopago.com/users/me" \
  -H "Authorization: Bearer ${MP_TOKEN}" \
  -H "Content-Type: application/json" | jq '{
    id: .id,
    email: .email,
    site_id: .site_id,
    user_type: .user_type,
    marketplace: .context?.marketplace // "not_configured",
    tags: .tags
  }'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CONSULTAR: PAYMENT METHODS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 4. Verificar métodos de pago disponibles
curl -s -X GET "https://api.mercadopago.com/v1/payment_methods" \
  -H "Authorization: Bearer ${MP_TOKEN}" | jq 'length' | xargs -I {} echo "Métodos de pago disponibles: {}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Consulta completada"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
