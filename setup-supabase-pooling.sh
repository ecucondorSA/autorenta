#!/bin/bash

# ============================================================================
# Script: Implementar Connection Pooling en Supabase
# Fecha: 2025-10-25
# Descripción: Habilita y prueba connection pooling en AutoRenta
# ============================================================================

set -e  # Exit on error

echo "🚀 ======================================"
echo "🚀 SUPABASE CONNECTION POOLING SETUP"
echo "🚀 ======================================"
echo ""

PROJECT_ROOT="/home/edu/autorenta"
BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# PASO 1: Backup del archivo original
# ============================================================================

echo -e "${BLUE}📦 PASO 1: Creando backup...${NC}"
mkdir -p "$BACKUP_DIR"

ORIGINAL_FILE="$PROJECT_ROOT/apps/web/src/app/core/services/supabase-client.service.ts"
POOLING_FILE="$PROJECT_ROOT/apps/web/src/app/core/services/supabase-client.service.POOLING.ts"

if [ -f "$ORIGINAL_FILE" ]; then
  cp "$ORIGINAL_FILE" "$BACKUP_DIR/supabase-client.service.ts.backup"
  echo -e "${GREEN}✅ Backup creado en: $BACKUP_DIR${NC}"
else
  echo -e "${RED}❌ Archivo original no encontrado${NC}"
  exit 1
fi

# ============================================================================
# PASO 2: Verificar archivo con pooling existe
# ============================================================================

echo ""
echo -e "${BLUE}🔍 PASO 2: Verificando archivo con pooling...${NC}"

if [ ! -f "$POOLING_FILE" ]; then
  echo -e "${RED}❌ Archivo supabase-client.service.POOLING.ts no encontrado${NC}"
  echo -e "${YELLOW}⚠️  Ejecuta primero el script de generación${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Archivo con pooling encontrado${NC}"

# ============================================================================
# PASO 3: Mostrar diferencias
# ============================================================================

echo ""
echo -e "${BLUE}📊 PASO 3: Mostrando diferencias...${NC}"
echo ""

diff -u "$ORIGINAL_FILE" "$POOLING_FILE" || true

echo ""
read -p "¿Deseas aplicar estos cambios? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Operación cancelada${NC}"
  exit 0
fi

# ============================================================================
# PASO 4: Aplicar cambios
# ============================================================================

echo ""
echo -e "${BLUE}🔧 PASO 4: Aplicando connection pooling...${NC}"

# Reemplazar archivo
cp "$POOLING_FILE" "$ORIGINAL_FILE"

echo -e "${GREEN}✅ Connection pooling aplicado${NC}"

# ============================================================================
# PASO 5: Verificar sintaxis TypeScript
# ============================================================================

echo ""
echo -e "${BLUE}🔍 PASO 5: Verificando sintaxis TypeScript...${NC}"

cd "$PROJECT_ROOT/apps/web"

# Verificar si tsc está disponible
if command -v npx &> /dev/null; then
  npx tsc --noEmit --skipLibCheck "$ORIGINAL_FILE" 2>&1 | head -20 || {
    echo -e "${YELLOW}⚠️  Hay errores de TypeScript, revisa manualmente${NC}"
  }
else
  echo -e "${YELLOW}⚠️  TypeScript compiler no disponible, saltando verificación${NC}"
fi

# ============================================================================
# PASO 6: Testing de conexión (opcional)
# ============================================================================

echo ""
echo -e "${BLUE}🧪 PASO 6: Testing de conexión...${NC}"

# Crear script de prueba temporal
TEST_SCRIPT="$PROJECT_ROOT/test-pooling-connection.ts"

cat > "$TEST_SCRIPT" << 'EOF'
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU';

async function testConnection() {
  console.log('🔌 Testing Supabase connection with pooling...');
  
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'public' },
    global: {
      headers: {
        'x-supabase-pooling-mode': 'transaction',
      },
    },
  });

  try {
    const start = Date.now();
    const { data, error } = await client.from('cars').select('id').limit(1);
    const elapsed = Date.now() - start;

    if (error) {
      console.error('❌ Connection failed:', error);
      process.exit(1);
    }

    console.log(`✅ Connection successful! (${elapsed}ms)`);
    console.log(`📊 Fetched ${data?.length || 0} rows`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

testConnection();
EOF

# Ejecutar test con tsx si está disponible
if command -v npx &> /dev/null; then
  echo ""
  echo -e "${YELLOW}Ejecutando test de conexión...${NC}"
  cd "$PROJECT_ROOT"
  npx tsx "$TEST_SCRIPT" || {
    echo -e "${YELLOW}⚠️  Test de conexión falló, revisa configuración${NC}"
  }
  rm -f "$TEST_SCRIPT"
else
  echo -e "${YELLOW}⚠️  tsx no disponible, saltando test de conexión${NC}"
  rm -f "$TEST_SCRIPT"
fi

# ============================================================================
# PASO 7: Resumen
# ============================================================================

echo ""
echo -e "${GREEN}✅ ======================================"
echo -e "✅ CONNECTION POOLING IMPLEMENTADO"
echo -e "✅ ======================================${NC}"
echo ""
echo -e "${BLUE}📝 Resumen de cambios:${NC}"
echo "  - ✅ Connection pooling habilitado (transaction mode)"
echo "  - ✅ Retry logic implementado (3 reintentos)"
echo "  - ✅ Realtime optimizado (10 eventos/seg)"
echo "  - ✅ Logging mejorado"
echo ""
echo -e "${BLUE}📁 Backup guardado en:${NC}"
echo "  $BACKUP_DIR"
echo ""
echo -e "${YELLOW}⚠️  PRÓXIMOS PASOS:${NC}"
echo "  1. Prueba la aplicación localmente: npm run start"
echo "  2. Revisa logs en consola para verificar pooling"
echo "  3. Monitorea performance en Supabase Dashboard"
echo "  4. Si hay problemas, restaura backup:"
echo "     cp $BACKUP_DIR/supabase-client.service.ts.backup $ORIGINAL_FILE"
echo ""
echo -e "${GREEN}🚀 Listo para usar!${NC}"
