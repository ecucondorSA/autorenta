#!/bin/bash
# ============================================================================
# Test Pricing Functions via Supabase REST API
# ============================================================================

set -e

PROJECT_REF="pisqjmoklivzpwufhscx"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ4Mjc4MywiZXhwIjoyMDc4MDU4NzgzfQ.SiACo6rXnbu0B091FZEgmyoXK0-EzxKd9YeO4pls0eQ"

echo "🧪 Testing Pricing Functions via REST API..."
echo ""

# Test 1: Verificar tablas
echo "=== TEST 1: Verificar Tablas ==="
curl -s "${SUPABASE_URL}/rest/v1/vehicle_categories?select=count" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" | jq '.[0].count'

echo ""

# Test 2: Ver categorías
echo "=== TEST 2: Categorías ==="
curl -s "${SUPABASE_URL}/rest/v1/vehicle_categories?select=code,name_es,base_daily_rate_pct,depreciation_rate_annual&order=display_order" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" | jq '.'

echo ""

# Test 3: Contar autos por categoría
echo "=== TEST 3: Distribución de Autos ==="
curl -s "${SUPABASE_URL}/rest/v1/rpc/get_cars_by_category" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Función get_cars_by_category no existe aún"

echo ""

# Test 4: Estimar valor de un vehículo conocido
echo "=== TEST 4: Estimar Valor - Toyota Corolla 2020 ==="
curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/estimate_vehicle_value_usd" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_brand":"Toyota","p_model":"Corolla","p_year":2020}' | jq '.'

echo ""

# Test 5: Obtener un auto de prueba
echo "=== TEST 5: Obtener Auto de Prueba ==="
TEST_CAR=$(curl -s "${SUPABASE_URL}/rest/v1/cars?select=id,brand_text_backup,model_text_backup,year,region_id&region_id=not.is.null&limit=1" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

CAR_ID=$(echo "$TEST_CAR" | jq -r '.[0].id')
REGION_ID=$(echo "$TEST_CAR" | jq -r '.[0].region_id')

echo "Auto seleccionado:"
echo "$TEST_CAR" | jq '.[0] | {id, marca: .brand_text_backup, modelo: .model_text_backup, año: .year}'

echo ""

# Test 6: Calcular precio base para ese auto
if [ "$CAR_ID" != "null" ] && [ "$REGION_ID" != "null" ]; then
  echo "=== TEST 6: Calcular Precio Base ==="
  curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/calculate_vehicle_base_price" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"p_car_id\":\"${CAR_ID}\",\"p_region_id\":\"${REGION_ID}\"}" | jq '.'

  echo ""

  # Test 7: Precio simplificado
  echo "=== TEST 7: Precio Base Simplificado ==="
  curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/get_vehicle_base_price_simple" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"p_car_id\":\"${CAR_ID}\",\"p_region_id\":\"${REGION_ID}\"}" | jq '.'
else
  echo "❌ No se pudo obtener un auto de prueba"
fi

echo ""
echo "✅ Tests completados!"
