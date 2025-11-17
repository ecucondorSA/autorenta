#!/usr/bin/env bash
# validate_migration_scoring.sh
# Valida que las migraciones de scoring se aplicaron correctamente
# Usage:
#   export DATABASE_URL="postgresql://<user>@<host>:<port>/<db>"
#   PGPASSWORD="<password>" ./scripts/validate_migration_scoring.sh

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found in PATH"
  exit 1
fi

echo "🔍 Validando migraciones de scoring..."
echo ""

# 1. Verificar que location_geom existe
echo "[1/6] Verificando columna location_geom..."
HAS_COLUMN=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cars' AND column_name='location_geom');")
if [[ "$HAS_COLUMN" != "t" ]]; then
  echo "❌ ERROR: Columna location_geom no existe"
  exit 1
fi
echo "✅ Columna location_geom existe"

# 2. Verificar que location_geom está poblada
echo "[2/6] Verificando datos en location_geom..."
GEOM_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM public.cars WHERE location_geom IS NOT NULL;")
TOTAL_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM public.cars WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;")
echo "   Autos con location_geom: $GEOM_COUNT de $TOTAL_COUNT con coordenadas"
if [[ "$GEOM_COUNT" -eq 0 ]]; then
  echo "⚠️  WARNING: No hay datos en location_geom. ¿Se ejecutó el UPDATE?"
else
  echo "✅ location_geom está poblada"
fi

# 3. Verificar índice GiST
echo "[3/6] Verificando índice GiST..."
INDEX_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='cars' AND indexname='idx_cars_location_geom_gist');")
if [[ "$INDEX_EXISTS" != "t" ]]; then
  echo "❌ ERROR: Índice idx_cars_location_geom_gist no existe"
  echo "   Ejecuta: CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_location_geom_gist ON public.cars USING GIST (location_geom);"
  exit 1
fi
echo "✅ Índice GiST existe"

# 4. Verificar función get_available_cars
echo "[4/6] Verificando función get_available_cars..."
FUNC_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='get_available_cars');")
if [[ "$FUNC_EXISTS" != "t" ]]; then
  echo "❌ ERROR: Función get_available_cars no existe"
  exit 1
fi
echo "✅ Función get_available_cars existe"

# 5. Verificar que la función retorna score
echo "[5/6] Verificando que la función retorna score..."
HAS_SCORE=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='get_available_cars' AND routine_definition LIKE '%score%');")
if [[ "$HAS_SCORE" != "t" ]]; then
  echo "⚠️  WARNING: No se detecta 'score' en la definición de la función"
else
  echo "✅ Función incluye score"
fi

# 6. Test de ejecución con EXPLAIN ANALYZE
echo "[6/6] Ejecutando EXPLAIN ANALYZE de prueba..."
echo ""
echo "Ejecutando consulta de prueba (Buenos Aires: -34.6037, -58.3816)..."
psql "$DATABASE_URL" -c "
EXPLAIN ANALYZE
SELECT
  id,
  brand,
  model,
  price_per_day,
  score,
  avg_rating
FROM get_available_cars(
  now()::timestamptz,
  (now() + interval '2 days')::timestamptz,
  -34.6037,
  -58.3816,
  10,
  0
) LIMIT 5;
" || {
  echo "❌ ERROR: La función falló al ejecutarse"
  exit 1
}

echo ""
echo "✅ Validación completa"
echo ""
echo "📊 Resumen:"
echo "   - Columna location_geom: ✅"
echo "   - Datos poblados: $GEOM_COUNT registros"
echo "   - Índice GiST: ✅"
echo "   - Función get_available_cars: ✅"
echo "   - Test de ejecución: ✅"
echo ""
echo "🎯 Próximos pasos recomendados:"
echo "   1. Verificar en UI que el score se muestra correctamente"
echo "   2. Monitorear latencias de consultas en producción"
echo "   3. Revisar logs de errores en los próximos días"




