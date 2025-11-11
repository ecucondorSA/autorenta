#!/bin/bash
# ============================================================================
# Apply Vehicle-Aware Pricing Migrations
# Date: 2025-11-11
# Purpose: Deploy all 8 migrations for vehicle-aware dynamic pricing
# ============================================================================

set -e

PROJECT_REF="pisqjmoklivzpwufhscx"
MIGRATIONS_DIR="supabase/migrations"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Deploying Vehicle-Aware Pricing Migrations${NC}"
echo ""

# List of migrations in order
MIGRATIONS=(
  "20251111_create_vehicle_categories.sql"
  "20251111_create_vehicle_pricing_models.sql"
  "20251111_update_cars_table_for_dynamic_pricing.sql"
  "20251111_create_estimate_value_function.sql"
  "20251111_migrate_existing_cars_to_categories.sql"
  "20251111_create_calculate_vehicle_base_price.sql"
  "20251111_update_calculate_dynamic_price_with_car_id.sql"
  "20251111_update_lock_price_rpc_with_car_id.sql"
)

echo "📝 Migrations to apply:"
for migration in "${MIGRATIONS[@]}"; do
  echo "   - $migration"
done
echo ""

# Get Supabase credentials
echo -e "${YELLOW}📡 Checking Supabase connection...${NC}"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
SUPABASE_KEY=$(grep "NG_APP_SUPABASE_ANON_KEY" apps/web/.env.development.local 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d ' ')

if [ -z "$SUPABASE_KEY" ]; then
  echo -e "${RED}❌ Error: SUPABASE_ANON_KEY not found in .env.development.local${NC}"
  echo "Please set NG_APP_SUPABASE_ANON_KEY in apps/web/.env.development.local"
  exit 1
fi

echo -e "${GREEN}✓ Supabase credentials found${NC}"
echo ""

# Apply each migration
for migration in "${MIGRATIONS[@]}"; do
  MIGRATION_FILE="$MIGRATIONS_DIR/$migration"

  if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
  fi

  echo -e "${YELLOW}Applying: $migration${NC}"

  # Read migration SQL
  SQL_CONTENT=$(cat "$MIGRATION_FILE")

  # Apply via Supabase REST API (SQL endpoint)
  RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(jq -Rs . <<< "$SQL_CONTENT")}" \
    2>&1)

  # Check for errors (simplified check)
  if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${RED}❌ Error applying migration${NC}"
    echo "$RESPONSE"
    exit 1
  fi

  echo -e "${GREEN}✓ Applied successfully${NC}"
  echo ""
done

echo -e "${GREEN}🎉 All migrations applied successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify tables: SELECT COUNT(*) FROM vehicle_categories;"
echo "2. Test pricing: SELECT calculate_vehicle_base_price(car_id, region_id);"
echo "3. Deploy FIPE sync: ./tools/setup-fipe-token.sh"
