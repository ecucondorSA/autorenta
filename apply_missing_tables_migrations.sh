#!/bin/bash

echo "🚀 Applying Database Migrations"
echo "================================"
echo

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "📋 Migrations to apply:"
echo "   1. 20251114_create_car_blocked_dates_table.sql (if not exists)"
echo "   2. 20251114_create_missing_tables.sql (car_stats)"
echo "   3. 20251114_fix_reviews_api.sql (reviews structure)"
echo

# Check if we're in the right directory
if [ ! -d "supabase/migrations" ]; then
    echo "❌ Error: supabase/migrations directory not found"
    echo "   Please run this script from the project root"
    exit 1
fi

# Option 1: Using Supabase CLI (recommended)
echo "🔧 Option 1: Using Supabase CLI"
echo "-------------------------------"
echo "Run these commands:"
echo
echo "supabase db push"
echo
echo "This will apply all pending migrations in order."
echo

# Option 2: Manual SQL execution
echo "🔧 Option 2: Manual SQL Execution"
echo "---------------------------------"
echo "If you prefer to apply manually via Supabase Dashboard:"
echo
echo "1. Go to: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/sql/new"
echo
echo "2. Copy and paste each file in order:"
echo "   - supabase/migrations/20251114_create_car_blocked_dates_table.sql"
echo "   - supabase/migrations/20251114_create_missing_tables.sql"
echo "   - supabase/migrations/20251114_fix_reviews_api.sql"
echo
echo "3. Execute each SQL script"
echo

# Option 3: Using psql directly
echo "🔧 Option 3: Using psql CLI"
echo "---------------------------"
echo "If you have psql installed and database credentials:"
echo
echo "psql postgresql://postgres:[PASSWORD]@db.pisqjmoklivzpwufhscx.supabase.co:5432/postgres -f supabase/migrations/20251114_create_car_blocked_dates_table.sql"
echo "psql postgresql://postgres:[PASSWORD]@db.pisqjmoklivzpwufhscx.supabase.co:5432/postgres -f supabase/migrations/20251114_create_missing_tables.sql"
echo "psql postgresql://postgres:[PASSWORD]@db.pisqjmoklivzpwufhscx.supabase.co:5432/postgres -f supabase/migrations/20251114_fix_reviews_api.sql"
echo

# Check for environment variables
if [ -f ".env" ]; then
    echo "📝 Note: Found .env file. You can use these credentials"
    echo
fi

echo "✅ Ready to apply migrations!"
echo
read -p "Do you want to apply migrations using Supabase CLI now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Applying migrations..."
    supabase db push
    
    if [ $? -eq 0 ]; then
        echo "✅ Migrations applied successfully!"
    else
        echo "❌ Error applying migrations. Please check the output above."
        exit 1
    fi
else
    echo "ℹ️ Skipped automatic application. Please use one of the manual options above."
fi

echo
echo "🔍 Verification Steps:"
echo "1. Check Supabase Dashboard for new tables"
echo "2. Test the application - console errors should be gone"
echo "3. Verify car detail pages load without 404/400 errors"
echo

