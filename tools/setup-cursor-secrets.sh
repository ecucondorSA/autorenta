#!/bin/bash
# ============================================================================
# Setup Cursor Secrets Automáticamente
# Obtiene secrets de GitHub y genera configuración para Cursor
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[ℹ]${NC} $*"; }
success() { echo -e "${GREEN}[✅]${NC} $*"; }
error() { echo -e "${RED}[❌]${NC} $*"; exit 1; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $*"; }
info() { echo -e "${CYAN}[📋]${NC} $*"; }

banner() {
  echo ""
  echo "========================================"
  echo "$1"
  echo "========================================"
  echo ""
}

# Valores conocidos del proyecto
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
SUPABASE_PROJECT_REF="obxvffplochgeiclibng"

banner "🔐 Setup de Secrets para Cursor"

# Verificar GitHub CLI
if ! command -v gh &> /dev/null; then
  error "GitHub CLI (gh) no está instalado"
fi

# Verificar autenticación
if ! gh auth status &> /dev/null; then
  error "GitHub CLI no está autenticado. Ejecuta: gh auth login"
fi

log "Obteniendo secrets de GitHub..."
SECRETS_LIST=$(gh secret list 2>/dev/null || echo "")

if [ -z "$SECRETS_LIST" ]; then
  warn "No se pudieron obtener secrets de GitHub"
  exit 1
fi

# Secrets esenciales para Cursor (Angular development)
declare -A CURSOR_SECRETS=(
  ["NG_APP_SUPABASE_ANON_KEY"]="Supabase Anon Key (para Angular)"
  ["NG_APP_MAPBOX_ACCESS_TOKEN"]="Mapbox Access Token (para mapas)"
  ["NG_APP_PAYPAL_CLIENT_ID"]="PayPal Client ID (opcional)"
)

# Secrets adicionales que pueden estar en GitHub
declare -A GITHUB_SECRETS=(
  ["SUPABASE_ANON_KEY"]="NG_APP_SUPABASE_ANON_KEY"
  ["MAPBOX_ACCESS_TOKEN"]="NG_APP_MAPBOX_ACCESS_TOKEN"
  ["SUPABASE_URL"]="NG_APP_SUPABASE_URL"
)

echo ""
info "Secrets encontrados en GitHub:"
echo "$SECRETS_LIST" | head -20
echo ""

# Función para obtener valor de secret (solo funciona si tienes permisos)
get_secret_value() {
  local secret_name=$1
  # Intentar obtener el valor (puede fallar si no tienes permisos)
  gh secret get "$secret_name" 2>/dev/null || echo ""
}

# Generar archivo de configuración
OUTPUT_FILE="cursor-secrets-config.txt"
echo "" > "$OUTPUT_FILE"
echo "# ========================================" >> "$OUTPUT_FILE"
echo "# Secrets para Cursor - AutoRenta" >> "$OUTPUT_FILE"
echo "# Generado: $(date)" >> "$OUTPUT_FILE"
echo "# ========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "# INSTRUCCIONES:" >> "$OUTPUT_FILE"
echo "# 1. Copia cada par Secret Name / Secret Value" >> "$OUTPUT_FILE"
echo "# 2. Pega en la interfaz de Cursor Secrets" >> "$OUTPUT_FILE"
echo "# 3. Click en 'Create' para cada secret" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Procesar secrets esenciales
banner "📋 Secrets Esenciales para Cursor"

FOUND_COUNT=0
MISSING_COUNT=0

for cursor_secret in "${!CURSOR_SECRETS[@]}"; do
  description="${CURSOR_SECRETS[$cursor_secret]}"
  
  # Buscar en GitHub secrets
  GITHUB_NAME=""
  if [[ "$cursor_secret" == "NG_APP_SUPABASE_ANON_KEY" ]]; then
    # Puede estar como SUPABASE_ANON_KEY o NG_APP_SUPABASE_ANON_KEY
    if echo "$SECRETS_LIST" | grep -q "NG_APP_SUPABASE_ANON_KEY"; then
      GITHUB_NAME="NG_APP_SUPABASE_ANON_KEY"
    elif echo "$SECRETS_LIST" | grep -q "SUPABASE_ANON_KEY"; then
      GITHUB_NAME="SUPABASE_ANON_KEY"
    fi
  elif [[ "$cursor_secret" == "NG_APP_MAPBOX_ACCESS_TOKEN" ]]; then
    if echo "$SECRETS_LIST" | grep -q "MAPBOX_ACCESS_TOKEN"; then
      GITHUB_NAME="MAPBOX_ACCESS_TOKEN"
    fi
  fi
  
  if [ -n "$GITHUB_NAME" ]; then
    log "✅ Encontrado: $cursor_secret"
    echo "" >> "$OUTPUT_FILE"
    echo "# $description" >> "$OUTPUT_FILE"
    echo "Secret Name: $cursor_secret" >> "$OUTPUT_FILE"
    echo "Secret Value: [Obtener de GitHub: gh secret get $GITHUB_NAME]" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    ((FOUND_COUNT++))
  else
    warn "⚠️  No encontrado: $cursor_secret"
    echo "" >> "$OUTPUT_FILE"
    echo "# $description" >> "$OUTPUT_FILE"
    echo "Secret Name: $cursor_secret" >> "$OUTPUT_FILE"
    echo "Secret Value: [CONFIGURAR MANUALMENTE]" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    ((MISSING_COUNT++))
  fi
done

# Agregar valores conocidos
echo "" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "# VALORES CONOCIDOS DEL PROYECTO" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "Secret Name: NG_APP_SUPABASE_URL" >> "$OUTPUT_FILE"
echo "Secret Value: $SUPABASE_URL" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

success "Configuración generada en: $OUTPUT_FILE"
echo ""

# Mostrar resumen
banner "📊 Resumen"

echo "Secrets encontrados: $FOUND_COUNT"
echo "Secrets a configurar manualmente: $MISSING_COUNT"
echo ""

if [ $MISSING_COUNT -gt 0 ]; then
  warn "Algunos secrets necesitan configuración manual:"
  echo ""
  echo "1. NG_APP_SUPABASE_ANON_KEY:"
  echo "   Obtener desde: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/api"
  echo "   O desde GitHub: gh secret get SUPABASE_ANON_KEY"
  echo ""
  echo "2. NG_APP_MAPBOX_ACCESS_TOKEN:"
  echo "   Obtener desde: https://account.mapbox.com/access-tokens/"
  echo "   O desde GitHub: gh secret get MAPBOX_ACCESS_TOKEN"
  echo ""
fi

# Generar script de ayuda para obtener valores
HELPER_SCRIPT="get-secret-values.sh"
cat > "$HELPER_SCRIPT" << 'EOF'
#!/bin/bash
# Script helper para obtener valores de secrets de GitHub

echo "🔐 Obteniendo valores de secrets de GitHub..."
echo ""

# Supabase Anon Key
echo "1. NG_APP_SUPABASE_ANON_KEY:"
gh secret get SUPABASE_ANON_KEY 2>/dev/null || gh secret get NG_APP_SUPABASE_ANON_KEY 2>/dev/null || echo "   ⚠️  No disponible"
echo ""

# Mapbox Token
echo "2. NG_APP_MAPBOX_ACCESS_TOKEN:"
gh secret get MAPBOX_ACCESS_TOKEN 2>/dev/null || echo "   ⚠️  No disponible"
echo ""

# Supabase URL (valor conocido)
echo "3. NG_APP_SUPABASE_URL:"
echo "   https://obxvffplochgeiclibng.supabase.co"
echo ""
EOF

chmod +x "$HELPER_SCRIPT"
success "Script helper creado: $HELPER_SCRIPT"
echo ""

# Mostrar siguiente paso
banner "🚀 Próximos Pasos"

echo "1. Revisar archivo generado:"
echo "   cat $OUTPUT_FILE"
echo ""
echo "2. Obtener valores de secrets (si tienes permisos):"
echo "   ./$HELPER_SCRIPT"
echo ""
echo "3. O configurar manualmente desde:"
echo "   - Supabase: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/api"
echo "   - Mapbox: https://account.mapbox.com/access-tokens/"
echo ""
echo "4. Copiar y pegar en la interfaz de Cursor Secrets"
echo ""

success "Setup completado! 🎉"


