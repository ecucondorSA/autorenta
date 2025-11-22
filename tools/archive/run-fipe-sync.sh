#!/bin/bash
# ============================================================================
# Run FIPE Sync Manually
# ============================================================================

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4"
URL="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/sync-fipe-values"

echo "🔄 Ejecutando FIPE Sync..."
echo ""

curl -X POST "$URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'

echo ""
echo ""
echo "✅ Sync completado. Verifica los resultados arriba."
