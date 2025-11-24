-- ============================================================================
-- FINAL VERIFICATION AND REMAINING FIXES
-- ============================================================================

-- Check which policies still need optimization
SELECT
  c.relname as table_name,
  pol.polname as policy_name,
  CASE
    WHEN pg_get_expr(pol.polqual, pol.polrelid) LIKE '%(SELECT auth.uid())%' THEN 'OPTIMIZED'
    WHEN pg_get_expr(pol.polqual, pol.polrelid) LIKE '%auth.uid()%' THEN 'NEEDS OPTIMIZATION'
    ELSE 'NO AUTH.UID'
  END as optimization_status
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND pg_get_expr(pol.polqual, pol.polrelid) LIKE '%auth.uid()%'
ORDER BY optimization_status, table_name, policy_name
LIMIT 20;

-- Check remaining vulnerable functions
SELECT
  p.proname as function_name,
  CASE
    WHEN pg_catalog.pg_get_functiondef(p.oid) ILIKE '%search_path%' THEN 'SECURED'
    ELSE 'VULNERABLE'
  END as security_status
FROM pg_catalog.pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.prosecdef = true
AND pg_catalog.pg_get_functiondef(p.oid) NOT ILIKE '%search_path%'
ORDER BY p.proname;

-- Check tables without RLS
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN 'RLS ENABLED'
    ELSE 'RLS DISABLED - NEEDS FIX'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;

-- Summary Dashboard
SELECT
  'FINAL SECURITY METRICS' as metric,
  (SELECT COUNT(*) FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef = true) as total_security_definer_functions,

  (SELECT COUNT(*) FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef = true
   AND pg_catalog.pg_get_functiondef(p.oid) ILIKE '%search_path%') as secured_functions,

  (SELECT COUNT(*) FROM pg_tables
   WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls,

  (SELECT COUNT(*) FROM pg_policy pol
   JOIN pg_class c ON c.oid = pol.polrelid
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public') as total_rls_policies,

  (SELECT COUNT(*) FROM pg_views
   WHERE schemaname = 'public') as total_views;