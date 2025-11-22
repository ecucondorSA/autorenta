#!/bin/bash
# ============================================================================
# Setup Cursor Secrets - Formato Automático para Copiar/Pegar
# Genera un formato listo para configurar en Cursor
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
echo "🔐 Configuración Automática de Secrets"
echo "========================================"
echo ""

# Valores conocidos del proyecto
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
SUPABASE_PROJECT_REF="obxvffplochgeiclibng"

# Crear archivo de salida
OUTPUT_FILE="cursor-secrets-ready.txt"

cat > "$OUTPUT_FILE" << EOF
========================================
SECRETS PARA CURSOR - AutoRenta
========================================

Copia y pega cada secret en la interfaz de Cursor:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. NG_APP_SUPABASE_URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Secret name: NG_APP_SUPABASE_URL
Secret value: ${SUPABASE_URL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. NG_APP_SUPABASE_ANON_KEY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Secret name: NG_APP_SUPABASE_ANON_KEY
Secret value: [OBTENER DESDE SUPABASE DASHBOARD]

📋 Cómo obtener:
   1. Ve a: https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/settings/api
   2. Copia la clave "anon / public" (comienza con eyJ...)
   3. Pega aquí arriba en "Secret value"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. NG_APP_MAPBOX_ACCESS_TOKEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Secret name: NG_APP_MAPBOX_ACCESS_TOKEN
Secret value: [OBTENER DESDE MAPBOX DASHBOARD]

📋 Cómo obtener:
   1. Ve a: https://account.mapbox.com/access-tokens/
   2. Crea un nuevo token o copia uno existente
   3. Pega aquí arriba en "Secret value"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. NG_APP_PAYPAL_CLIENT_ID (Opcional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Secret name: NG_APP_PAYPAL_CLIENT_ID
Secret value: [OPCIONAL - Solo si usas PayPal]

📋 Cómo obtener:
   1. Ve a: https://developer.paypal.com/
   2. Crea una app o usa una existente
   3. Copia el Client ID

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCCIONES DE USO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Para cada secret arriba:
   - Copia el "Secret name"
   - Obtén el "Secret value" (sigue las instrucciones 📋)
   - Pega ambos en la interfaz de Cursor
   - Click en "Create"

2. Orden recomendado:
   ✅ NG_APP_SUPABASE_URL (ya tienes el valor)
   ✅ NG_APP_SUPABASE_ANON_KEY (obtener de Supabase)
   ✅ NG_APP_MAPBOX_ACCESS_TOKEN (obtener de Mapbox)
   ⏭️  NG_APP_PAYPAL_CLIENT_ID (opcional)

3. Verificar que funcionan:
   npm run dev
   # Debería iniciar sin errores de configuración

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

echo -e "${GREEN}✅ Archivo generado: ${BOLD}$OUTPUT_FILE${NC}"
echo ""
echo "📋 Contenido del archivo:"
echo ""
cat "$OUTPUT_FILE"
echo ""
echo -e "${CYAN}💡 TIP:${NC} Abre el archivo $OUTPUT_FILE y copia/pega cada secret"
echo ""

# Intentar abrir el archivo si hay un editor disponible
if command -v code &> /dev/null; then
  echo -e "${BLUE}📝 Abriendo archivo en VS Code...${NC}"
  code "$OUTPUT_FILE" 2>/dev/null || true
elif command -v nano &> /dev/null; then
  echo -e "${BLUE}📝 Puedes editar con: nano $OUTPUT_FILE${NC}"
fi

echo ""
echo -e "${GREEN}✅ Listo! Sigue las instrucciones en el archivo${NC}"
echo ""


