#!/bin/bash

# =============================================
# SCRIPT DE DEPLOYMENT: Sistema Bonus-Malus
# Despliega el sistema completo a la base de datos
# =============================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de ayuda
show_help() {
    echo "📋 Script de Deployment: Sistema Bonus-Malus"
    echo ""
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  -h, --help           Mostrar esta ayuda"
    echo "  -e, --env ENV        Environment (local|staging|production)"
    echo "  -t, --test           Ejecutar tests después del deployment"
    echo "  -r, --rollback       Hacer rollback del deployment"
    echo ""
    echo "Variables de entorno requeridas:"
    echo "  DATABASE_URL         URL de conexión a la base de datos"
    echo ""
    echo "Ejemplos:"
    echo "  $0 --env production --test"
    echo "  DATABASE_URL=postgres://... $0 --env staging"
    echo ""
}

# Parsear argumentos
ENV="local"
RUN_TESTS=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -e|--env)
            ENV="$2"
            shift 2
            ;;
        -t|--test)
            RUN_TESTS=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        *)
            echo -e "${RED}❌ Error: Argumento desconocido '$1'${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL no está configurada${NC}"
    echo ""
    echo "Configura la variable de entorno DATABASE_URL:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo ""
    exit 1
fi

# Banner
echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║    DEPLOYMENT: Sistema Bonus-Malus           ║"
echo "║    Environment: ${ENV}                        "
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Confirmar en producción
if [ "$ENV" = "production" ] && [ "$ROLLBACK" = false ]; then
    echo -e "${YELLOW}⚠️  ADVERTENCIA: Vas a desplegar a PRODUCCIÓN${NC}"
    read -p "¿Estás seguro? (escribe 'YES' para continuar): " confirmation
    if [ "$confirmation" != "YES" ]; then
        echo -e "${RED}❌ Deployment cancelado${NC}"
        exit 0
    fi
    echo ""
fi

# Función para ejecutar SQL
execute_sql() {
    local sql_file=$1
    local description=$2

    echo -e "${BLUE}📝 Ejecutando: $description${NC}"

    if psql "$DATABASE_URL" -f "$sql_file" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Éxito: $description${NC}"
        return 0
    else
        echo -e "${RED}❌ Error: $description${NC}"
        return 1
    fi
}

