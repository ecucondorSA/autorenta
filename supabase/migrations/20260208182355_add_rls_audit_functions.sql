-- Migration: Add RLS audit helper functions
-- Purpose: Enable automated RLS coverage auditing
-- Created: 2026-02-08

-- ============================================================================
-- Function: Get tables without RLS enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tables_without_rls()
RETURNS TABLE(
  table_schema text,
  table_name text,
  table_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    schemaname::text AS table_schema,
    tablename::text AS table_name,
    'table'::text AS table_type
  FROM pg_tables
  WHERE schemaname = 'public'
  AND NOT rowsecurity
  ORDER BY tablename;
$$;

GRANT EXECUTE ON FUNCTION public.get_tables_without_rls TO service_role;

COMMENT ON FUNCTION public.get_tables_without_rls IS
  'Returns all tables in the public schema that do not have RLS (Row Level Security) enabled.';

-- ============================================================================
-- Function: Get tables with RLS but no policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tables_missing_policies()
RETURNS TABLE(
  table_schema text,
  table_name text,
  rls_enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.schemaname::text AS table_schema,
    t.tablename::text AS table_name,
    t.rowsecurity AS rls_enabled
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = t.schemaname
    AND p.tablename = t.tablename
  )
  ORDER BY t.tablename;
$$;

GRANT EXECUTE ON FUNCTION public.get_tables_missing_policies TO service_role;

COMMENT ON FUNCTION public.get_tables_missing_policies IS
  'Returns tables that have RLS enabled but no policies defined. These tables will deny all access.';

-- ============================================================================
-- Function: Get storage buckets without policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_buckets_without_policies()
RETURNS TABLE(
  bucket_name text,
  is_public boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.name::text AS bucket_name,
    b.public AS is_public
  FROM storage.buckets b
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'storage'
    AND p.tablename = 'objects'
    AND (
      -- Check if policy mentions this bucket in its USING clause
      p.qual::text LIKE '%' || b.id || '%'
      OR p.with_check::text LIKE '%' || b.id || '%'
    )
  )
  ORDER BY b.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_buckets_without_policies TO service_role;

COMMENT ON FUNCTION public.get_buckets_without_policies IS
  'Returns storage buckets that have no RLS policies on storage.objects. Users will not be able to access these buckets.';

-- ============================================================================
-- Function: Get comprehensive RLS coverage report
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_rls_coverage_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_tables int;
  tables_with_rls int;
  tables_with_policies int;
  total_buckets int;
  buckets_with_policies int;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO total_tables
  FROM pg_tables
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;

  SELECT COUNT(DISTINCT tablename) INTO tables_with_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count buckets
  SELECT COUNT(*) INTO total_buckets
  FROM storage.buckets;

  SELECT COUNT(DISTINCT b.name) INTO buckets_with_policies
  FROM storage.buckets b
  WHERE EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'storage'
    AND p.tablename = 'objects'
    AND (
      p.qual::text LIKE '%' || b.id || '%'
      OR p.with_check::text LIKE '%' || b.id || '%'
    )
  );

  -- Build report
  result := jsonb_build_object(
    'tables', jsonb_build_object(
      'total', total_tables,
      'with_rls', tables_with_rls,
      'with_policies', tables_with_policies,
      'coverage_percent', ROUND((tables_with_policies::numeric / NULLIF(total_tables, 0)) * 100, 1)
    ),
    'buckets', jsonb_build_object(
      'total', total_buckets,
      'with_policies', buckets_with_policies,
      'coverage_percent', ROUND((buckets_with_policies::numeric / NULLIF(total_buckets, 0)) * 100, 1)
    ),
    'generated_at', now()
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rls_coverage_report TO service_role;

COMMENT ON FUNCTION public.get_rls_coverage_report IS
  'Returns a comprehensive RLS coverage report with statistics for tables and storage buckets.';

-- ============================================================================
-- Verification Queries (commented out for migration)
-- ============================================================================

-- Test tables without RLS:
-- SELECT * FROM public.get_tables_without_rls();

-- Test tables with RLS but no policies:
-- SELECT * FROM public.get_tables_missing_policies();

-- Test buckets without policies:
-- SELECT * FROM public.get_buckets_without_policies();

-- Test coverage report:
-- SELECT public.get_rls_coverage_report();
