-- ============================================
-- MIGRATION: Validaciones Críticas de Wallet (V2 - Sin BEGIN/COMMIT)
-- Fecha: 2025-10-20 19:30 UTC
-- ============================================

-- 1. Limpiar duplicados antes de crear unique constraint
UPDATE wallet_transactions wt1
SET
  status = 'failed',
  admin_notes = COALESCE(admin_notes, '') || ' [DUPLICADO - Marcado por migration 20251020]'
WHERE wt1.provider_transaction_id IN (
  SELECT provider_transaction_id
  FROM wallet_transactions
  WHERE provider_transaction_id IS NOT NULL
    AND provider_transaction_id != ''
  GROUP BY provider_transaction_id
  HAVING COUNT(*) > 1
)
AND wt1.id NOT IN (
  SELECT DISTINCT ON (provider_transaction_id) id
  FROM wallet_transactions
  WHERE provider_transaction_id IS NOT NULL
    AND provider_transaction_id != ''
  ORDER BY provider_transaction_id, created_at ASC
);

-- 2. Unique constraint en provider_transaction_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_provider_tx_id_unique
  ON wallet_transactions (provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL AND provider_transaction_id != '';

-- 3. Check constraints
ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS check_wallet_transactions_amount_positive;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT check_wallet_transactions_amount_positive
  CHECK (amount > 0);

ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS check_wallet_transactions_currency_valid;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT check_wallet_transactions_currency_valid
  CHECK (currency IN ('USD', 'ARS', 'EUR'));

ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS check_wallet_transactions_type_valid;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT check_wallet_transactions_type_valid
  CHECK (type IN ('deposit', 'withdrawal', 'charge', 'refund', 'bonus', 'lock', 'unlock'));

ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS check_wallet_transactions_status_valid;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT check_wallet_transactions_status_valid
  CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));

ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS check_wallet_transactions_provider_valid;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT check_wallet_transactions_provider_valid
  CHECK (provider IS NULL OR provider IN ('mercadopago', 'stripe', 'bank_transfer', 'manual', 'system'));

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_status_type
  ON wallet_transactions (user_id, status, type)
  WHERE status IN ('pending', 'completed');

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider_tx_id
  ON wallet_transactions (provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

-- 5. wallet_confirm_deposit_admin mejorada con validaciones
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
BEGIN
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
    provider_metadata = provider_metadata || p_provider_metadata || jsonb_build_object('confirmed_at', NOW()),
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

  -- Calcular balances (mantener lógica existente)
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

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Depósito confirmado: $%s', v_transaction.amount) AS message,
    v_available AS new_available_balance,
    v_withdrawable AS new_withdrawable_balance,
    (v_available + v_locked) AS new_total_balance;
END;
$function$;

-- 6. Trigger para prevenir modificación de completed
CREATE OR REPLACE FUNCTION prevent_completed_transaction_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'No se puede modificar transacción completada';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_completed_modification ON wallet_transactions;

CREATE TRIGGER trigger_prevent_completed_modification
  BEFORE UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_completed_transaction_modification();

-- 7. Función de rate limiting
CREATE OR REPLACE FUNCTION check_user_pending_deposits_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_pending_count
  FROM wallet_transactions
  WHERE user_id = p_user_id
    AND type = 'deposit'
    AND status = 'pending'
    AND created_at > (NOW() - INTERVAL '7 days');

  RETURN (v_pending_count < 10);
END;
$$;

-- 8. Tabla de audit log
CREATE TABLE IF NOT EXISTS wallet_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  transaction_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_audit_log_user_id ON wallet_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_log_transaction_id ON wallet_audit_log (transaction_id);

-- 9. Función para limpiar pending viejos
CREATE OR REPLACE FUNCTION cleanup_old_pending_deposits()
RETURNS TABLE(cleaned_count INTEGER, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE wallet_transactions
  SET status = 'cancelled', admin_notes = 'Auto-cancelado (>30 días)'
  WHERE type = 'deposit'
    AND status = 'pending'
    AND created_at < (NOW() - INTERVAL '30 days');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT
    v_count AS cleaned_count,
    FORMAT('%s transacciones canceladas', v_count) AS message;
END;
$$;
