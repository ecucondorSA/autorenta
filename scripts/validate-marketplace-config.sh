#!/bin/bash

# Script para validar configuración de MercadoPago Marketplace
# Uso: ./scripts/validate-marketplace-config.sh

set -e

echo "🔍 Validando configuración de MercadoPago Marketplace..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
echo "📋 VALIDACIÓN DE VARIABLES REQUERIDAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ERRORS=0
WARNINGS=0

# Función para validar variable
validate_var() {
  local var_name=$1
  local var_value=${!var_name}
  local is_critical=${2:-true}

  if [ -z "$var_value" ] || [ "$var_value" = "your-${var_name,,}-here" ]; then
    if [ "$is_critical" = true ]; then
      echo -e "${RED}❌ $var_name: NO CONFIGURADO (CRÍTICO)${NC}"
      ((ERRORS++))
    else
      echo -e "${YELLOW}⚠️  $var_name: NO CONFIGURADO (OPCIONAL)${NC}"
      ((WARNINGS++))
    fi
  else
    echo -e "${GREEN}✅ $var_name: Configurado${NC}"
  fi
}

echo ""
echo "1️⃣  Credenciales básicas de MercadoPago:"
validate_var "MERCADOPAGO_ACCESS_TOKEN" true
validate_var "MERCADOPAGO_PUBLIC_KEY" true

echo ""
echo "2️⃣  Credenciales de Test/Sandbox:"
validate_var "MERCADOPAGO_TEST_ACCESS_TOKEN" false
validate_var "MERCADOPAGO_TEST_PUBLIC_KEY" false

echo ""
echo "3️⃣  Configuración de Marketplace (Split Payment):"
validate_var "MERCADOPAGO_MARKETPLACE_ID" true
validate_var "MERCADOPAGO_APPLICATION_ID" true
validate_var "MERCADOPAGO_PLATFORM_FEE_PERCENTAGE" false

echo ""
echo "4️⃣  Configuración de Supabase:"
validate_var "SUPABASE_URL" true
validate_var "SUPABASE_SERVICE_ROLE_KEY" true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN DE VALIDACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ Todas las variables están configuradas correctamente${NC}"
  echo ""
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Hay $WARNINGS advertencias (variables opcionales no configuradas)${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Hay $ERRORS errores críticos${NC}"
  echo -e "${YELLOW}⚠️  Hay $WARNINGS advertencias${NC}"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📝 PASOS PARA CORREGIR:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. Configurar marketplace en MercadoPago:"
  echo "   https://www.mercadopago.com.ar/developers/panel/app"
  echo ""
  echo "2. Obtener credenciales:"
  echo "   - MERCADOPAGO_ACCESS_TOKEN: Panel → Credenciales → Access Token"
  echo "   - MERCADOPAGO_PUBLIC_KEY: Panel → Credenciales → Public Key"
  echo "   - MERCADOPAGO_MARKETPLACE_ID: Panel → Marketplace → ID"
  echo "   - MERCADOPAGO_APPLICATION_ID: Panel → App → Application ID"
  echo ""
  echo "3. Actualizar .env.local con los valores reales"
  echo ""
  exit 1
fi
