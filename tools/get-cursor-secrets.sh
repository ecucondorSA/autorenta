#!/bin/bash
# ============================================================================
# Obtener Secrets de GitHub y Mostrarlos para Cursor
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "========================================"
echo "🔐 Secrets para Cursor - AutoRenta"
echo "========================================"
echo ""

# Verificar GitHub CLI
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI no está instalado"
  exit 1
fi

# Valores conocidos
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"

echo "📋 SECRETS ESENCIALES:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. NG_APP_SUPABASE_URL (valor conocido)
echo -e "${CYAN}1. NG_APP_SUPABASE_URL${NC}"
echo "   Secret Name: NG_APP_SUPABASE_URL"
echo "   Secret Value: $SUPABASE_URL"
echo ""

# 2. NG_APP_SUPABASE_ANON_KEY
echo -e "${CYAN}2. NG_APP_SUPABASE_ANON_KEY${NC}"
echo "   Secret Name: NG_APP_SUPABASE_ANON_KEY"
echo -n "   Secret Value: "
ANON_KEY=$(gh secret get NG_APP_SUPABASE_ANON_KEY 2>/dev/null || gh secret get SUPABASE_ANON_KEY 2>/dev/null || echo "")
if [ -n "$ANON_KEY" ]; then
  echo -e "${GREEN}$ANON_KEY${NC}"
else
  echo -e "${YELLOW}[No disponible - obtener desde Supabase Dashboard]${NC}"
  echo "   URL: https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/api"
fi
echo ""

# 3. NG_APP_MAPBOX_ACCESS_TOKEN
echo -e "${CYAN}3. NG_APP_MAPBOX_ACCESS_TOKEN${NC}"
echo "   Secret Name: NG_APP_MAPBOX_ACCESS_TOKEN"
echo -n "   Secret Value: "
MAPBOX_TOKEN=$(gh secret get MAPBOX_ACCESS_TOKEN 2>/dev/null || echo "")
if [ -n "$MAPBOX_TOKEN" ]; then
  echo -e "${GREEN}$MAPBOX_TOKEN${NC}"
else
  echo -e "${YELLOW}[No disponible - obtener desde Mapbox Dashboard]${NC}"
  echo "   URL: https://account.mapbox.com/access-tokens/"
fi
echo ""

# 4. NG_APP_PAYPAL_CLIENT_ID (opcional)
echo -e "${CYAN}4. NG_APP_PAYPAL_CLIENT_ID (Opcional)${NC}"
echo "   Secret Name: NG_APP_PAYPAL_CLIENT_ID"
echo "   Secret Value: [Opcional - solo si usas PayPal]"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 INSTRUCCIONES:"
echo ""
echo "1. Copia cada 'Secret Name' y 'Secret Value' de arriba"
echo "2. Pega en la interfaz de Cursor Secrets:"
echo "   - Secret name: [pegar nombre]"
echo "   - Secret value: [pegar valor]"
echo "   - Click en 'Create'"
echo ""
echo "3. Repite para cada secret"
echo ""


