-- ============================================================================
-- Migration: Drop phantom mercadopago_accounts table
-- Date: 2026-02-11
-- Issue: Table created in 20260210130004_create_medium_phantom_tables.sql
--        but NEVER populated. OAuth tokens live in profiles table.
--        mercadopago-refresh-token was reading from this empty table (now fixed).
--
-- Rule #0: Zero dead code. If removing it breaks nothing, it shouldn't exist.
--
-- Safety: Abort if table has any data (should be 0 rows in production).
-- ============================================================================

-- Safety check: abort if somehow data exists
DO $$ BEGIN
  IF (SELECT count(*) FROM public.mercadopago_accounts) > 0 THEN
    RAISE EXCEPTION 'mercadopago_accounts has data — aborting drop. Investigate before retrying.';
  END IF;
END $$;

DROP TABLE IF EXISTS public.mercadopago_accounts CASCADE;
