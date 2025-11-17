-- ============================================
-- AUDITORÍA COMPLETA DE BASE DE DATOS
-- Fecha: 2025-11-15
-- ============================================

-- 1. VERIFICAR COLUMNA ONBOARDING EN PROFILES
-- ============================================
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'onboarding';

-- 2. LISTAR TODAS LAS TABLAS Y SU ESTADO RLS
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. RLS POLICIES POR TABLA
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. VERIFICAR CONVERSION_EVENTS RLS
-- ============================================
SELECT 
  tablename,
  policyname,
  roles,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'conversion_events';

-- 5. ÍNDICES EXISTENTES
-- ============================================
SELECT 
  t.tablename,
  i.indexname,
  array_agg(a.attname ORDER BY a.attnum) as columns,
  i.indexdef
FROM pg_indexes i
JOIN pg_class c ON c.relname = i.indexname
JOIN pg_attribute a ON a.attrelid = c.oid
JOIN pg_tables t ON t.tablename = i.tablename
WHERE t.schemaname = 'public'
  AND a.attnum > 0
GROUP BY t.tablename, i.indexname, i.indexdef
ORDER BY t.tablename, i.indexname;

-- 6. FOREIGN KEYS Y CONSTRAINTS
-- ============================================
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'CHECK')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 7. VERIFICAR TABLAS CRÍTICAS EXISTEN
-- ============================================
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'cars',
    'bookings',
    'wallet_transactions',
    'conversion_events',
    'reviews',
    'notifications',
    'car_availability',
    'payment_intents'
  )
ORDER BY table_name;

-- 8. VERIFICAR ENUM TYPES
-- ============================================
SELECT 
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname
ORDER BY t.typname;

-- 9. STORAGE BUCKETS Y RLS
-- ============================================
SELECT 
  name as bucket_name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- 10. STORAGE POLICIES
-- ============================================
SELECT 
  bucket_id,
  name as policy_name,
  definition
FROM storage.policies
ORDER BY bucket_id, name;

-- 11. VERIFICAR FUNCIONES RPC CRÍTICAS
-- ============================================
SELECT 
  proname as function_name,
  prokind as kind,
  provolatile as volatility,
  prosecdef as security_definer
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN (
    'wallet_initiate_deposit',
    'wallet_confirm_deposit',
    'wallet_lock_funds',
    'wallet_release_funds',
    'calculate_booking_cost',
    'check_car_availability'
  )
ORDER BY proname;

-- 12. MIGRACIONES APLICADAS (ÚLTIMAS 20)
-- ============================================
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- 13. TABLAS SIN RLS HABILITADO (POTENCIAL PROBLEMA)
-- ============================================
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS NOT ENABLED'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND NOT rowsecurity
ORDER BY tablename;

-- 14. VERIFICAR COLUMNAS CRÍTICAS EN PROFILES
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('id', 'email', 'full_name', 'onboarding', 'tos_accepted_at', 'role')
ORDER BY column_name;

-- 15. VERIFICAR WALLET TRANSACTIONS STRUCTURE
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'wallet_transactions'
ORDER BY ordinal_position;
