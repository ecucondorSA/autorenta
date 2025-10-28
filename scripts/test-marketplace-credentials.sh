#!/bin/bash

# Script para verificar credenciales de MercadoPago mediante API
# Valida que el access token funciona y que el marketplace está configurado
# Uso: ./scripts/test-marketplace-credentials.sh [test|prod]

set -e

MODE=${1:-prod}

echo "🧪 Verificando credenciales de MercadoPago (modo: $MODE)..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cargar variables de entorno
if [ -f ".env.local" ]; then
  source .env.local
elif [ -f "apps/web/.env.local" ]; then
  source apps/web/.env.local
else
  echo -e "${RED}❌ Error: No se encontró .env.local${NC}"
  exit 1
fi

# Seleccionar credenciales según modo
if [ "$MODE" = "test" ]; then
  ACCESS_TOKEN="${MERCADOPAGO_TEST_ACCESS_TOKEN}"
  echo -e "${BLUE}📋 Usando credenciales de TEST/SANDBOX${NC}"
else
  ACCESS_TOKEN="${MERCADOPAGO_ACCESS_TOKEN}"
  echo -e "${BLUE}📋 Usando credenciales de PRODUCCIÓN${NC}"
fi

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Error: ACCESS_TOKEN no configurado${NC}"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 TEST 1: Validar Access Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Endpoint para obtener info del usuario/aplicación
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "https://api.mercadopago.com/users/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Access Token válido${NC}"

  # Extraer info del usuario
  USER_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  EMAIL=$(echo "$BODY" | grep -o '"email":"[^"]*"' | head -1 | cut -d'"' -f4)
  SITE_ID=$(echo "$BODY" | grep -o '"site_id":"[^"]*"' | head -1 | cut -d'"' -f4)

  echo ""
  echo "  📊 Información de la cuenta:"
  echo "     User ID: $USER_ID"
  echo "     Email: $EMAIL"
  echo "     Site: $SITE_ID"
else
  echo -e "${RED}❌ Access Token inválido${NC}"
  echo "   HTTP Code: $HTTP_CODE"
  echo "   Response: $BODY"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏪 TEST 2: Validar Configuración de Marketplace"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -z "$MERCADOPAGO_MARKETPLACE_ID" ] || [ "$MERCADOPAGO_MARKETPLACE_ID" = "your-marketplace-id-here" ]; then
  echo -e "${YELLOW}⚠️  MERCADOPAGO_MARKETPLACE_ID no configurado${NC}"
  echo "   Configura el marketplace en: https://www.mercadopago.com.ar/developers/panel/app"
  MARKETPLACE_CONFIGURED=false
else
  echo -e "${GREEN}✅ MERCADOPAGO_MARKETPLACE_ID: $MERCADOPAGO_MARKETPLACE_ID${NC}"
  MARKETPLACE_CONFIGURED=true
fi

if [ -z "$MERCADOPAGO_APPLICATION_ID" ] || [ "$MERCADOPAGO_APPLICATION_ID" = "your-app-id-here" ]; then
  echo -e "${YELLOW}⚠️  MERCADOPAGO_APPLICATION_ID no configurado${NC}"
  MARKETPLACE_CONFIGURED=false
else
  echo -e "${GREEN}✅ MERCADOPAGO_APPLICATION_ID: $MERCADOPAGO_APPLICATION_ID${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💳 TEST 3: Crear Preference de Prueba (Split Payment)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$MARKETPLACE_CONFIGURED" = true ]; then
  # Crear una preference de prueba con split
  # Nota: Necesitamos un collector_id válido para testear esto
  # Por ahora solo verificamos que el endpoint responda

  TEST_PREFERENCE='{
    "items": [
      {
        "title": "Test Marketplace Split",
        "quantity": 1,
        "unit_price": 100
      }
    ],
    "marketplace": "'$MERCADOPAGO_MARKETPLACE_ID'",
    "marketplace_fee": 10
  }'

  PREF_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "https://api.mercadopago.com/checkout/preferences" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$TEST_PREFERENCE")

  PREF_HTTP_CODE=$(echo "$PREF_RESPONSE" | tail -n 1)
  PREF_BODY=$(echo "$PREF_RESPONSE" | sed '$d')

  if [ "$PREF_HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✅ Preference con marketplace creada exitosamente${NC}"

    PREF_ID=$(echo "$PREF_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Preference ID: $PREF_ID"
  else
    # Error esperado si no hay collector_id, pero al menos validamos el formato
    ERROR_MSG=$(echo "$PREF_BODY" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

    if echo "$ERROR_MSG" | grep -q "collector_id"; then
      echo -e "${YELLOW}⚠️  Preference falló (esperado sin collector_id)${NC}"
      echo "   Para split payment real, necesitas un seller con onboarding completo"
    else
      echo -e "${RED}❌ Error inesperado al crear preference${NC}"
      echo "   HTTP Code: $PREF_HTTP_CODE"
      echo "   Message: $ERROR_MSG"
    fi
  fi
else
  echo -e "${YELLOW}⚠️  Saltando test de preference (marketplace no configurado)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$HTTP_CODE" -eq 200 ] && [ "$MARKETPLACE_CONFIGURED" = true ]; then
  echo -e "${GREEN}✅ Todas las validaciones pasaron${NC}"
  echo ""
  echo "Próximos pasos:"
  echo "1. Asegúrate que los sellers completen onboarding MP"
  echo "2. Actualiza los cars con owner_mp_collector_id"
  echo "3. Testea el flujo completo de reserva con split"
  echo ""
  exit 0
elif [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${YELLOW}⚠️  Access token válido pero marketplace no configurado${NC}"
  echo ""
  echo "Para configurar marketplace:"
  echo "1. Ve a: https://www.mercadopago.com.ar/developers/panel/app"
  echo "2. Selecciona tu aplicación"
  echo "3. Activa 'Marketplace' y obtén los IDs"
  echo "4. Actualiza .env.local con los valores"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Validación falló${NC}"
  echo ""
  exit 1
fi
