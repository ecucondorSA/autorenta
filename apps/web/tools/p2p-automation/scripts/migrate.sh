#!/bin/bash
# Run database migrations against Supabase

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATION_FILE="$PROJECT_DIR/src/db/migrations/001_p2p_tables.sql"

echo "========================================"
echo "P2P Automation - Database Migration"
echo "========================================"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo ""
echo "Migration file: $MIGRATION_FILE"
echo ""

# Load environment
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
fi

# Database connection from CLAUDE.md
DB_HOST="${DB_HOST:-aws-1-sa-east-1.pooler.supabase.com}"
DB_PORT="${DB_PORT:-6543}"
DB_USER="${DB_USER:-postgres.pisqjmoklivzpwufhscx}"
DB_NAME="${DB_NAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-Ab.12345}"

echo "Connecting to: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Run migration
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$MIGRATION_FILE"

echo ""
echo "========================================"
echo "Migration Complete!"
echo "========================================"
