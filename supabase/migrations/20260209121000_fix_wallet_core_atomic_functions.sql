-- ============================================================================
-- MIGRATION: Fix Wallet Core (Atomic Functions + Drift Cleanup)
-- Date: 2026-02-09
--
-- Why:
-- - Several wallet RPCs referenced non-existent tables/columns (wallet_ledger, booking_id)
--   and used unsupported wallet_transactions types/statuses (payment/hold/release, negatives).
-- - As a result: transfers, holds, releases and balance locking were broken in production.
--
-- Goals:
-- - Make process_wallet_transaction the single atomic primitive (user_wallets + wallet_transactions).
-- - Normalize legacy type aliases (payment/hold/release) into the allowed set:
--   deposit | lock | unlock | charge | refund | bonus
-- - Fix wallet_get_balance* to read from user_wallets (cents) and return units (USD/UYU).
-- - Provide wallet_unlock_funds for frontend compatibility.
-- ============================================================================

-- ============================================================================
-- 1) Atomic Primitive: process_wallet_transaction
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
  p_user_id UUID,
  p_amount_cents BIGINT,
  p_type TEXT,
  p_category TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance BIGINT;
  v_current_available BIGINT;
  v_current_locked BIGINT;
  v_new_balance BIGINT;
  v_new_available BIGINT;
  v_new_locked BIGINT;
  v_tx_id UUID;
  v_currency TEXT;
  v_type_normalized TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id requerido';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Normalize legacy aliases to match wallet_transactions_type_check
  v_type_normalized := LOWER(TRIM(COALESCE(p_type, '')));
  v_type_normalized := CASE v_type_normalized
    WHEN 'payment' THEN 'charge'
    WHEN 'withdrawal' THEN 'charge'
    WHEN 'hold' THEN 'lock'
    WHEN 'release' THEN 'unlock'
    ELSE v_type_normalized
  END;

  IF v_type_normalized NOT IN ('deposit', 'lock', 'unlock', 'charge', 'refund', 'bonus') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_type;
  END IF;

  -- 1) Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_tx_id
    FROM public.wallet_transactions
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_tx_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'status', 'idempotent_replay'
      );
    END IF;
  END IF;

  -- 2) Ensure wallet row exists + lock it for concurrency safety
  INSERT INTO public.user_wallets (user_id, currency)
  VALUES (p_user_id, 'USD')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id, balance_cents, available_balance_cents, locked_balance_cents, currency
  INTO v_wallet_id, v_current_balance, v_current_available, v_current_locked, v_currency
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_new_balance := v_current_balance;
  v_new_available := v_current_available;
  v_new_locked := v_current_locked;

  -- 3) Apply state transition (all amounts are in cents)
  CASE v_type_normalized
    WHEN 'deposit', 'refund', 'bonus' THEN
      v_new_balance := v_current_balance + p_amount_cents;
      v_new_available := v_current_available + p_amount_cents;

    WHEN 'charge' THEN
      IF v_current_available < p_amount_cents THEN
        RAISE EXCEPTION 'Insufficient funds: Available % < Required %', v_current_available, p_amount_cents;
      END IF;
      v_new_balance := v_current_balance - p_amount_cents;
      v_new_available := v_current_available - p_amount_cents;

    WHEN 'lock' THEN
      IF v_current_available < p_amount_cents THEN
        RAISE EXCEPTION 'Insufficient funds to lock: Available % < Required %', v_current_available, p_amount_cents;
      END IF;
      v_new_available := v_current_available - p_amount_cents;
      v_new_locked := v_current_locked + p_amount_cents;
      -- Total balance stays the same

    WHEN 'unlock' THEN
      IF v_current_locked < p_amount_cents THEN
        RAISE EXCEPTION 'Cannot unlock more than locked: Locked % < Unlock %', v_current_locked, p_amount_cents;
      END IF;
      v_new_available := v_current_available + p_amount_cents;
      v_new_locked := v_current_locked - p_amount_cents;
      -- Total balance stays the same
  END CASE;

  -- 4) Persist wallet balances
  UPDATE public.user_wallets
  SET
    balance_cents = v_new_balance,
    available_balance_cents = v_new_available,
    locked_balance_cents = v_new_locked,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 5) Insert ledger row (wallet_transactions expects positive amount)
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    category,
    status,
    description,
    reference_type,
    reference_id,
    provider,
    currency,
    idempotency_key,
    balance_after_cents,
    created_at,
    updated_at,
    completed_at
  ) VALUES (
    p_user_id,
    p_amount_cents::NUMERIC,
    v_type_normalized,
    COALESCE(p_category, 'general'),
    'completed',
    COALESCE(p_description, ''),
    CASE WHEN p_reference_id IS NULL THEN NULL ELSE 'booking' END,
    p_reference_id,
    'internal',
    COALESCE(v_currency, 'USD'),
    p_idempotency_key,
    v_new_balance,
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'type', v_type_normalized,
    'new_balance_cents', v_new_balance,
    'new_available_cents', v_new_available,
    'new_locked_cents', v_new_locked
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_wallet_transaction(UUID, BIGINT, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- ============================================================================
-- 2) Balance RPCs: wallet_get_balance + wallet_get_balance_with_lock
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  INSERT INTO public.user_wallets (user_id, currency)
  VALUES (v_user_id, 'USD')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = v_user_id;

  RETURN QUERY
  SELECT
    v_user_id,
    (COALESCE(v_wallet.available_balance_cents, 0) / 100.0)::NUMERIC,
    (COALESCE(v_wallet.locked_balance_cents, 0) / 100.0)::NUMERIC,
    (COALESCE(v_wallet.balance_cents, 0) / 100.0)::NUMERIC,
    COALESCE(v_wallet.currency, 'USD')::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_get_balance(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_get_balance_with_lock()
RETURNS TABLE (
  available_balance NUMERIC,
  locked_balance NUMERIC,
  total_balance NUMERIC,
  withdrawable_balance NUMERIC,
  transferable_balance NUMERIC,
  autorentar_credit_balance NUMERIC,
  cash_deposit_balance NUMERIC,
  protected_credit_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  INSERT INTO public.user_wallets (user_id, currency)
  VALUES (v_user_id, 'USD')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  RETURN QUERY
  SELECT
    (COALESCE(v_wallet.available_balance_cents, 0) / 100.0)::NUMERIC,
    (COALESCE(v_wallet.locked_balance_cents, 0) / 100.0)::NUMERIC,
    (COALESCE(v_wallet.balance_cents, 0) / 100.0)::NUMERIC,
    (COALESCE(v_wallet.available_balance_cents, 0) / 100.0)::NUMERIC,
    (COALESCE(v_wallet.available_balance_cents, 0) / 100.0)::NUMERIC,
    0::NUMERIC,
    0::NUMERIC,
    0::NUMERIC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_get_balance_with_lock() TO authenticated;

-- ============================================================================
-- 3) Transfers: wallet_transfer (requires user JWT context)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.wallet_transfer(
  p_from_user UUID,
  p_to_user UUID,
  p_amount_cents BIGINT,
  p_ref VARCHAR,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_debit_result JSONB;
  v_credit_result JSONB;
BEGIN
  IF p_from_user != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Unauthorized transfer');
  END IF;

  IF p_from_user = p_to_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'SELF_TRANSFER', 'message', 'Cannot transfer to yourself');
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT', 'message', 'Amount must be positive');
  END IF;

  v_debit_result := public.process_wallet_transaction(
    p_from_user,
    p_amount_cents,
    'charge',
    'transfer_out',
    'Transfer to ' || p_to_user,
    NULL,
    p_ref || '_out'
  );

  v_credit_result := public.process_wallet_transaction(
    p_to_user,
    p_amount_cents,
    'deposit',
    'transfer_in',
    'Transfer from ' || p_from_user,
    NULL,
    p_ref || '_in'
  );

  RETURN jsonb_build_object(
    'success', true,
    'ref', p_ref,
    'amount_cents', p_amount_cents,
    'from_user', p_from_user,
    'to_user', p_to_user,
    'debit_tx', v_debit_result->'transaction_id',
    'credit_tx', v_credit_result->'transaction_id'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'TRANSFER_FAILED', 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_transfer(UUID, UUID, BIGINT, VARCHAR, JSONB) TO authenticated;

-- ============================================================================
-- 4) Holds/Releases: wallet_hold_funds + wallet_release_funds
-- ============================================================================
CREATE OR REPLACE FUNCTION public.wallet_hold_funds(
  p_amount_cents BIGINT,
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
BEGIN
  RETURN public.process_wallet_transaction(
    auth.uid(),
    p_amount_cents,
    'lock',
    'security_deposit',
    'Garantía retenida por reserva',
    p_booking_id,
    'hold:' || p_booking_id::TEXT
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_hold_funds(BIGINT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_release_funds(
  p_amount_cents BIGINT,
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
BEGIN
  RETURN public.process_wallet_transaction(
    auth.uid(),
    p_amount_cents,
    'unlock',
    'security_deposit_return',
    'Liberación de garantía',
    p_booking_id,
    'release:' || p_booking_id::TEXT
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_release_funds(BIGINT, UUID) TO authenticated;

-- ============================================================================
-- 5) Frontend Compatibility: wallet_lock_funds (2 overloads) + wallet_unlock_funds
-- ============================================================================
CREATE OR REPLACE FUNCTION public.wallet_lock_funds(
  p_booking_id UUID,
  p_amount_cents BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.process_wallet_transaction(
    auth.uid(),
    p_amount_cents,
    'lock',
    'booking_lock',
    'Bloqueo de fondos',
    p_booking_id,
    'lock:' || p_booking_id::TEXT
  );

  RETURN (v_result->>'transaction_id')::UUID;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_lock_funds(UUID, BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_lock_funds(
  p_booking_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT 'Garantía bloqueada para reserva'
)
RETURNS TABLE (
  transaction_id UUID,
  success BOOLEAN,
  message TEXT,
  new_available_balance NUMERIC,
  new_locked_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_amount_cents BIGINT;
  v_result JSONB;
  v_balance RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  v_amount_cents := ROUND(p_amount * 100)::BIGINT;

  -- Lock wallet row (prevents race conditions)
  PERFORM 1 FROM public.user_wallets WHERE user_id = auth.uid() FOR UPDATE;

  v_result := public.process_wallet_transaction(
    auth.uid(),
    v_amount_cents,
    'lock',
    'booking_lock',
    p_description,
    p_booking_id,
    'lock:' || p_booking_id::TEXT
  );

  SELECT * INTO v_balance FROM public.wallet_get_balance(auth.uid());

  RETURN QUERY SELECT
    (v_result->>'transaction_id')::UUID,
    TRUE,
    FORMAT('Fondos bloqueados exitosamente: $%s', p_amount),
    v_balance.available_balance,
    v_balance.locked_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_lock_funds(UUID, NUMERIC, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_unlock_funds(
  p_booking_id UUID,
  p_description TEXT DEFAULT 'Desbloqueo de fondos'
)
RETURNS TABLE (
  transaction_id UUID,
  success BOOLEAN,
  message TEXT,
  unlocked_amount NUMERIC,
  new_available_balance NUMERIC,
  new_locked_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_user_id UUID;
  v_locked_cents BIGINT;
  v_result JSONB;
  v_balance RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Net lock amount for this booking (locks minus unlocks)
  SELECT
    COALESCE(SUM(CASE WHEN type = 'lock' THEN amount::BIGINT ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type = 'unlock' THEN amount::BIGINT ELSE 0 END), 0)
  INTO v_locked_cents
  FROM public.wallet_transactions
  WHERE user_id = v_user_id
    AND reference_type = 'booking'
    AND reference_id = p_booking_id
    AND status = 'completed'
    AND type IN ('lock', 'unlock');

  IF v_locked_cents IS NULL OR v_locked_cents <= 0 THEN
    SELECT * INTO v_balance FROM public.wallet_get_balance(v_user_id);
    RETURN QUERY SELECT
      NULL::UUID,
      FALSE,
      'No hay fondos bloqueados para liberar en esta reserva',
      0::NUMERIC,
      v_balance.available_balance,
      v_balance.locked_balance;
    RETURN;
  END IF;

  v_result := public.process_wallet_transaction(
    v_user_id,
    v_locked_cents,
    'unlock',
    'booking_unlock',
    p_description,
    p_booking_id,
    'unlock:' || p_booking_id::TEXT
  );

  SELECT * INTO v_balance FROM public.wallet_get_balance(v_user_id);

  RETURN QUERY SELECT
    (v_result->>'transaction_id')::UUID,
    TRUE,
    'Fondos desbloqueados exitosamente',
    (v_locked_cents / 100.0)::NUMERIC,
    v_balance.available_balance,
    v_balance.locked_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_unlock_funds(UUID, TEXT) TO authenticated;

