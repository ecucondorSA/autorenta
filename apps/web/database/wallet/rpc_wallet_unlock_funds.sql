-- =====================================================
-- RPC FUNCTION: wallet_unlock_funds
-- DESCRIPCIÓN: Desbloquea fondos previamente bloqueados
-- AUTOR: Claude Code
-- FECHA: 2025-10-17
-- =====================================================

-- Drop function if exists
DROP FUNCTION IF EXISTS wallet_unlock_funds(UUID, TEXT);

-- Crear función para desbloquear fondos
CREATE OR REPLACE FUNCTION wallet_unlock_funds(
  p_booking_id UUID,
  p_description TEXT DEFAULT 'Fondos desbloqueados'
)
RETURNS TABLE (
  transaction_id UUID,
  success BOOLEAN,
  message TEXT,
  unlocked_amount NUMERIC(10, 2),
  new_available_balance NUMERIC(10, 2),
  new_locked_balance NUMERIC(10, 2)
) AS $$
DECLARE
  v_user_id UUID;
  v_lock_transaction_id UUID;
  v_lock_amount NUMERIC(10, 2);
  v_current_available NUMERIC(10, 2);
  v_current_locked NUMERIC(10, 2);
  v_transaction_id UUID;
BEGIN
  -- Obtener el user_id del usuario autenticado
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar parámetros
  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'booking_id es requerido';
  END IF;

  -- Buscar la transacción de lock asociada al booking
  SELECT id, amount
  INTO v_lock_transaction_id, v_lock_amount
  FROM wallet_transactions
  WHERE user_id = v_user_id
    AND reference_id = p_booking_id
    AND reference_type = 'booking'
    AND type = 'lock'
    AND status = 'completed'
  LIMIT 1;

  -- Verificar que exista un lock para este booking
  IF v_lock_transaction_id IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID AS transaction_id,
      FALSE AS success,
      'No se encontró un bloqueo de fondos activo para esta reserva' AS message,
      0.00::NUMERIC(10, 2) AS unlocked_amount,
      NULL::NUMERIC(10, 2) AS new_available_balance,
      NULL::NUMERIC(10, 2) AS new_locked_balance;
    RETURN;
  END IF;

  -- Verificar que no haya un unlock ya realizado para este booking
  IF EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE user_id = v_user_id
      AND reference_id = p_booking_id
      AND reference_type = 'booking'
      AND type = 'unlock'
      AND status = 'completed'
  ) THEN
    RETURN QUERY SELECT
      NULL::UUID AS transaction_id,
      FALSE AS success,
      'Los fondos ya fueron desbloqueados previamente para esta reserva' AS message,
      0.00::NUMERIC(10, 2) AS unlocked_amount,
      NULL::NUMERIC(10, 2) AS new_available_balance,
      NULL::NUMERIC(10, 2) AS new_locked_balance;
    RETURN;
  END IF;

  -- Generar nuevo transaction_id
  v_transaction_id := gen_random_uuid();

  -- Crear transacción de unlock
  -- Esta transacción devuelve el monto bloqueado al available_balance
  INSERT INTO wallet_transactions (
    id,
    user_id,
    type,
    status,
    amount,
    currency,
    reference_type,
    reference_id,
    provider,
    description
  ) VALUES (
    v_transaction_id,
    v_user_id,
    'unlock',
    'completed',  -- Se completa inmediatamente
    v_lock_amount,
    'USD',
    'booking',
    p_booking_id,
    'internal',
    p_description
  );

  -- Obtener nuevos balances
  SELECT available_balance, locked_balance
  INTO v_current_available, v_current_locked
  FROM wallet_get_balance();

  -- Retornar resultado exitoso
  RETURN QUERY SELECT
    v_transaction_id AS transaction_id,
    TRUE AS success,
    FORMAT('Fondos desbloqueados exitosamente: $%s', v_lock_amount) AS message,
    v_lock_amount AS unlocked_amount,
    v_current_available AS new_available_balance,
    v_current_locked AS new_locked_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS (permisos)
-- =====================================================

-- Cualquier usuario autenticado puede desbloquear sus propios fondos
GRANT EXECUTE ON FUNCTION wallet_unlock_funds(UUID, TEXT) TO authenticated;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION wallet_unlock_funds(UUID, TEXT) IS 'Desbloquea fondos previamente bloqueados para una reserva (devuelve fondos al available_balance)';

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- Desbloquear fondos después de completar la reserva
SELECT * FROM wallet_unlock_funds(
  'a6de0b79-0c9f-4b89-9e15-e2c82f4915e4'::UUID,  -- booking_id
  'Reserva completada exitosamente'              -- description (opcional)
);

-- Resultado esperado (éxito):
-- transaction_id                        | success | message                                | unlocked_amount | new_available_balance | new_locked_balance
-- 789e4567-e89b-12d3-a456-426614174000 | true    | Fondos desbloqueados exitosamente: $50 | 50.00           | 150.00                | 0.00

-- Resultado esperado (no hay lock):
-- transaction_id | success | message                                                       | unlocked_amount | new_available_balance | new_locked_balance
-- NULL           | false   | No se encontró un bloqueo de fondos activo para esta reserva  | 0.00            | NULL                  | NULL
*/
