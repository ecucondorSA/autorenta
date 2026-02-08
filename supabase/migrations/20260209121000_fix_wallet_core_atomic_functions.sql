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

-- ============================================================================
-- 6) Deposits: wallet_initiate_deposit + wallet_confirm_deposit_admin
--
-- Fixes production drift:
-- - wallet_initiate_deposit was violating wallet_transactions constraints:
--   - reference_type invalid (and reference_type set without reference_id)
-- - wallet_confirm_deposit_admin referenced missing columns and did not update user_wallets cents balances.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.wallet_initiate_deposit(
  p_user_id UUID,
  p_amount BIGINT,
  p_provider TEXT DEFAULT 'mercadopago'::text
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_tx_id UUID;
BEGIN
  -- Enforce that normal users can only create deposits for themselves.
  -- Service role (Edge Functions) may create deposits for any user.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Usuario no autenticado';
    END IF;
    IF auth.uid() <> p_user_id THEN
      RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    status,
    amount,
    currency,
    provider,
    description,
    category,
    is_withdrawable,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    'deposit',
    'pending',
    p_amount::NUMERIC, -- cents
    'USD',
    COALESCE(NULLIF(LOWER(TRIM(p_provider)), ''), 'mercadopago'),
    'Depósito vía ' || COALESCE(NULLIF(p_provider, ''), 'mercadopago'),
    'deposit',
    FALSE,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_initiate_deposit(UUID, BIGINT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.wallet_confirm_deposit_admin(
  p_user_id UUID,
  p_transaction_id UUID,
  p_provider_transaction_id TEXT,
  p_provider_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_available_balance NUMERIC,
  new_withdrawable_balance NUMERIC,
  new_total_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_transaction RECORD;
  v_existing_provider_tx_id TEXT;
  v_amount_cents BIGINT;
  v_old_balance BIGINT;
  v_old_available BIGINT;
  v_old_locked BIGINT;
  v_new_balance BIGINT;
  v_new_available BIGINT;
BEGIN
  -- Allow privileged backend calls (service_role). Otherwise require admin.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RETURN QUERY SELECT FALSE, 'Usuario no autenticado', NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
      RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RETURN QUERY SELECT FALSE, 'Solo administradores pueden confirmar depósitos', NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
      RETURN;
    END IF;
  END IF;

  -- Provider transaction id must be unique for completed deposits
  IF p_provider_transaction_id IS NOT NULL AND p_provider_transaction_id <> '' THEN
    SELECT provider_transaction_id INTO v_existing_provider_tx_id
    FROM public.wallet_transactions
    WHERE provider_transaction_id = p_provider_transaction_id
      AND status = 'completed'
    LIMIT 1;

    IF v_existing_provider_tx_id IS NOT NULL THEN
      RETURN QUERY SELECT FALSE, FORMAT('Payment ID %s ya fue procesado', p_provider_transaction_id), NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
      RETURN;
    END IF;
  END IF;

  -- Lock transaction row to avoid double confirmation
  SELECT * INTO v_transaction
  FROM public.wallet_transactions
  WHERE id = p_transaction_id
    AND user_id = p_user_id
    AND type = 'deposit'
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Transacción no encontrada o ya procesada', NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  v_amount_cents := COALESCE(v_transaction.amount::BIGINT, 0);
  IF v_amount_cents <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Monto inválido', NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Ensure wallet exists and lock it
  INSERT INTO public.user_wallets (user_id, currency)
  VALUES (p_user_id, COALESCE(v_transaction.currency, 'USD'))
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance_cents, available_balance_cents, locked_balance_cents
  INTO v_old_balance, v_old_available, v_old_locked
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_new_balance := COALESCE(v_old_balance, 0) + v_amount_cents;
  v_new_available := COALESCE(v_old_available, 0) + v_amount_cents;

  UPDATE public.user_wallets
  SET balance_cents = v_new_balance,
      available_balance_cents = v_new_available,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  UPDATE public.wallet_transactions
  SET
    status = 'completed',
    provider_transaction_id = p_provider_transaction_id,
    provider_metadata = COALESCE(provider_metadata, '{}'::jsonb)
      || COALESCE(p_provider_metadata, '{}'::jsonb)
      || jsonb_build_object('confirmed_at', NOW(), 'confirmed_by', auth.uid()),
    completed_at = NOW(),
    updated_at = NOW(),
    balance_after_cents = v_new_balance
  WHERE id = p_transaction_id;

  RETURN QUERY SELECT
    TRUE,
    FORMAT('Depósito confirmado: %s', (v_amount_cents / 100.0)::NUMERIC),
    (v_new_available / 100.0)::NUMERIC,
    (v_new_available / 100.0)::NUMERIC,
    ((v_new_available + COALESCE(v_old_locked, 0)) / 100.0)::NUMERIC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_confirm_deposit_admin(UUID, UUID, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- 7) Admin Deposits: wallet_deposit_funds_admin (replace broken wallet_ledger logic)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.wallet_deposit_funds_admin(
  p_user_id UUID,
  p_amount_cents BIGINT,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  transaction_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_result JSONB;
  v_reference_uuid UUID;
BEGIN
  -- Allow privileged backend calls (service_role). Otherwise require admin.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, 'Solo administradores pueden depositar fondos';
      RETURN;
    END IF;
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'El monto debe ser positivo';
    RETURN;
  END IF;

  -- Best-effort parse reference_id to UUID
  BEGIN
    v_reference_uuid := NULLIF(p_reference_id, '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_reference_uuid := NULL;
  END;

  v_result := public.process_wallet_transaction(
    p_user_id,
    p_amount_cents,
    'deposit',
    'admin_deposit',
    COALESCE(p_description, 'Depósito admin'),
    v_reference_uuid,
    COALESCE(NULLIF(p_reference_id, ''), 'admin_deposit:' || p_user_id::TEXT || ':' || NOW()::TEXT)
  );

  RETURN QUERY SELECT TRUE, (v_result->>'transaction_id')::UUID, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, NULL::UUID, SQLERRM::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_deposit_funds_admin(UUID, BIGINT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 8) View: v_wallet_history (make metadata JSON for UI, keep user scoping)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_wallet_history AS
SELECT
  wt.id,
  wt.user_id,
  wt.created_at AS transaction_date,
  wt.type AS transaction_type,
  wt.status,
  wt.amount::BIGINT AS amount_cents,
  wt.currency,
  jsonb_build_object(
    'description', wt.description,
    'reference_type', wt.reference_type,
    'reference_id', wt.reference_id,
    'provider', wt.provider,
    'provider_transaction_id', wt.provider_transaction_id,
    'provider_metadata', wt.provider_metadata,
    'admin_notes', wt.admin_notes,
    'is_withdrawable', wt.is_withdrawable,
    'category', wt.category,
    'balance_after_cents', wt.balance_after_cents
  ) AS metadata,
  CASE WHEN wt.reference_type = 'booking' THEN wt.reference_id ELSE NULL END AS booking_id,
  'legacy'::text AS source_system,
  wt.id AS legacy_transaction_id,
  NULL::uuid AS ledger_entry_id,
  NULL::text AS ledger_ref,
  wt.completed_at AS legacy_completed_at,
  NULL::timestamptz AS ledger_created_at
FROM public.wallet_transactions wt
WHERE wt.user_id = auth.uid();