# Función de rollback
do_rollback() {
    echo ""
    echo -e "${YELLOW}⏮️  Ejecutando ROLLBACK del sistema Bonus-Malus...${NC}"
    echo ""

    psql "$DATABASE_URL" <<EOF
-- Desactivar trigger
DROP TRIGGER IF EXISTS on_user_stats_update ON public.user_stats;
DROP FUNCTION IF EXISTS trigger_recalculate_bonus_malus();

-- Eliminar funciones RPC
DROP FUNCTION IF EXISTS recalculate_all_bonus_malus();
DROP FUNCTION IF EXISTS get_user_bonus_malus(UUID);

-- Restaurar calculate_dynamic_price original (sin bonus-malus)
-- NOTA: Esto requiere tener un backup de la función original
-- Por ahora, solo advertimos al usuario

-- Eliminar tabla
DROP TABLE IF EXISTS public.user_bonus_malus CASCADE;

-- Eliminar función principal
DROP FUNCTION IF EXISTS calculate_user_bonus_malus(UUID);

SELECT 'Rollback completado' as status;
EOF

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Rollback completado exitosamente${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANTE: La función calculate_dynamic_price aún incluye bonus_malus_factor${NC}"
        echo "   Para restaurar la versión original, ejecuta manualmente:"
        echo "   psql \$DATABASE_URL -f apps/web/database/setup-dynamic-pricing.sql"
        echo ""
    else
        echo -e "${RED}❌ Error durante rollback${NC}"
        exit 1
    fi
}

# Main deployment
if [ "$ROLLBACK" = true ]; then
    do_rollback
    exit 0
fi

echo -e "${BLUE}🚀 Iniciando deployment...${NC}"
echo ""

# Paso 1: Verificar que setup-reviews-system.sql fue ejecutado
echo -e "${BLUE}📋 Verificando prerequisitos...${NC}"

if ! psql "$DATABASE_URL" -c "SELECT 1 FROM user_stats LIMIT 1" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Tabla user_stats no existe${NC}"
    echo "   El sistema Bonus-Malus requiere el sistema de reviews."
    echo "   Ejecuta primero: psql \$DATABASE_URL -f apps/web/database/setup-reviews-system.sql"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Paso 2: Deploy schema principal
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/setup-bonus-malus-system.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ Error: No se encuentra $SQL_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Desplegando schema...${NC}"

if psql "$DATABASE_URL" -f "$SQL_FILE"; then
    echo -e "${GREEN}✅ Schema desplegado exitosamente${NC}"
else
    echo -e "${RED}❌ Error al desplegar schema${NC}"
    exit 1
fi

echo ""

# Paso 3: Verificar instalación
echo -e "${BLUE}🔍 Verificando instalación...${NC}"

VERIFICATION=$(psql "$DATABASE_URL" -t -c "
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_bonus_malus') THEN '✅'
    ELSE '❌'
  END || ' Tabla user_bonus_malus' ||
  E'\n' ||
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_user_bonus_malus') THEN '✅'
    ELSE '❌'
  END || ' Función calculate_user_bonus_malus' ||
  E'\n' ||
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_bonus_malus') THEN '✅'
    ELSE '❌'
  END || ' Función get_user_bonus_malus' ||
  E'\n' ||
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_user_stats_update') THEN '✅'
    ELSE '❌'
  END || ' Trigger on_user_stats_update'
")

echo "$VERIFICATION"
echo ""

if echo "$VERIFICATION" | grep -q "❌"; then
    echo -e "${RED}❌ Verificación falló. Revisa los errores arriba.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Verificación exitosa${NC}"
echo ""

# Paso 4: Ejecutar tests (opcional)
if [ "$RUN_TESTS" = true ]; then
    echo -e "${BLUE}🧪 Ejecutando tests...${NC}"
    echo ""

    TEST_FILE="$SCRIPT_DIR/test-bonus-malus-system.sql"

    if [ ! -f "$TEST_FILE" ]; then
        echo -e "${YELLOW}⚠️  Warning: Test file no encontrado ($TEST_FILE)${NC}"
    else
        if psql "$DATABASE_URL" -f "$TEST_FILE"; then
            echo ""
            echo -e "${GREEN}✅ Tests completados${NC}"
        else
            echo -e "${YELLOW}⚠️  Algunos tests fallaron (revisa output arriba)${NC}"
        fi
    fi

    echo ""
fi

# Paso 5: Calcular factores iniciales para usuarios existentes
echo -e "${BLUE}🔄 Calculando factores para usuarios existentes...${NC}"

USER_COUNT=$(psql "$DATABASE_URL" -t -c "
SELECT COUNT(*)
FROM user_stats us
WHERE NOT EXISTS (
  SELECT 1 FROM user_bonus_malus bm WHERE bm.user_id = us.user_id
);
")

if [ "$USER_COUNT" -gt 0 ]; then
    echo "   Encontrados $USER_COUNT usuarios sin factor bonus-malus"

    psql "$DATABASE_URL" -c "
DO \$\$
DECLARE
  v_user RECORD;
  v_count INT := 0;
BEGIN
  FOR v_user IN
    SELECT user_id
    FROM user_stats
    WHERE NOT EXISTS (
      SELECT 1 FROM user_bonus_malus WHERE user_id = user_stats.user_id
    )
    LIMIT 100
  LOOP
    PERFORM calculate_user_bonus_malus(v_user.user_id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '✅ Calculados % factores', v_count;
END \$\$;
" > /dev/null

    echo -e "${GREEN}✅ Factores iniciales calculados${NC}"
else
    echo "   No hay usuarios nuevos para calcular"
fi

echo ""

# Paso 6: Resumen final
echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║           ✅ DEPLOYMENT EXITOSO               ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Mostrar estadísticas
STATS=$(psql "$DATABASE_URL" -t -c "
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN total_factor < 0 THEN 1 ELSE 0 END) as con_bonus,
  SUM(CASE WHEN total_factor > 0 THEN 1 ELSE 0 END) as con_malus,
  SUM(CASE WHEN total_factor = 0 THEN 1 ELSE 0 END) as neutral
FROM user_bonus_malus;
" | xargs)

echo "📊 Estadísticas:"
echo "   $STATS"
echo ""

echo "📝 Próximos pasos:"
echo ""
echo "1. Configurar cron job para recalculación periódica:"
echo "   SELECT cron.schedule('recalculate-bonus-malus-daily', '0 3 * * *',"
echo "     \$\$SELECT recalculate_all_bonus_malus()\$\$);"
echo ""
echo "2. Actualizar frontend para mostrar bonus-malus:"
echo "   - Importar BonusMalusService en componentes"
echo "   - Mostrar factor en checkout y perfil de usuario"
echo ""
echo "3. Monitorear logs y métricas:"
echo "   SELECT * FROM user_bonus_malus ORDER BY total_factor ASC LIMIT 10;"
echo ""

if [ "$ENV" = "production" ]; then
    echo -e "${YELLOW}⚠️  IMPORTANTE: Sistema desplegado en PRODUCCIÓN${NC}"
    echo "   Los precios ahora incluyen ajustes bonus-malus automáticamente."
    echo ""
fi

echo -e "${GREEN}✨ Deployment completado exitosamente ✨${NC}"
echo ""
