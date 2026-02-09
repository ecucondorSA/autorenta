-- ============================================================================
-- MIGRATION: Fix ambiguous "user_id" in wallet_get_balance
-- Date: 2026-02-09
--
-- Problem:
--   PG error 42702: column reference "user_id" is ambiguous.
--   The RETURNS TABLE declares an output column named "user_id", which
--   clashes with the "user_id" column in the user_wallets table.
--   PL/pgSQL cannot tell if a bare "user_id" means the output column
--   or the table column.
--
-- Fix:
--   Rename the output columns with an "out_" prefix so they never
--   collide with table columns.
-- ============================================================================

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
  INSERT INTO public.user_wallets AS uw (user_id, currency)
  VALUES (v_user_id, 'USD')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT uw.* INTO v_wallet
  FROM public.user_wallets uw
  WHERE uw.user_id = v_user_id;

  -- Assign to output columns directly (avoids ambiguous column refs in RETURN QUERY)
  user_id            := v_user_id;
  available_balance  := (COALESCE(v_wallet.available_balance_cents, 0) / 100.0)::NUMERIC;
  locked_balance     := (COALESCE(v_wallet.locked_balance_cents, 0) / 100.0)::NUMERIC;
  total_balance      := (COALESCE(v_wallet.balance_cents, 0) / 100.0)::NUMERIC;
  currency           := COALESCE(v_wallet.currency, 'USD')::TEXT;
  RETURN NEXT;
END;
$$;
