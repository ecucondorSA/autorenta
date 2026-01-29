-- ============================================
-- MIGRATION: Constraints en user_wallets + Validación Admin (P0/P1)
-- Fecha: 2025-11-18
-- Severity: P0 (admin validation) + P1 (constraints)
-- ============================================

-- PARTE 1: CONSTRAINTS EN user_wallets (P1 - ALTA)

-- 1.1. Available balance no puede ser negativo
ALTER TABLE user_wallets
  DROP CONSTRAINT IF EXISTS check_available_balance_non_negative;

ALTER TABLE user_wallets
  ADD CONSTRAINT check_available_balance_non_negative
  CHECK (available_balance >= 0);

-- 1.2. Locked balance no puede ser negativo
ALTER TABLE user_wallets
  DROP CONSTRAINT IF EXISTS check_locked_balance_non_negative;

ALTER TABLE user_wallets
  ADD CONSTRAINT check_locked_balance_non_negative
  CHECK (locked_balance >= 0);

-- 1.3. Non-withdrawable floor no puede ser negativo
ALTER TABLE user_wallets
  DROP CONSTRAINT IF EXISTS check_non_withdrawable_floor_non_negative;

ALTER TABLE user_wallets
  ADD CONSTRAINT check_non_withdrawable_floor_non_negative
  CHECK (non_withdrawable_floor >= 0);

-- 1.4. Non-withdrawable floor no puede exceder available balance
ALTER TABLE user_wallets
  DROP CONSTRAINT IF EXISTS check_non_withdrawable_floor_within_available;

ALTER TABLE user_wallets
  ADD CONSTRAINT check_non_withdrawable_floor_within_available
  CHECK (non_withdrawable_floor <= available_balance);

-- PARTE 2: VALIDACIÓN DE ROL ADMIN (P0 - CRÍTICA)

