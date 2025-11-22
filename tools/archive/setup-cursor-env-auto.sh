#!/bin/bash
# ============================================================================
# Configurar .env.local automáticamente para Cursor
# Cursor puede leer variables de entorno desde .env.local automáticamente
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo "========================================"
echo "⚙️  Configuración Automática de .env.local"
echo "========================================"
echo ""

# Valores conocidos
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU"

ENV_FILE=".env.local"

# Verificar si ya existe
if [ -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}⚠️  $ENV_FILE ya existe${NC}"
  echo "¿Deseas sobrescribirlo? (y/N)"
  read -r response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Operación cancelada"
    exit 0
  fi
fi

# Crear archivo .env.local
cat > "$ENV_FILE" << EOF
# ============================================================================
# AutoRenta - Environment Variables for Local Development
# ============================================================================
# Este archivo es leído automáticamente por Angular y Cursor
# NUNCA commitear este archivo (está en .gitignore)
# ============================================================================

# Supabase Configuration
NG_APP_SUPABASE_URL=${SUPABASE_URL}
NG_APP_SUPABASE_ANON_KEY=${ANON_KEY}

# Mapbox Configuration
# ⚠️ OBTENER DESDE: https://account.mapbox.com/access-tokens/
NG_APP_MAPBOX_ACCESS_TOKEN=

# PayPal Configuration (Opcional)
# NG_APP_PAYPAL_CLIENT_ID=

# App Configuration
NG_APP_DEFAULT_CURRENCY=ARS
NG_APP_PAYMENTS_WEBHOOK_URL=http://localhost:8787/webhooks/payments
NG_APP_APP_URL=http://localhost:4200

# ============================================================================
# Notas:
# - Cursor debería detectar automáticamente estas variables
# - Si no se detectan, configúralas manualmente en la sección Secrets
# - Para Mapbox: obtener token desde https://account.mapbox.com/access-tokens/
# ============================================================================
EOF

echo -e "${GREEN}✅ Archivo $ENV_FILE creado exitosamente${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}📋 Variables configuradas:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ NG_APP_SUPABASE_URL${NC}: ${SUPABASE_URL}"
echo -e "${GREEN}✅ NG_APP_SUPABASE_ANON_KEY${NC}: ${ANON_KEY:0:50}..."
echo -e "${YELLOW}⏳ NG_APP_MAPBOX_ACCESS_TOKEN${NC}: [PENDIENTE - agregar manualmente]"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}📝 Próximos pasos:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Cursor debería detectar automáticamente .env.local"
echo "2. Si no se detectan, reinicia Cursor o recarga la ventana"
echo "3. Para Mapbox: edita .env.local y agrega:"
echo "   NG_APP_MAPBOX_ACCESS_TOKEN=tu_token_aqui"
echo ""
echo -e "${GREEN}✅ Configuración completada!${NC}"
echo ""


