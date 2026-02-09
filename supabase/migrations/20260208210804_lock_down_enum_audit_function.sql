-- ============================================================================
-- Migration: Lock down enum audit helper function
-- Date: 2026-02-08
-- Purpose:
--   public.get_enum_values(text) is SECURITY DEFINER and reads pg_catalog.
--   PostgreSQL grants EXECUTE on new functions to PUBLIC by default, which made
--   it callable by anon/authenticated via PostgREST. This leaks schema details.
--
-- Fix:
--   Revoke EXECUTE from PUBLIC/anon/authenticated and re-grant only to service_role.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.get_enum_values(text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_enum_values(text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_enum_values(text) TO service_role;
  END IF;
END $$;

COMMIT;

