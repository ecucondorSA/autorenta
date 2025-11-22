#!/bin/bash
# Script to apply the onboarding migration manually
# Usage: ./apply-onboarding-migration.sh

echo "🔧 Onboarding Migration Script"
echo "================================"
echo ""
echo "📋 You need to run this SQL in Supabase Dashboard > SQL Editor:"
echo ""
echo "------- COPY FROM HERE -------"
cat supabase/migrations/20251115071500_add_onboarding_to_profiles.sql
echo ""
echo "------- COPY TO HERE -------"
echo ""
echo "📍 Steps:"
echo "1. Go to https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/sql/new"
echo "2. Copy the SQL above"
echo "3. Paste in the SQL Editor"
echo "4. Click 'Run' or press Ctrl+Enter"
echo "5. Verify success message"
echo ""
echo "✅ After running, test onboarding flow at https://autorentar.com"
