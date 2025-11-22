#!/bin/bash

# Script para configurar secrets de MercadoPago en Supabase Edge Functions
# Uso: ./scripts/setup-supabase-secrets.sh

set -e

echo "🔐 Configurando secrets de MercadoPago en Supabase..."
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cargar variables de entorno
if [ -f ".env.local" ]; then
  source .env.local
  echo "✅ Archivo .env.local encontrado"
elif [ -f "apps/web/.env.local" ]; then
  source apps/web/.env.local
  echo "✅ Archivo apps/web/.env.local encontrado"
else
  echo -e "${RED}❌ Error: No se encontró .env.local${NC}"
  echo "Copia .env.example a .env.local y configura tus credenciales"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 SECRETS A CONFIGURAR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Array de secrets a configurar
declare -A SECRETS=(
  ["MERCADOPAGO_ACCESS_TOKEN"]="Access token de producción"
  ["MERCADOPAGO_PUBLIC_KEY"]="Public key de producción"
  ["MERCADOPAGO_MARKETPLACE_ID"]="ID del marketplace (para split payments)"
  ["MERCADOPAGO_APPLICATION_ID"]="Application ID de MercadoPago"
  ["SUPABASE_URL"]="URL del proyecto Supabase"
  ["SUPABASE_SERVICE_ROLE_KEY"]="Service role key de Supabase"
)

# Verificar que existan las variables
MISSING=0
for secret in "${!SECRETS[@]}"; do
  value="${!secret}"
  if [ -z "$value" ] || [[ "$value" == "your-"* ]]; then
    echo -e "${RED}❌ $secret: NO CONFIGURADO${NC}"
    echo "   ${SECRETS[$secret]}"
    ((MISSING++))
  else
    # Mostrar solo primeros y últimos caracteres
    len=${#value}
    if [ $len -gt 10 ]; then
      preview="${value:0:8}...${value: -4}"
    else
      preview="***"
    fi
    echo -e "${GREEN}✅ $secret${NC}: $preview"
    echo "   ${SECRETS[$secret]}"
  fi
  echo ""
done

if [ $MISSING -gt 0 ]; then
  echo -e "${RED}❌ Hay $MISSING secretos sin configurar${NC}"
  echo "Actualiza .env.local con los valores correctos"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  CONFIGURANDO SECRETS EN SUPABASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Confirmar antes de proceder
read -p "¿Deseas configurar estos secrets en Supabase? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Operación cancelada"
  exit 0
fi

echo ""
echo -e "${BLUE}🔄 Configurando secrets...${NC}"
echo ""

# Contador de éxitos
SUCCESS=0
FAILED=0

# Configurar cada secret
for secret in "${!SECRETS[@]}"; do
  value="${!secret}"

  echo -n "Setting $secret... "

  # Usar npx supabase secrets set
  if echo "$value" | npx supabase secrets set "$secret" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
    ((SUCCESS++))
  else
    echo -e "${RED}❌${NC}"
    ((FAILED++))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Todos los secrets configurados exitosamente ($SUCCESS/$((SUCCESS + FAILED)))${NC}"
  echo ""
  echo "Puedes verificar los secrets con:"
  echo "  npx supabase secrets list"
  echo ""
  exit 0
else
  echo -e "${YELLOW}⚠️  $SUCCESS secrets configurados, $FAILED fallidos${NC}"
  echo ""
  echo "Para configurar manualmente:"
  echo "  echo 'valor' | npx supabase secrets set NOMBRE_SECRET"
  echo ""
  exit 1
fi
