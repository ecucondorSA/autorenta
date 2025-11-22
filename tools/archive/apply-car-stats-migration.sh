#!/bin/bash
# ==============================================================================
# Apply car_stats Migration to Remote Supabase
# ==============================================================================
# Este script aplica la migración que crea la tabla car_stats
# Ejecutar: ./scripts/apply-car-stats-migration.sh
# ==============================================================================

set -e

echo "🔧 Aplicando migración car_stats a Supabase remoto..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que npx esté disponible
if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ Error: npx no está instalado${NC}"
  echo "Instala Node.js y npm primero"
  exit 1
fi

# Verificar autenticación
echo -e "${YELLOW}📋 Verificando autenticación con Supabase...${NC}"
if ! npx supabase status &> /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  No estás autenticado con Supabase${NC}"
  echo "Ejecuta: npx supabase login"
  exit 1
fi

echo -e "${GREEN}✅ Autenticación verificada${NC}"
echo ""

# Preguntar confirmación
echo -e "${YELLOW}⚠️  Esta operación aplicará la migración 20251114_create_missing_tables.sql${NC}"
echo ""
echo "Esto creará:"
echo "  - Tabla car_stats"
echo "  - Índices para car_stats"
echo "  - RLS policies"
echo "  - Función get_car_stats()"
echo ""
read -p "¿Continuar? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Operación cancelada"
  exit 0
fi

echo ""
echo -e "${YELLOW}📝 Aplicando migración...${NC}"
echo ""

# Aplicar migración
if npx supabase db push --include-all; then
  echo ""
  echo -e "${GREEN}✅ Migración aplicada exitosamente${NC}"
  echo ""
  echo -e "${YELLOW}📋 Verificando tabla car_stats...${NC}"
  
  # Verificar que la tabla exista
  if npx supabase db execute "SELECT COUNT(*) FROM public.car_stats" &> /dev/null; then
    echo -e "${GREEN}✅ Tabla car_stats existe y es accesible${NC}"
    
    # Mostrar stats
    echo ""
    echo -e "${YELLOW}📊 Estadísticas de car_stats:${NC}"
    npx supabase db execute "SELECT COUNT(*) as total_cars, COUNT(CASE WHEN reviews_count > 0 THEN 1 END) as cars_with_reviews FROM public.car_stats" || true
  else
    echo -e "${RED}❌ Error: No se puede acceder a la tabla car_stats${NC}"
    exit 1
  fi
else
  echo ""
  echo -e "${RED}❌ Error al aplicar la migración${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Proceso completado${NC}"
echo ""
echo "Siguientes pasos:"
echo "  1. Verifica que la aplicación web ya no muestre errores 404 para car_stats"
echo "  2. Si persisten errores, verifica los RLS policies"
echo "  3. Considera ejecutar sync:types para actualizar los tipos de TypeScript"
echo ""
echo "Comandos útiles:"
echo "  npx supabase db push                    # Aplicar todas las migraciones pendientes"
echo "  npm run sync:types                      # Regenerar tipos de TypeScript"
echo "  npx supabase db execute \"SELECT * FROM public.car_stats LIMIT 10\"  # Ver datos"
echo ""
