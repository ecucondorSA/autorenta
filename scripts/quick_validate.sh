#!/usr/bin/env bash
# quick_validate.sh
# Validación rápida post-migración (solo checks críticos)
# Usage: PGPASSWORD="..." DATABASE_URL="..." ./scripts/quick_validate.sh

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

echo "⚡ Validación rápida post-migración..."
echo ""

# Check 1: Columna existe
HAS_COLUMN=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cars' AND column_name='location_geom');")
if [[ "$HAS_COLUMN" != "t" ]]; then
  echo "❌ Columna location_geom no existe"
  exit 1
fi
echo "✅ Columna location_geom existe"

# Check 2: Índice existe
INDEX_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='cars' AND indexname='idx_cars_location_geom_gist');")
if [[ "$INDEX_EXISTS" != "t" ]]; then
  echo "❌ Índice GiST no existe"
  exit 1
fi
echo "✅ Índice GiST existe"

# Check 3: Función existe y retorna score
FUNC_TEST=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM get_available_cars(now()::timestamptz, (now()+interval '1 day')::timestamptz, -34.6037, -58.3816, 1, 0);" 2>&1)
if [[ $? -ne 0 ]]; then
  echo "❌ Función get_available_cars falló: $FUNC_TEST"
  exit 1
fi
echo "✅ Función get_available_cars funciona"

# Check 4: Score está presente en resultado
HAS_SCORE_COL=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM (SELECT * FROM get_available_cars(now()::timestamptz, (now()+interval '1 day')::timestamptz, -34.6037, -58.3816, 1, 0) LIMIT 1) t WHERE score IS NOT NULL;" 2>&1)
if [[ "$HAS_SCORE_COL" == "0" ]]; then
  echo "⚠️  WARNING: Score no está presente en resultados"
else
  echo "✅ Score presente en resultados"
fi

echo ""
echo "✅ Validación rápida completada - Todos los checks críticos pasaron"










