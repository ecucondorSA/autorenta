-- ========================================
-- AUDITORÍA RLS SECURITY - AutoRenta
-- Fecha: 2025-11-11
-- ========================================

-- 1. LISTAR TODAS LAS TABLAS CON SU ESTADO RLS
-- ========================================
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (
        SELECT COUNT(*)
        FROM pg_policies
        WHERE schemaname = c.schemaname
        AND tablename = c.tablename
    ) as policies_count
FROM pg_tables c
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. LISTAR TODAS LAS POLÍTICAS RLS EXISTENTES
-- ========================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. IDENTIFICAR TABLAS CON RLS DESHABILITADO PERO CON POLÍTICAS
-- ========================================
SELECT
    p.tablename,
    COUNT(*) as orphan_policies
FROM pg_policies p
JOIN pg_tables t ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = false
GROUP BY p.tablename;

-- 4. IDENTIFICAR TABLAS SIN RLS Y SIN POLÍTICAS (EXPUESTAS)
-- ========================================
SELECT
    tablename,
    'NO RLS, NO POLICIES - EXPOSED!' as security_status
FROM pg_tables t
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.tablename = t.tablename
      AND p.schemaname = t.schemaname
  )
ORDER BY tablename;

-- 5. LISTAR VISTAS CON SECURITY DEFINER
-- ========================================
SELECT
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%SECURITY DEFINER%'
ORDER BY viewname;

-- 6. LISTAR FUNCIONES SIN search_path FIJADO
-- ========================================
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
    END as volatility,
    CASE p.prosecdef
        WHEN true THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%SET search_path%'
ORDER BY p.proname;

-- 7. TABLAS CRÍTICAS A REVISAR (wallet, bookings, payments, users)
-- ========================================
SELECT
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policies_count,
    CASE
        WHEN t.rowsecurity = false AND COUNT(p.policyname) = 0
            THEN 'CRITICAL: NO RLS, NO POLICIES'
        WHEN t.rowsecurity = false AND COUNT(p.policyname) > 0
            THEN 'WARNING: RLS DISABLED BUT HAS POLICIES'
        WHEN t.rowsecurity = true AND COUNT(p.policyname) = 0
            THEN 'INFO: RLS ENABLED BUT NO POLICIES (blocks all)'
        ELSE 'OK: RLS ENABLED WITH POLICIES'
    END as security_status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND (
      t.tablename ILIKE '%wallet%'
      OR t.tablename ILIKE '%booking%'
      OR t.tablename ILIKE '%payment%'
      OR t.tablename ILIKE '%user%'
      OR t.tablename ILIKE '%profile%'
      OR t.tablename ILIKE '%account%'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY
    CASE security_status
        WHEN 'CRITICAL: NO RLS, NO POLICIES' THEN 1
        WHEN 'WARNING: RLS DISABLED BUT HAS POLICIES' THEN 2
        WHEN 'INFO: RLS ENABLED BUT NO POLICIES (blocks all)' THEN 3
        ELSE 4
    END,
    t.tablename;

-- 8. MATERIALIZED VIEWS EXPUESTAS
-- ========================================
SELECT
    schemaname,
    matviewname,
    matviewowner,
    definition
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;