-- 2.1. Recrear wallet_confirm_deposit_admin con validación de rol
CREATE OR REPLACE FUNCTION public.wallet_confirm_deposit_admin(
  p_user_id UUID,
  p_transaction_id UUID,
  p_provider_transaction_id TEXT,
  p_provider_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_available_balance NUMERIC,
  new_withdrawable_balance NUMERIC,
  new_total_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_transaction RECORD;
  v_available NUMERIC(10, 2);
  v_locked NUMERIC(10, 2);
  v_floor NUMERIC(10, 2);
  v_non_withdrawable NUMERIC(10, 2);
  v_withdrawable NUMERIC(10, 2);
  v_existing_provider_tx_id TEXT;
  v_payment_amount NUMERIC;
  v_caller_role TEXT;
BEGIN
  -- ⭐ NUEVA VALIDACIÓN P0: Verificar que caller es admin
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Solo administradores pueden confirmar depósitos' AS message,
      NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
    RETURN;
  END IF;

  -- VALIDACIÓN: provider_transaction_id único
  IF p_provider_transaction_id IS NOT NULL AND p_provider_transaction_id != '' THEN
    SELECT provider_transaction_id INTO v_existing_provider_tx_id
    FROM wallet_transactions
    WHERE provider_transaction_id = p_provider_transaction_id
      AND status = 'completed'
    LIMIT 1;

    IF v_existing_provider_tx_id IS NOT NULL THEN
      RETURN QUERY SELECT
        FALSE AS success,
        FORMAT('Payment ID %s ya fue procesado', p_provider_transaction_id) AS message,
        NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
      RETURN;
    END IF;
  END IF;

  -- Buscar transacción pending
  SELECT * INTO v_transaction
  FROM wallet_transactions
  WHERE id = p_transaction_id
    AND user_id = p_user_id
    AND type = 'deposit'
    AND status = 'pending';

  IF v_transaction IS NULL THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Transacción no encontrada o ya procesada' AS message,
      NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
    RETURN;
  END IF;

  -- VALIDACIÓN: Verificar monto si está en metadata
  IF p_provider_metadata ? 'transaction_amount' THEN
    v_payment_amount := (p_provider_metadata->>'transaction_amount')::NUMERIC;
    IF ABS(v_payment_amount - v_transaction.amount) > 0.01 THEN
      RETURN QUERY SELECT
        FALSE AS success,
        FORMAT('Monto no coincide: %s vs %s', v_payment_amount, v_transaction.amount) AS message,
        NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
      RETURN;
    END IF;
  END IF;

  -- VALIDACIÓN: Timeout (>30 días)
  IF v_transaction.created_at < (NOW() - INTERVAL '30 days') THEN
    UPDATE wallet_transactions
    SET status = 'failed', admin_notes = 'Expirada (>30 días)'
    WHERE id = p_transaction_id;

    RETURN QUERY SELECT
      FALSE AS success,
      'Transacción expirada' AS message,
      NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
    RETURN;
  END IF;

  -- Actualizar a completed
  UPDATE wallet_transactions
  SET
    status = 'completed',
    provider_transaction_id = p_provider_transaction_id,
    provider_metadata = provider_metadata || p_provider_metadata || jsonb_build_object('confirmed_at', NOW(), 'confirmed_by', auth.uid()),
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Crear wallet si no existe
  INSERT INTO user_wallets (user_id, currency)
  VALUES (p_user_id, v_transaction.currency)
  ON CONFLICT (user_id) DO NOTHING;

  -- Actualizar piso no reembolsable
  IF NOT v_transaction.is_withdrawable THEN
    UPDATE user_wallets
    SET non_withdrawable_floor = GREATEST(non_withdrawable_floor, v_transaction.amount)
    WHERE user_id = p_user_id;
  END IF;

  -- Calcular balances
  SELECT COALESCE(SUM(CASE
    WHEN type IN ('deposit', 'refund', 'bonus') THEN amount
    WHEN type IN ('charge') THEN -amount
    ELSE 0
  END), 0) INTO v_available
  FROM wallet_transactions
  WHERE user_id = p_user_id AND status = 'completed' AND type NOT IN ('lock', 'unlock');

  SELECT COALESCE(SUM(CASE
    WHEN type = 'lock' THEN amount
    WHEN type = 'unlock' THEN -amount
    ELSE 0
  END), 0) INTO v_locked
  FROM wallet_transactions
  WHERE user_id = p_user_id AND status = 'completed' AND type IN ('lock', 'unlock');

  SELECT non_withdrawable_floor INTO v_floor
  FROM user_wallets WHERE user_id = p_user_id;

  v_floor := COALESCE(v_floor, 0);
  v_non_withdrawable := LEAST(v_available, v_floor);
  v_withdrawable := GREATEST(v_available - v_non_withdrawable, 0);

  -- Audit log
  INSERT INTO wallet_audit_log (user_id, action, transaction_id, details)
  VALUES (
    p_user_id,
    'confirm_deposit_admin',
    p_transaction_id,
    jsonb_build_object(
      'confirmed_by', auth.uid(),
      'provider_transaction_id', p_provider_transaction_id,
      'amount', v_transaction.amount
    )
  );

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Depósito confirmado: $%s', v_transaction.amount) AS message,
    v_available AS new_available_balance,
    v_withdrawable AS new_withdrawable_balance,
    (v_available + v_locked) AS new_total_balance;
END;
$function$;

-- 3. COMENTARIOS
COMMENT ON CONSTRAINT check_available_balance_non_negative ON user_wallets IS 
  'P1 Security: Previene balances negativos. CVSS 6.5 fix.';

COMMENT ON FUNCTION wallet_confirm_deposit_admin IS 
  'P0 Security: Requiere role=admin. CVSS 8.8 fix. Audit log enabled.';

-- 4. AUDIT LOG
INSERT INTO wallet_audit_log (user_id, action, details)
VALUES (
  NULL,
  'add_wallet_constraints_and_admin_validation',
  jsonb_build_object(
    'migration', '20251118_wallet_constraints_and_admin_validation_p0',
    'constraints_added', 4,
    'functions_secured', 1,
    'severity', 'P0_P1',
    'cvss_total', 7.65
  )
);
