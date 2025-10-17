-- =====================================================
-- RPC FUNCTION: wallet_lock_funds
-- DESCRIPCIÓN: Bloquea fondos del wallet para una reserva
-- AUTOR: Claude Code
-- FECHA: 2025-10-17
-- =====================================================

-- Drop function if exists
DROP FUNCTION IF EXISTS wallet_lock_funds(UUID, NUMERIC, TEXT);

-- Crear función para bloquear fondos
CREATE OR REPLACE FUNCTION wallet_lock_funds(
  p_booking_id UUID,
  p_amount NUMERIC(10, 2),
  p_description TEXT DEFAULT 'Garantía bloqueada para reserva'
)
RETURNS TABLE (
  transaction_id UUID,
  success BOOLEAN,
  message TEXT,
  new_available_balance NUMERIC(10, 2),
  new_locked_balance NUMERIC(10, 2)
) AS $$
DECLARE
  v_user_id UUID;
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
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'booking_id es requerido';
  END IF;

  -- Obtener balance actual
  SELECT available_balance, locked_balance
  INTO v_current_available, v_current_locked
  FROM wallet_get_balance();

  -- Validar que el usuario tenga fondos suficientes
  IF v_current_available < p_amount THEN
    RETURN QUERY SELECT
      NULL::UUID AS transaction_id,
      FALSE AS success,
      FORMAT('Fondos insuficientes. Disponible: $%s, Requerido: $%s', v_current_available, p_amount) AS message,
      v_current_available AS new_available_balance,
      v_current_locked AS new_locked_balance;
    RETURN;
  END IF;

  -- Verificar que no haya un lock existente para el mismo booking
  IF EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE user_id = v_user_id
      AND reference_id = p_booking_id
      AND reference_type = 'booking'
      AND type = 'lock'
      AND status = 'completed'
  ) THEN
    RETURN QUERY SELECT
      NULL::UUID AS transaction_id,
      FALSE AS success,
      'Ya existe un bloqueo de fondos para esta reserva' AS message,
      v_current_available AS new_available_balance,
      v_current_locked AS new_locked_balance;
    RETURN;
  END IF;

  -- Generar nuevo transaction_id
  v_transaction_id := gen_random_uuid();

  -- Crear transacción de bloqueo (lock)
  -- Esta transacción resta del available_balance
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
    'lock',
    'completed',  -- Se completa inmediatamente
    p_amount,
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
    FORMAT('Fondos bloqueados exitosamente: $%s', p_amount) AS message,
    v_current_available AS new_available_balance,
    v_current_locked AS new_locked_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS (permisos)
-- =====================================================

-- Cualquier usuario autenticado puede bloquear sus propios fondos
GRANT EXECUTE ON FUNCTION wallet_lock_funds(UUID, NUMERIC, TEXT) TO authenticated;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION wallet_lock_funds(UUID, NUMERIC, TEXT) IS 'Bloquea fondos del wallet del usuario autenticado para una reserva (garantía)';

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- Bloquear $50 para una reserva
SELECT * FROM wallet_lock_funds(
  'a6de0b79-0c9f-4b89-9e15-e2c82f4915e4'::UUID,  -- booking_id
  50.00,                                          -- amount
  'Garantía para Toyota Corolla'                 -- description (opcional)
);

-- Resultado esperado (éxito):
-- transaction_id                        | success | message                              | new_available_balance | new_locked_balance
-- 123e4567-e89b-12d3-a456-426614174000 | true    | Fondos bloqueados exitosamente: $50  | 100.00                | 50.00

-- Resultado esperado (fondos insuficientes):
-- transaction_id | success | message                                          | new_available_balance | new_locked_balance
-- NULL           | false   | Fondos insuficientes. Disponible: $30, Requerido: $50 | 30.00                 | 0.00
*/
