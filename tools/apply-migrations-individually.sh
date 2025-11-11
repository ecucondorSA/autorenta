#!/bin/bash
# ============================================================================
# Apply Vehicle Pricing Migrations Individually via Supabase Dashboard API
# ============================================================================

set -e

PROJECT_REF="pisqjmoklivzpwufhscx"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

# Obtener el token de acceso de Supabase CLI
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token 2>/dev/null || echo "")

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ Error: No se encontró el token de Supabase CLI"
  echo "Ejecuta: supabase login"
  exit 1
fi

echo "🚀 Aplicando migraciones de Vehicle-Aware Pricing..."
echo ""

# Lista de migraciones en orden
MIGRATIONS=(
  "supabase/migrations/20251111_create_vehicle_categories.sql"
  "supabase/migrations/20251111_create_vehicle_pricing_models.sql"
  "supabase/migrations/20251111_update_cars_table_for_dynamic_pricing.sql"
  "supabase/migrations/20251111_create_estimate_value_function.sql"
  "supabase/migrations/20251111_migrate_existing_cars_to_categories.sql"
  "supabase/migrations/20251111_create_calculate_vehicle_base_price.sql"
  "supabase/migrations/20251111_update_calculate_dynamic_price_with_car_id.sql"
  "supabase/migrations/20251111_update_lock_price_rpc_with_car_id.sql"
)

for migration_file in "${MIGRATIONS[@]}"; do
  migration_name=$(basename "$migration_file")
  echo "📝 Aplicando: $migration_name"

  # Leer el contenido del archivo SQL
  SQL_CONTENT=$(cat "$migration_file")

  # Aplicar usando la API de Supabase Management
  response=$(curl -s -X POST \
    "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(jq -Rs . <<< "$SQL_CONTENT")}" \
    2>&1)

  if echo "$response" | grep -qi "error"; then
    echo "❌ Error aplicando $migration_name"
    echo "$response" | jq . 2>/dev/null || echo "$response"
    exit 1
  fi

  echo "✅ Aplicada exitosamente"
  echo ""
  sleep 2  # Esperar 2 segundos entre migraciones
done

echo "🎉 ¡Todas las migraciones aplicadas exitosamente!"
echo ""
echo "Verificación:"
echo "  supabase db remote commit"
