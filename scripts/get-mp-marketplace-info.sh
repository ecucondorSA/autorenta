#!/bin/bash

# Script para obtener información del marketplace de MercadoPago
# Usa la API de MercadoPago para extraer Application ID y Marketplace ID

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Obteniendo información del marketplace de MercadoPago...${NC}"
echo ""

# Cargar variables de entorno
if [ -f ".env.local" ]; then
  source .env.local
elif [ -f "apps/web/.env.local" ]; then
  source apps/web/.env.local
else
  echo -e "${RED}❌ Error: No se encontró .env.local${NC}"
  exit 1
fi

if [ -z "$MERCADOPAGO_ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Error: MERCADOPAGO_ACCESS_TOKEN no está configurado${NC}"
  exit 1
fi

# Limpiar token (remover espacios/newlines)
MP_TOKEN=$(echo "$MERCADOPAGO_ACCESS_TOKEN" | tr -d '[:space:]')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 1: Información del Usuario"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Obtener información del usuario
USER_INFO=$(curl -s -X GET "https://api.mercadopago.com/users/me" \
  -H "Authorization: Bearer ${MP_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$USER_INFO" | jq -e . >/dev/null 2>&1; then
  USER_ID=$(echo "$USER_INFO" | jq -r '.id')
  SITE_ID=$(echo "$USER_INFO" | jq -r '.site_id')
  EMAIL=$(echo "$USER_INFO" | jq -r '.email')
  NICKNAME=$(echo "$USER_INFO" | jq -r '.nickname // "N/A"')

  echo -e "${GREEN}✅ Usuario:${NC} $EMAIL"
  echo -e "${GREEN}✅ User ID:${NC} $USER_ID"
  echo -e "${GREEN}✅ Site ID:${NC} $SITE_ID (País: AR)"
  echo -e "${GREEN}✅ Nickname:${NC} $NICKNAME"
else
  echo -e "${RED}❌ Error al obtener información del usuario${NC}"
  echo "$USER_INFO"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 2: Extraer Application ID del Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# El Application ID está en el token: APP_USR-{client_id}-{timestamp}-{hash}-{user_id}
# Formato: APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571
# Application ID = 4340262352975191

APPLICATION_ID=$(echo "$MP_TOKEN" | cut -d'-' -f2)

if [ -n "$APPLICATION_ID" ]; then
  echo -e "${GREEN}✅ Application ID:${NC} $APPLICATION_ID"
  echo "   (Extraído del access token)"
else
  echo -e "${RED}❌ No se pudo extraer Application ID del token${NC}"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 3: Consultar Información de la Aplicación"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Intentar obtener información de la aplicación
APP_INFO=$(curl -s -X GET "https://api.mercadopago.com/v1/applications/${APPLICATION_ID}" \
  -H "Authorization: Bearer ${MP_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$APP_INFO" | jq -e . >/dev/null 2>&1; then
  APP_NAME=$(echo "$APP_INFO" | jq -r '.name // "N/A"')
  APP_STATUS=$(echo "$APP_INFO" | jq -r '.status // "N/A"')
  MARKETPLACE_MODEL=$(echo "$APP_INFO" | jq -r '.business_model // "N/A"')

  echo -e "${GREEN}✅ Nombre de la app:${NC} $APP_NAME"
  echo -e "${GREEN}✅ Estado:${NC} $APP_STATUS"
  echo -e "${GREEN}✅ Modelo de negocio:${NC} $MARKETPLACE_MODEL"

  # Ver si está configurado como marketplace
  if [ "$MARKETPLACE_MODEL" = "marketplace" ] || [ "$MARKETPLACE_MODEL" = "split_payments" ]; then
    echo -e "${GREEN}✅ La aplicación está configurada como Marketplace${NC}"
  else
    echo -e "${YELLOW}⚠️  La aplicación NO está configurada como Marketplace${NC}"
    echo -e "${YELLOW}   Modelo actual: $MARKETPLACE_MODEL${NC}"
    echo ""
    echo -e "${YELLOW}Para habilitar split payments:${NC}"
    echo "1. Ir a: https://www.mercadopago.com.ar/developers/panel/app/${APPLICATION_ID}"
    echo "2. Configurar modelo de negocio como 'Marketplace'"
    echo "3. Activar 'Pagos divididos' (split payments)"
  fi
else
  echo -e "${YELLOW}⚠️  No se pudo obtener info de la aplicación (puede ser esperado)${NC}"
  echo "   La API de applications puede requerir permisos especiales"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 4: Marketplace ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Para obtener el Marketplace ID necesitamos verificar si existe
# En la mayoría de los casos, el Marketplace ID = User ID cuando se configura marketplace
# Pero puede ser diferente si se creó explícitamente

MARKETPLACE_ID="$USER_ID"

echo -e "${YELLOW}ℹ️  Marketplace ID probablemente es:${NC} $MARKETPLACE_ID"
echo "   (Por defecto, coincide con tu User ID)"
echo ""
echo -e "${YELLOW}Para verificar:${NC}"
echo "1. Ir a: https://www.mercadopago.com.ar/developers/panel/app/${APPLICATION_ID}"
echo "2. Buscar sección 'Marketplace' o 'Pagos divididos'"
echo "3. Verificar el Marketplace ID mostrado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}Variables para agregar a .env.local:${NC}"
echo ""
echo "MERCADOPAGO_APPLICATION_ID=$APPLICATION_ID"
echo "MERCADOPAGO_MARKETPLACE_ID=$MARKETPLACE_ID"
echo ""

echo -e "${BLUE}Comandos para configurar:${NC}"
echo ""
echo "# Opción 1: Agregar manualmente al .env.local"
cat <<EOF
echo 'MERCADOPAGO_APPLICATION_ID=$APPLICATION_ID' >> .env.local
echo 'MERCADOPAGO_MARKETPLACE_ID=$MARKETPLACE_ID' >> .env.local
EOF
echo ""
echo "# Opción 2: Configurar secrets en Supabase directamente"
cat <<EOF
echo '$APPLICATION_ID' | npx supabase secrets set MERCADOPAGO_APPLICATION_ID
echo '$MARKETPLACE_ID' | npx supabase secrets set MERCADOPAGO_MARKETPLACE_ID
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Script completado${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
