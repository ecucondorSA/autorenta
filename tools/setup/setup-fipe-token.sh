#!/bin/bash
# ============================================================================
# Setup FIPE API Token in Supabase Secrets
# ============================================================================

set -e

FIPE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzZDEyZTA0Yi0yMGZmLTRjMzctODU0OC1kNjU1YTA3MmM4MDYiLCJlbWFpbCI6InJlaW5hbW9zcXVlcmEyMDAzQGdtYWlsLmNvbSIsImlhdCI6MTc2Mjg1MTI3Mn0.uBliNlAtyuPgvNzVazvkeWXzkO3_5h6gN1EPsWK6miU"
PROJECT_REF="pisqjmoklivzpwufhscx"

echo "🔐 Setting up FIPE API token for project $PROJECT_REF..."

# Set secret via Supabase CLI
supabase secrets set FIPE_API_TOKEN="$FIPE_TOKEN" --project-ref "$PROJECT_REF"

echo "✅ FIPE token configured successfully!"
echo ""
echo "📝 To verify:"
echo "   supabase secrets list --project-ref $PROJECT_REF"
echo ""
echo "🚀 To test Edge Function:"
echo "   curl -X POST https://$PROJECT_REF.supabase.co/functions/v1/sync-fipe-values \\"
echo "     -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"limit\": 5}'"
