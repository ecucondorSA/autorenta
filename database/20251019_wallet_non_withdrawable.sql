/**
 * Wallet Non-Withdrawable Floor & Transaction Flags
 *
 * - Adds `is_withdrawable` flag to wallet_transactions
 * - Adds `non_withdrawable_floor` column to user_wallets
 * - Backfills existing data and enforces defaults
 * - Creates helper RPC to convert platform credit into withdrawable funds
 */

-- ===============================
-- 1. Columns & Constraints
-- ===============================

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS is_withdrawable BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE user_wallets
  ADD COLUMN IF NOT EXISTS non_withdrawable_floor NUMERIC(10,2) NOT NULL DEFAULT 0
    CHECK (non_withdrawable_floor >= 0);

ALTER TABLE user_wallets
  DROP CONSTRAINT IF EXISTS user_wallets_floor_check;

-- ===============================
-- 2. Backfill Data
-- ===============================

-- Treat existing deposits as platform credit by default
UPDATE wallet_transactions
SET is_withdrawable = FALSE
WHERE type = 'deposit';

-- Ensure every user with deposits has at least a $250 floor
UPDATE user_wallets uw
SET non_withdrawable_floor = GREATEST(non_withdrawable_floor, 250)
WHERE EXISTS (
  SELECT 1
  FROM wallet_transactions wt
  WHERE wt.user_id = uw.user_id
    AND wt.type = 'deposit'
    AND wt.status = 'completed'
);


-- ===============================
-- 3. Helper: Convert credit to withdrawable
-- ===============================

DROP FUNCTION IF EXISTS wallet_convert_to_withdrawable(UUID, TEXT);

CREATE OR REPLACE FUNCTION wallet_convert_to_withdrawable(
  p_transaction_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  transaction_id UUID,
  new_non_withdrawable_floor NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tx RECORD;
BEGIN
  SELECT *
  INTO v_tx
  FROM wallet_transactions
  WHERE id = p_transaction_id
    AND type = 'deposit';

  IF v_tx IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Transacción no encontrada o no es un depósito', NULL::UUID, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_tx.status <> 'completed' THEN
    RETURN QUERY SELECT FALSE, 'Solo se pueden convertir depósitos completados', v_tx.id, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_tx.is_withdrawable THEN
    RETURN QUERY SELECT TRUE, 'El depósito ya era retirabile', v_tx.id, (
      SELECT non_withdrawable_floor FROM user_wallets WHERE user_id = v_tx.user_id
    );
    RETURN;
  END IF;

  UPDATE wallet_transactions
  SET
    is_withdrawable = TRUE,
    admin_notes = COALESCE(admin_notes, '') ||
      E'\n[wallet_convert_to_withdrawable] ' || COALESCE(p_reason, 'Conversión manual a fondos retirables'),
    updated_at = NOW()
  WHERE id = v_tx.id;

  INSERT INTO user_wallets (user_id, currency)
  VALUES (v_tx.user_id, v_tx.currency)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE user_wallets
  SET
    non_withdrawable_floor = GREATEST(non_withdrawable_floor - v_tx.amount, 0),
    updated_at = NOW()
  WHERE user_id = v_tx.user_id;

  RETURN QUERY
  SELECT
    TRUE,
    'Depósito convertido a fondos retirables exitosamente',
    v_tx.id,
    (SELECT non_withdrawable_floor FROM user_wallets WHERE user_id = v_tx.user_id);
END;
$$;

COMMENT ON FUNCTION wallet_convert_to_withdrawable(UUID, TEXT) IS
'Convierte un depósito no retirable en fondos retirables y ajusta el floor de no reembolso';

GRANT EXECUTE ON FUNCTION wallet_convert_to_withdrawable(UUID, TEXT) TO service_role;

-- ===============================
-- FIN
-- ===============================
