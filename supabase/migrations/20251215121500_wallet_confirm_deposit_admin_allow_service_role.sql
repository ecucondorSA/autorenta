-- Allow backend/Edge Functions to confirm deposits using service_role.
-- Keeps the existing admin-only check for non-service calls.

CREATE OR REPLACE FUNCTION public.wallet_confirm_deposit_admin(
  p_user_id uuid,
  p_transaction_id uuid,
  p_provider_transaction_id text,
  p_provider_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  success boolean,
  message text,
  new_available_balance numeric,
  new_withdrawable_balance numeric,
  new_total_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $_$
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
  -- Allow privileged backend calls.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    -- ⭐ VALIDACIÓN P0: Verificar que caller es admin
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

  -- Calcular balances (simplificado)
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

  SELECT COALESCE(non_withdrawable_floor, 0) INTO v_floor
  FROM user_wallets WHERE user_id = p_user_id;

  v_non_withdrawable := LEAST(v_available, v_floor);
  v_withdrawable := GREATEST(v_available - v_non_withdrawable, 0);

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Depósito confirmado: $%s', v_transaction.amount) AS message,
    v_available AS new_available_balance,
    v_withdrawable AS new_withdrawable_balance,
    (v_available + v_locked) AS new_total_balance;
END;
$_$;

COMMENT ON FUNCTION public.wallet_confirm_deposit_admin(uuid, uuid, text, jsonb) IS
'Confirmación de depósitos para backend/admin. Permite llamadas con service_role; de lo contrario requiere profiles.role=admin.';
