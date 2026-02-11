#!/bin/bash
# Apply security migration to Supabase
# P0-SECURITY: Atomic damage deduction + claim locking + anti-fraud

PROJECT_REF="aceacpaockyxgogxsfyc"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY env var is required}"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo "🔐 Applying P0-SECURITY migration..."

# Read the SQL file
SQL_FILE="/home/edu/autorenta/supabase/migrations/20251124_create_atomic_damage_deduction_rpc.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL file not found: $SQL_FILE"
    exit 1
fi

# Use psql with the pooler connection string
POOLER_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD:-password}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Try direct connection via Management API
echo "📡 Executing via Supabase Management API..."

# Get the database password from env
source /home/edu/autorenta/.env.local 2>/dev/null || true
source /home/edu/autorenta/apps/web/.env.local 2>/dev/null || true

# Construct the direct database URL
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "🔗 Connecting to: $DB_HOST"

# Execute using psql with SSL
PGPASSWORD="${SUPABASE_DB_PASSWORD}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$SQL_FILE" \
    --set=sslmode=require 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
else
    echo "⚠️ psql failed, trying alternative method..."

    # Alternative: Use supabase CLI inspection
    echo "📋 You can apply this migration manually:"
    echo "1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
    echo "2. Copy the contents of: $SQL_FILE"
    echo "3. Paste and run in the SQL Editor"
fi
