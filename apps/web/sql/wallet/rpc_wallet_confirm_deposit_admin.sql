-- =====================================================
-- RPC FUNCTION: wallet_confirm_deposit_admin
-- DESCRIPCIÓN: Confirma un depósito pendiente (versión admin)
-- AUTOR: Claude Code
-- FECHA: 2025-10-20
-- PROPÓSITO: Versión sin dependencias de auth para uso de webhooks y admin
-- =====================================================

DROP FUNCTION IF EXISTS wallet_confirm_deposit_admin(UUID, UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION wallet_confirm_deposit_admin(
  p_user_id UUID,
  p_transaction_id UUID,
  p_provider_transaction_id TEXT,
  p_provider_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_available_balance NUMERIC(10, 2),
  new_withdrawable_balance NUMERIC(10, 2),
  new_total_balance NUMERIC(10, 2)
) AS $$
DECLARE
  v_transaction RECORD;
  v_available NUMERIC(10, 2);
  v_locked NUMERIC(10, 2);
  v_floor NUMERIC(10, 2);
  v_non_withdrawable NUMERIC(10, 2);
  v_withdrawable NUMERIC(10, 2);
BEGIN
  -- Buscar la transacción de depósito
  SELECT * INTO v_transaction
  FROM wallet_transactions
  WHERE id = p_transaction_id
    AND user_id = p_user_id
    AND type = 'deposit'
    AND status = 'pending';

  -- Verificar que existe la transacción
  IF v_transaction IS NULL THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Transacción de depósito no encontrada o ya fue procesada' AS message,
      NULL::NUMERIC(10, 2) AS new_available_balance,
      NULL::NUMERIC(10, 2) AS new_withdrawable_balance,
      NULL::NUMERIC(10, 2) AS new_total_balance;
    RETURN;
  END IF;

  -- Actualizar la transacción a 'completed'
  UPDATE wallet_transactions
  SET
    status = 'completed',
    provider_transaction_id = p_provider_transaction_id,
    provider_metadata = provider_metadata || p_provider_metadata || jsonb_build_object('confirmed_at', NOW()),
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Asegurar existencia del wallet
  INSERT INTO user_wallets (user_id, currency)
  VALUES (p_user_id, v_transaction.currency)
  ON CONFLICT (user_id) DO NOTHING;

  -- Actualizar piso no reembolsable si es necesario
  IF NOT v_transaction.is_withdrawable THEN
    UPDATE user_wallets
    SET
      non_withdrawable_floor = GREATEST(non_withdrawable_floor, v_transaction.amount),
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Calcular balance disponible (deposits + refunds + bonuses - charges)
  SELECT COALESCE(
    SUM(CASE
      WHEN type IN ('deposit', 'refund', 'bonus') THEN amount
      WHEN type IN ('charge') THEN -amount
      ELSE 0
    END),
    0
  )
  INTO v_available
  FROM wallet_transactions
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND type NOT IN ('lock', 'unlock');

  -- Calcular balance bloqueado
  SELECT COALESCE(
    SUM(CASE
      WHEN type = 'lock' THEN amount
      WHEN type = 'unlock' THEN -amount
      ELSE 0
    END),
    0
  )
  INTO v_locked
  FROM wallet_transactions
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND type IN ('lock', 'unlock');

  -- Obtener piso de fondos no reembolsables
  SELECT non_withdrawable_floor INTO v_floor
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_floor IS NULL THEN
    v_floor := 0;
  END IF;

  -- Calcular balances retirables vs crédito de plataforma
  v_non_withdrawable := LEAST(v_available, v_floor);
  v_withdrawable := GREATEST(v_available - v_non_withdrawable, 0);

  -- Retornar éxito con balance actualizado
  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Depósito confirmado exitosamente: $%s acreditados a tu wallet', v_transaction.amount) AS message,
    v_available AS new_available_balance,
    v_withdrawable AS new_withdrawable_balance,
    (v_available + v_locked) AS new_total_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS (permisos)
-- =====================================================

-- Solo service_role puede ejecutar esta función (webhooks, admin)
GRANT EXECUTE ON FUNCTION wallet_confirm_deposit_admin(UUID, UUID, TEXT, JSONB) TO service_role;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION wallet_confirm_deposit_admin(UUID, UUID, TEXT, JSONB) IS
'Confirma un depósito pendiente sin requerir contexto de autenticación de usuario.
Uso: webhooks, operaciones administrativas, confirmación manual de depósitos.
Calcula y retorna balance actualizado sin llamar a funciones que requieren auth.uid().';

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- Uso desde webhook (con service_role key):
SELECT * FROM wallet_confirm_deposit_admin(
  'acc5fb2d-5ba5-492c-9abd-711a13a3b4ff'::UUID,  -- user_id
  'de0d1150-f237-4f42-95ef-1333cd9db21f'::UUID,  -- transaction_id
  '130624829514',                                  -- provider_transaction_id
  '{
    "status": "approved",
    "status_detail": "accredited",
    "payment_type_id": "account_money",
    "transaction_amount": 250.00,
    "date_approved": "2025-10-20T11:33:00.000Z"
  }'::JSONB
);

-- Resultado esperado:
-- success | message                                                       | new_available_balance | new_withdrawable_balance | new_total_balance
-- true    | Depósito confirmado exitosamente: $250.00 acreditados...      | 250.00                | 0.00                      | 250.00
*/
