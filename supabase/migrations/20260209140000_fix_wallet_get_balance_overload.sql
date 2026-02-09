-- ============================================================================
-- MIGRATION: Fix wallet_get_balance overload conflict
-- Date: 2026-02-09
--
-- Problem:
--   Two overloads exist in the DB:
--     1. wallet_get_balance()           -- no args, from archive migration
--     2. wallet_get_balance(uuid)       -- with optional p_user_id, from recent migrations
--   When the client calls `supabase.rpc('wallet_get_balance')` with no args,
--   PostgREST dispatches to the () overload, which raises an exception
--   when auth.uid() is NULL, causing a 400 Bad Request.
--
-- Fix:
--   1. Drop the old no-args overload.
--   2. Update the (uuid) overload to return an empty result instead of
--      raising an exception when the user is not authenticated.
--      This way, unauthenticated calls get [] (empty), not 400.
-- ============================================================================

-- 1. Drop the old no-args overload
DROP FUNCTION IF EXISTS public.wallet_get_balance();

-- 2. Replace the (uuid) overload with a version that gracefully handles NULL user
CREATE OR REPLACE FUNCTION public.wallet_get_balance(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  available_balance NUMERIC,
  locked_balance NUMERIC,
  total_balance NUMERIC,
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- If no user context, return empty result (no error)
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Ensure wallet exists (upsert)
  INSERT INTO public.user_wallets (user_id, currency)
  VALUES (v_user_id, 'USD')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM public.user_wallets
  WHERE user_wallets.user_id = v_user_id;

  RETURN QUERY
  SELECT
    v_user_id,
    (COALESCE(v_wallet.available_balance_cents, 0) / 100.0)::NUMERIC,
    (COALESCE(v_wallet.locked_balance_cents, 0) / 100.0)::NUMERIC,
    (COALESCE(v_wallet.balance_cents, 0) / 100.0)::NUMERIC,
    COALESCE(v_wallet.currency, 'USD')::TEXT;
END;
$$;

-- Re-apply grants
GRANT EXECUTE ON FUNCTION public.wallet_get_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_get_balance(UUID) TO anon;
