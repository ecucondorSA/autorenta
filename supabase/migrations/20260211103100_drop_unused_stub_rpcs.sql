-- ============================================================================
-- Migration: Drop unused stub RPC functions
-- Date: 2026-02-11
-- Issue: 2 stub functions have zero frontend consumers (confirmed via audit).
--        Removing dead code from the function namespace.
-- NOTE: Wrapped in single DO block for pooler compatibility (no multi-statement).
-- ============================================================================

DO $$
BEGIN
  -- 1. wallet_poll_pending_payments — zero references in apps/web/src/
  DROP FUNCTION IF EXISTS public.wallet_poll_pending_payments();
  DROP FUNCTION IF EXISTS public.wallet_poll_pending_payments(uuid);

  -- 2. create_booking_atomic — only referenced in a comment explaining it's NOT used.
  --    Frontend delegates to request_booking() instead.
  DROP FUNCTION IF EXISTS public.create_booking_atomic(uuid, uuid, timestamptz, timestamptz);
  DROP FUNCTION IF EXISTS public.create_booking_atomic(uuid, uuid, timestamp, timestamp);
  DROP FUNCTION IF EXISTS public.create_booking_atomic(uuid, uuid, text, text);

  -- Verify cleanup
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'wallet_poll_pending_payments') THEN
    RAISE WARNING '❌ wallet_poll_pending_payments still exists (unexpected overload)';
  ELSE
    RAISE NOTICE '✅ wallet_poll_pending_payments dropped';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'create_booking_atomic') THEN
    RAISE WARNING '❌ create_booking_atomic still exists (unexpected overload)';
  ELSE
    RAISE NOTICE '✅ create_booking_atomic dropped';
  END IF;
END $$;
