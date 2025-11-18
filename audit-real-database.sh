#!/bin/bash
# Auditoría REAL de base de datos - conecta directamente a Supabase
# NO usa migraciones locales, consulta el estado actual de producción

echo "🔍 AUDITORÍA REAL DE BASE DE DATOS EN PRODUCCIÓN"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANTE: Esto consulta el estado REAL en Supabase,"
echo "   NO las migraciones locales que pueden estar desactualizadas"
echo ""

# Función para ejecutar SQL en Supabase
run_sql() {
    local sql="$1"
    local description="$2"
    
    echo "📊 $description"
    echo "---"
    echo "$sql" | npx supabase db execute --stdin 2>&1
    echo ""
    echo ""
}

# 1. Verificar columna onboarding en profiles
run_sql "SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding';" \
"1. ¿Existe la columna 'onboarding' en profiles?"

# 2. Listar TODAS las tablas en producción
run_sql "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" \
"2. Tablas reales en producción"

# 3. Verificar RLS habilitado por tabla
run_sql "SELECT tablename, 
  CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ NO RLS' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename;" \
"3. Estado RLS de cada tabla"

# 4. Políticas RLS de conversion_events
run_sql "SELECT policyname, roles, cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'conversion_events';" \
"4. Políticas RLS de conversion_events"

# 5. Estructura de profiles (columnas reales)
run_sql "SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;" \
"5. Estructura REAL de tabla profiles"

# 6. Estructura de wallet_transactions
run_sql "SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'wallet_transactions'
ORDER BY ordinal_position;" \
"6. Estructura REAL de wallet_transactions"

# 7. Enum types que existen realmente
run_sql "SELECT t.typname as enum_name, 
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as valores
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname
ORDER BY t.typname;" \
"7. Tipos ENUM reales en base de datos"

# 8. Índices en profiles
run_sql "SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY indexname;" \
"8. Índices en tabla profiles"

# 9. Foreign keys de bookings
run_sql "SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'bookings'
  AND tc.constraint_type = 'FOREIGN KEY';" \
"9. Foreign Keys de tabla bookings"

# 10. Últimas 10 migraciones REALMENTE aplicadas
run_sql "SELECT version, name, executed_at 
FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 10;" \
"10. Últimas 10 migraciones aplicadas en producción"

echo "✅ Auditoría completada"
echo ""
echo "💡 Esta información refleja el estado REAL de tu base de datos"
echo "   en Supabase, no las migraciones locales que pueden diferir."
