#!/bin/bash
# ============================================================================
# Configurar Cursor Automáticamente
# Intenta configurar secrets y runtime configuration
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
echo "⚙️  Configuración Automática de Cursor"
echo "========================================"
echo ""

# Valores conocidos
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU"

# Crear directorio .cursor si no existe
mkdir -p .cursor

# Crear archivo de configuración de runtime
RUNTIME_CONFIG=".cursor/runtime-config.json"
cat > "$RUNTIME_CONFIG" << EOF
{
  "installScript": "npm run install",
  "startScript": "npm run dev",
  "defaultTerminals": []
}
EOF

echo -e "${GREEN}✅ Runtime Configuration creada:${NC} $RUNTIME_CONFIG"
echo ""
cat "$RUNTIME_CONFIG"
echo ""

# Crear archivo de secrets (formato para referencia)
SECRETS_CONFIG=".cursor/secrets-config.json"
cat > "$SECRETS_CONFIG" << EOF
{
  "secrets": [
    {
      "name": "NG_APP_SUPABASE_URL",
      "value": "${SUPABASE_URL}",
      "description": "Supabase project URL"
    },
    {
      "name": "NG_APP_SUPABASE_ANON_KEY",
      "value": "${ANON_KEY}",
      "description": "Supabase anonymous key for client-side"
    },
    {
      "name": "NG_APP_MAPBOX_ACCESS_TOKEN",
      "value": "[OBTENER DESDE MAPBOX DASHBOARD]",
      "description": "Mapbox access token for maps",
      "required": true,
      "instructions": "Obtener desde: https://account.mapbox.com/access-tokens/"
    },
    {
      "name": "NG_APP_PAYPAL_CLIENT_ID",
      "value": "[OPCIONAL]",
      "description": "PayPal client ID (optional)",
      "required": false
    }
  ]
}
EOF

echo -e "${GREEN}✅ Secrets Configuration creada:${NC} $SECRETS_CONFIG"
echo ""
echo -e "${CYAN}📋 Nota:${NC} Los secrets deben configurarse manualmente en la interfaz de Cursor"
echo "   Usa este archivo como referencia para los valores"
echo ""

# Crear script helper para copiar valores
HELPER_SCRIPT=".cursor/copy-secrets.sh"
cat > "$HELPER_SCRIPT" << 'HELPER_EOF'
#!/bin/bash
# Helper script para copiar secrets al portapapeles (si está disponible)

echo "🔐 Secrets para Cursor:"
echo ""
echo "1. NG_APP_SUPABASE_URL"
echo "   Valor: https://obxvffplochgeiclibng.supabase.co"
echo ""
echo "2. NG_APP_SUPABASE_ANON_KEY"
echo "   Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU"
echo ""
echo "3. NG_APP_MAPBOX_ACCESS_TOKEN"
echo "   Valor: [OBTENER DESDE MAPBOX]"
echo ""

# Intentar copiar al portapapeles si xclip o pbcopy están disponibles
if command -v xclip &> /dev/null; then
  echo "💡 Usa: xclip -selection clipboard para copiar valores"
elif command -v pbcopy &> /dev/null; then
  echo "💡 Usa: pbcopy para copiar valores"
fi
HELPER_EOF

chmod +x "$HELPER_SCRIPT"
echo -e "${GREEN}✅ Helper script creado:${NC} $HELPER_SCRIPT"
echo ""

# Resumen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BOLD}RESUMEN:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Archivos creados:"
echo "   1. $RUNTIME_CONFIG (Runtime Configuration)"
echo "   2. $SECRETS_CONFIG (Secrets Reference)"
echo "   3. $HELPER_SCRIPT (Helper script)"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. Runtime Configuration:"
echo "   - Cursor debería detectar automáticamente $RUNTIME_CONFIG"
echo "   - O copia manualmente los valores a la interfaz:"
echo "     • Install Script: npm run install"
echo "     • Start Script: npm run dev"
echo ""
echo "2. Secrets:"
echo "   - Abre la sección 'Secrets' en Cursor"
echo "   - Copia cada secret desde $SECRETS_CONFIG"
echo "   - O ejecuta: cat $SECRETS_CONFIG"
echo ""
echo -e "${YELLOW}⚠️  Nota:${NC} Cursor puede requerir configuración manual en la interfaz"
echo "   Los archivos JSON son para referencia y documentación"
echo ""

echo -e "${GREEN}✅ Configuración completada! 🎉${NC}"

