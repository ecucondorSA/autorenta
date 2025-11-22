#!/bin/bash
# Script para sincronizar el historial de migraciones con la base de datos real
# Esto marca migraciones como aplicadas sin re-ejecutarlas

echo "🔄 SINCRONIZANDO HISTORIAL DE MIGRACIONES"
echo "=========================================="
echo ""
echo "⚠️  Esto NO ejecutará las migraciones, solo las marcará como aplicadas"
echo "   en la tabla supabase_migrations.schema_migrations"
echo ""

# Marcar las últimas dos migraciones como aplicadas
echo "📝 Marcando migraciones 20251115070000 y 20251115071500 como aplicadas..."
npx supabase migration repair --status applied 20251115070000
npx supabase migration repair --status applied 20251115071500

echo ""
echo "✅ Historial sincronizado"
echo ""
echo "🔍 Ahora puedes hacer pull del schema real:"
echo "   npx supabase db pull --schema public"
