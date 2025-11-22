#!/usr/bin/env bash
# apply_migrations_prod.sh
# Safe helper to apply the two migrations in production:
#  - 20251116_add_location_geom_gist.sql
#  - 20251116_update_get_available_cars_scoring.sql
# Usage (recommended):
#   export DATABASE_URL="postgresql://<user>@<host>:<port>/<db>"  # do NOT include password here; use PGPASSWORD or .pgpass
#   PGPASSWORD="<your-password>" ./scripts/apply_migrations_prod.sh
# The script will:
#  1) Create a SQL dump backup of the public schema
#  2) Apply the location_geom migration (adds column and populates it)
#  3) Create the GiST index CONCURRENTLY (run separately as it's outside transactions)
#  4) Apply the scoring migration (replaces get_available_cars)
#  5) Print suggested EXPLAIN ANALYZE lines to run manually

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
BACKUP_DIR="$ROOT_DIR/logs/db-backups"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set. Export your DB connection string in DATABASE_URL (without password recommended)"
  echo "Example: export DATABASE_URL='postgresql://postgres@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'"
  exit 1
fi

# Ensure psql is available
if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found in PATH. Install libpq or the psql client first."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_FILE="$BACKUP_DIR/backup_public_schema_$TIMESTAMP.sql"

echo "[1/6] Creating backup of public schema to $BACKUP_FILE (pg_dump)
Note: Ensure PGPASSWORD is set or your .pgpass contains credentials."
# Dump only public schema to keep backup small
pg_dump --dbname="$DATABASE_URL" --schema=public --format=plain --file="$BACKUP_FILE"

# Apply location_geom migration
LOCATION_MIGRATION="$MIGRATIONS_DIR/20251116_add_location_geom_gist.sql"
if [[ ! -f "$LOCATION_MIGRATION" ]]; then
  echo "ERROR: location migration not found: $LOCATION_MIGRATION"
  exit 1
fi

echo "[2/6] Applying location_geom migration: $LOCATION_MIGRATION"
psql "$DATABASE_URL" -f "$LOCATION_MIGRATION"

# Create GiST index concurrently
echo "[3/6] Creating GiST index concurrently. This must run outside a transaction."
read -p "Proceed to run CREATE INDEX CONCURRENTLY on production? (y/N) " PROCEED_INDEX
if [[ "$PROCEED_INDEX" != "y" && "$PROCEED_INDEX" != "Y" ]]; then
  echo "Skipping index creation. You must run the index creation step manually later:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_location_geom_gist ON public.cars USING GIST (location_geom);
"
else
  # run concurrently
  psql "$DATABASE_URL" -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_location_geom_gist ON public.cars USING GIST (location_geom);"
fi

# Apply scoring migration
SCORING_MIGRATION="$MIGRATIONS_DIR/20251116_update_get_available_cars_scoring.sql"
if [[ ! -f "$SCORING_MIGRATION" ]]; then
  echo "ERROR: scoring migration not found: $SCORING_MIGRATION"
  exit 1
fi

echo "[4/6] Applying scoring migration: $SCORING_MIGRATION"
psql "$DATABASE_URL" -f "$SCORING_MIGRATION"

# Post-apply checks (manual EXPLAIN recommended)
EXPLAIN_SQL="EXPLAIN ANALYZE SELECT * FROM get_available_cars(now()::timestamptz, (now()+interval '2 days')::timestamptz, -34.6037, -58.3816, 10, 0);"

echo "[5/6] Migration applied. Recommended manual checks (run these manually and inspect output):"
cat <<EOF
# 1) Check index exists:
psql "$DATABASE_URL" -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='cars' AND indexname LIKE 'idx_cars_location_geom_gist%';"

# 2) Run EXPLAIN ANALYZE on example RPC call (inspect for Index Scan / usage of GiST):
$EXPLAIN_SQL

# 3) If performance is poor, verify location_geom populated count:
psql "$DATABASE_URL" -c "SELECT count(*) AS total_with_geom FROM public.cars WHERE location_geom IS NOT NULL;"

EOF

echo "[6/6] Done. If you answered 'y' to the index creation prompt, the GiST index was created concurrently. Monitor DB CPU during index build."
echo ""

# Offer to run validation
read -p "Run validation script now? (y/N) " RUN_VALIDATION
if [[ "$RUN_VALIDATION" == "y" || "$RUN_VALIDATION" == "Y" ]]; then
  VALIDATION_SCRIPT="$SCRIPT_DIR/validate_migration_scoring.sh"
  if [[ -f "$VALIDATION_SCRIPT" ]]; then
    echo "Running validation..."
    bash "$VALIDATION_SCRIPT"
  else
    echo "Validation script not found: $VALIDATION_SCRIPT"
  fi
fi

echo ""
echo "IMPORTANT: This script does NOT store passwords. Provide credentials via PGPASSWORD env var or .pgpass file. Example usage:

PGPASSWORD='<your-password>' DATABASE_URL='postgresql://postgres@aws-1-sa-east-1.pooler.supabase.com:6543/postgres' ./scripts/apply_migrations_prod.sh

Or configure in your CI secret and run the script in the runner.
"
echo ""
echo "📋 Next steps:"
echo "   1. Review checklist: scripts/checklist_migration_scoring.md"
echo "   2. Test in UI that scores are displayed correctly"
echo "   3. Monitor query performance in Supabase Dashboard"
echo "   4. Check logs for any errors in the next 24 hours"
