#!/bin/bash
# ==============================================================================
# Configure Supabase Edge Function Secrets
# ==============================================================================
# Este script configura los secrets necesarios para las edge functions
# Ejecutar: ./scripts/configure-supabase-secrets.sh [environment]
# Environments: development | staging | production
# ==============================================================================

set -e

ENVIRONMENT=${1:-development}

echo "🔧 Configurando secrets de Supabase para: $ENVIRONMENT"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
  echo "Uso: ./scripts/configure-supabase-secrets.sh [environment]"
  echo ""
  echo "Environments disponibles:"
  echo "  development  - Configura secrets para desarrollo local (default)"
  echo "  staging      - Configura secrets para staging"
  echo "  production   - Configura secrets para producción"
  echo ""
  echo "Ejemplos:"
  echo "  ./scripts/configure-supabase-secrets.sh development"
  echo "  ./scripts/configure-supabase-secrets.sh production"
  echo ""
}

# Verificar que npx esté disponible
if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ Error: npx no está instalado${NC}"
  echo "Instala Node.js y npm primero"
  exit 1
fi

# Verificar autenticación
echo -e "${YELLOW}📋 Verificando autenticación con Supabase...${NC}"
if ! npx supabase status &> /dev/null; then
  echo -e "${YELLOW}⚠️  No estás autenticado con Supabase${NC}"
  echo "Ejecuta: npx supabase login"
  exit 1
fi

echo -e "${GREEN}✅ Autenticación verificada${NC}"
echo ""

# Configurar FRONTEND_URL según environment
case $ENVIRONMENT in
  development)
    FRONTEND_URL="http://localhost:4200"
    echo -e "${GREEN}🔧 Configurando para DESARROLLO${NC}"
    ;;
  staging)
    FRONTEND_URL="https://staging.autorentar.com"
    echo -e "${YELLOW}🔧 Configurando para STAGING${NC}"
    ;;
  production)
    FRONTEND_URL="https://autorentar.com"
    echo -e "${RED}🔧 Configurando para PRODUCCIÓN${NC}"
    ;;
  *)
    echo -e "${RED}❌ Environment no válido: $ENVIRONMENT${NC}"
    show_help
    exit 1
    ;;
esac

echo ""
echo "FRONTEND_URL: $FRONTEND_URL"
echo ""

# Preguntar confirmación
read -p "¿Continuar con esta configuración? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Configuración cancelada"
  exit 0
fi

echo ""
echo -e "${YELLOW}📝 Configurando secrets...${NC}"
echo ""

# Configurar FRONTEND_URL
echo "1. Configurando FRONTEND_URL..."
npx supabase secrets set FRONTEND_URL="$FRONTEND_URL" 2>&1 | grep -v "Warning" || true
echo -e "${GREEN}   ✅ FRONTEND_URL configurado${NC}"
echo ""

# Listar secrets configurados (sin mostrar valores)
echo -e "${YELLOW}📋 Secrets configurados:${NC}"
npx supabase secrets list 2>&1 | grep -v "Warning" || true
echo ""

# Información adicional según environment
if [ "$ENVIRONMENT" = "production" ]; then
  echo -e "${RED}⚠️  IMPORTANTE - Producción:${NC}"
  echo "  - Verifica que MERCADOPAGO_ACCESS_TOKEN sea de producción"
  echo "  - Verifica que GOOGLE_CLIENT_SECRET sea de producción"
  echo "  - Asegúrate de haber configurado todos los secrets requeridos"
  echo ""
fi

echo -e "${GREEN}✅ Configuración completada${NC}"
echo ""
echo "Para verificar los secrets configurados:"
echo "  npx supabase secrets list"
echo ""
echo "Para configurar otros secrets manualmente:"
echo "  npx supabase secrets set SECRET_NAME=value"
echo ""

# Mostrar secrets requeridos por las edge functions
echo -e "${YELLOW}📋 Secrets requeridos por las edge functions:${NC}"
echo ""
echo "🔹 google-calendar-oauth:"
echo "   - FRONTEND_URL (✅ configurado)"
echo "   - GOOGLE_CLIENT_ID"
echo "   - GOOGLE_CLIENT_SECRET"
echo ""
echo "🔹 sync-booking-to-calendar:"
echo "   - FRONTEND_URL (✅ configurado)"
echo ""
echo "🔹 mercadopago-*:"
echo "   - MERCADOPAGO_ACCESS_TOKEN"
echo "   - FRONTEND_URL (✅ configurado)"
echo ""
echo "Para configurar los secrets faltantes:"
echo "  npx supabase secrets set GOOGLE_CLIENT_ID=your-client-id"
echo "  npx supabase secrets set GOOGLE_CLIENT_SECRET=your-client-secret"
echo "  npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=your-token"
echo ""
