#!/bin/bash
# ============================================================================
# Llenar Secrets de Cursor Automáticamente con Valores Encontrados
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
echo "🔐 Llenando Secrets para Cursor"
echo "========================================"
echo ""

# Valores conocidos
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
SUPABASE_PROJECT_REF="obxvffplochgeiclibng"

# Intentar obtener ANON_KEY desde diagnose-supabase.sh
ANON_KEY_FOUND=""
if [ -f "tools/diagnose-supabase.sh" ]; then
  ANON_KEY_FOUND=$(grep -o 'ANON_KEY="[^"]*"' tools/diagnose-supabase.sh 2>/dev/null | cut -d'"' -f2 || echo "")
fi

# Intentar obtener desde env.js
if [ -z "$ANON_KEY_FOUND" ] && [ -f "apps/web/public/env.js" ]; then
  ANON_KEY_FOUND=$(grep -o '"NG_APP_SUPABASE_ANON_KEY": "[^"]*"' apps/web/public/env.js 2>/dev/null | cut -d'"' -f4 || echo "")
  # Verificar que sea del proyecto correcto
  if [[ "$ANON_KEY_FOUND" == *"pisqjmoklivzpwufhscx"* ]]; then
    echo -e "${YELLOW}⚠️  Clave encontrada pero es de otro proyecto${NC}"
    ANON_KEY_FOUND=""
  fi
fi

# Crear archivo actualizado
OUTPUT_FILE="cursor-secrets-filled.txt"

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
EOF

if [ -n "$ANON_KEY_FOUND" ]; then
  cat >> "$OUTPUT_FILE" << EOF
Secret value: ${ANON_KEY_FOUND}

✅ Valor encontrado automáticamente
EOF
else
  cat >> "$OUTPUT_FILE" << EOF
Secret value: [OBTENER DESDE SUPABASE DASHBOARD]

📋 Cómo obtener:
   1. Ve a: https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/settings/api
   2. Copia la clave "anon / public" (comienza con eyJ...)
   3. Pega aquí arriba en "Secret value"
EOF
fi

cat >> "$OUTPUT_FILE" << EOF

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
   ✅ NG_APP_SUPABASE_URL (ya tienes el valor arriba)
EOF

if [ -n "$ANON_KEY_FOUND" ]; then
  cat >> "$OUTPUT_FILE" << EOF
   ✅ NG_APP_SUPABASE_ANON_KEY (valor encontrado arriba)
EOF
else
  cat >> "$OUTPUT_FILE" << EOF
   ⏳ NG_APP_SUPABASE_ANON_KEY (obtener de Supabase)
EOF
fi

cat >> "$OUTPUT_FILE" << EOF
   ⏳ NG_APP_MAPBOX_ACCESS_TOKEN (obtener de Mapbox)
   ⏭️  NG_APP_PAYPAL_CLIENT_ID (opcional)

3. Verificar que funcionan:
   npm run dev
   # Debería iniciar sin errores de configuración

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

echo -e "${GREEN}✅ Archivo actualizado: ${BOLD}$OUTPUT_FILE${NC}"
echo ""

if [ -n "$ANON_KEY_FOUND" ]; then
  echo -e "${GREEN}✅ ANON_KEY encontrado automáticamente${NC}"
  echo ""
  echo "Valores listos para copiar:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. NG_APP_SUPABASE_URL"
  echo "   Valor: $SUPABASE_URL"
  echo ""
  echo "2. NG_APP_SUPABASE_ANON_KEY"
  echo "   Valor: ${ANON_KEY_FOUND:0:50}..."
  echo ""
else
  echo -e "${YELLOW}⚠️  ANON_KEY no encontrado - necesitas obtenerlo manualmente${NC}"
fi

echo ""
echo -e "${CYAN}💡 TIP:${NC} Revisa el archivo $OUTPUT_FILE para todos los valores"
echo ""


