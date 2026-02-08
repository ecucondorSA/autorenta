-- ============================================================================
-- Migration: Lock down RLS audit helper functions
-- Date: 2026-02-08
-- Purpose:
--   The helper functions added in 20260208182355_add_rls_audit_functions.sql are
--   SECURITY DEFINER and query system catalogs (pg_tables/pg_policies).
--   PostgreSQL grants EXECUTE on new functions to PUBLIC by default, which made
--   them callable by anon/authenticated via PostgREST. This leaks security
--   posture and enables recon.
--
-- Fix:
--   Revoke EXECUTE from PUBLIC/anon/authenticated and re-grant only to service_role.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.get_tables_without_rls()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_tables_without_rls() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_tables_without_rls() TO service_role;
  END IF;

  IF to_regprocedure('public.get_tables_missing_policies()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_tables_missing_policies() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_tables_missing_policies() TO service_role;
  END IF;

  IF to_regprocedure('public.get_buckets_without_policies()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_buckets_without_policies() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_buckets_without_policies() TO service_role;
  END IF;

  IF to_regprocedure('public.get_rls_coverage_report()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_rls_coverage_report() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_rls_coverage_report() TO service_role;
  END IF;
END $$;

COMMIT;
