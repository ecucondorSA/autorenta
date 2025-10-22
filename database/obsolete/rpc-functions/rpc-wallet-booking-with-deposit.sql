/**
 * RPC Functions para sistema dual de rental payment + security deposit
 *
 * Funciones incluidas:
 * 1. wallet_lock_rental_and_deposit() - Bloquea ambos montos al confirmar booking
 * 2. wallet_complete_booking() - Finaliza booking: paga al propietario y libera garantía
 * 3. wallet_complete_booking_with_damages() - Finaliza con cargo de daños
 */

-- ============================================================================
-- 1. BLOQUEAR RENTAL + DEPOSIT AL CONFIRMAR BOOKING
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_lock_rental_and_deposit(
  p_booking_id UUID,
  p_rental_amount NUMERIC,
  p_deposit_amount NUMERIC DEFAULT 250 -- Default $250 USD
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  rental_lock_transaction_id UUID,
  deposit_lock_transaction_id UUID,
  total_locked NUMERIC,
  new_available_balance NUMERIC,
  new_locked_balance NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_renter_id UUID;
  v_current_balance NUMERIC;
  v_total_amount NUMERIC;
  v_rental_tx_id UUID;
  v_deposit_tx_id UUID;
BEGIN
  -- Calcular total a bloquear
  v_total_amount := p_rental_amount + p_deposit_amount;

  -- Obtener renter_id del booking
  SELECT renter_id INTO v_renter_id
  FROM bookings
  WHERE id = p_booking_id;

  IF v_renter_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Booking no encontrado', NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Verificar balance disponible
  SELECT available_balance INTO v_current_balance
  FROM user_wallets
  WHERE user_id = v_renter_id;

  IF v_current_balance IS NULL THEN
    -- Crear wallet si no existe
    INSERT INTO user_wallets (user_id, available_balance, locked_balance, currency)
    VALUES (v_renter_id, 0, 0, 'USD');
    v_current_balance := 0;
  END IF;

  IF v_current_balance < v_total_amount THEN
    RETURN QUERY SELECT FALSE,
      'Fondos insuficientes. Disponible: $' || v_current_balance ||
      ', Requerido: $' || v_total_amount ||
      ' (Alquiler: $' || p_rental_amount || ' + Garantía: $' || p_deposit_amount || ')',
      NULL::UUID, NULL::UUID, 0::NUMERIC, v_current_balance, 0::NUMERIC;
    RETURN;
  END IF;

  -- Crear transacción de bloqueo del RENTAL PAYMENT
  INSERT INTO wallet_transactions (
    user_id, type, amount, status, description,
    reference_type, reference_id
  ) VALUES (
    v_renter_id, 'rental_payment_lock', p_rental_amount, 'completed',
    'Pago de alquiler bloqueado: $' || p_rental_amount,
    'booking', p_booking_id
  ) RETURNING id INTO v_rental_tx_id;

  -- Crear transacción de bloqueo del SECURITY DEPOSIT
  INSERT INTO wallet_transactions (
    user_id, type, amount, status, description,
    reference_type, reference_id
  ) VALUES (
    v_renter_id, 'security_deposit_lock', p_deposit_amount, 'completed',
    'Garantía bloqueada: $' || p_deposit_amount || ' (se devuelve al finalizar)',
    'booking', p_booking_id
  ) RETURNING id INTO v_deposit_tx_id;

  -- Actualizar wallet: mover AMBOS montos de available a locked
  UPDATE user_wallets
  SET
    available_balance = available_balance - v_total_amount,
    locked_balance = locked_balance + v_total_amount,
    updated_at = NOW()
  WHERE user_id = v_renter_id;

  -- Actualizar booking con ambos locks
  UPDATE bookings
  SET
    rental_amount_cents = (p_rental_amount * 100)::INTEGER,
    deposit_amount_cents = (p_deposit_amount * 100)::INTEGER,
    rental_lock_transaction_id = v_rental_tx_id,
    deposit_lock_transaction_id = v_deposit_tx_id,
    deposit_status = 'locked',
    status = 'confirmed' -- Booking confirmado con pago bloqueado
  WHERE id = p_booking_id;

  -- Retornar resultado
  RETURN QUERY
  SELECT
    TRUE,
    'Fondos bloqueados: $' || p_rental_amount || ' (alquiler) + $' || p_deposit_amount || ' (garantía) = $' || v_total_amount,
    v_rental_tx_id,
    v_deposit_tx_id,
    v_total_amount,
    (SELECT available_balance FROM user_wallets WHERE user_id = v_renter_id),
    (SELECT locked_balance FROM user_wallets WHERE user_id = v_renter_id);
END;
$$;

COMMENT ON FUNCTION wallet_lock_rental_and_deposit IS
'Bloquea tanto el pago del alquiler como la garantía al confirmar un booking.
El pago se transfiere al propietario, la garantía se devuelve al usuario.';

-- ============================================================================
-- 2. COMPLETAR BOOKING SIN DAÑOS (pago al propietario, garantía al usuario)
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_complete_booking(
  p_booking_id UUID,
  p_completion_notes TEXT DEFAULT 'Auto entregado en buenas condiciones'
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  rental_payment_transaction_id UUID,
  deposit_release_transaction_id UUID,
  amount_to_owner NUMERIC,
  amount_to_renter NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_renter_id UUID;
  v_owner_id UUID;
  v_rental_amount NUMERIC;
  v_deposit_amount NUMERIC;
  v_rental_payment_tx_id UUID;
  v_deposit_release_tx_id UUID;
  v_deposit_status TEXT;
BEGIN
  -- Obtener datos del booking
  SELECT
    b.renter_id,
    c.owner_id,
    (b.rental_amount_cents / 100.0),
    (b.deposit_amount_cents / 100.0),
    b.deposit_status
  INTO v_renter_id, v_owner_id, v_rental_amount, v_deposit_amount, v_deposit_status
  FROM bookings b
  JOIN cars c ON b.car_id = c.id
  WHERE b.id = p_booking_id;

  IF v_renter_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Booking no encontrado', NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_deposit_status != 'locked' THEN
    RETURN QUERY SELECT FALSE, 'El booking no tiene fondos bloqueados', NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- ========================================
  -- PASO 1: TRANSFERIR RENTAL PAYMENT AL PROPIETARIO
  -- ========================================

  -- Crear transacción de pago al propietario
  INSERT INTO wallet_transactions (
    user_id, type, amount, status, description,
    reference_type, reference_id
  ) VALUES (
    v_owner_id, 'rental_payment_transfer', v_rental_amount, 'completed',
    'Pago de alquiler recibido: $' || v_rental_amount || ' - ' || p_completion_notes,
    'booking', p_booking_id
  ) RETURNING id INTO v_rental_payment_tx_id;

  -- Desbloquear del renter (quitar rental_amount de locked)
  UPDATE user_wallets
  SET
    locked_balance = locked_balance - v_rental_amount,
    updated_at = NOW()
  WHERE user_id = v_renter_id;

  -- Acreditar al owner (agregar rental_amount a available)
  INSERT INTO user_wallets (user_id, available_balance, locked_balance, currency)
  VALUES (v_owner_id, v_rental_amount, 0, 'USD')
  ON CONFLICT (user_id)
  DO UPDATE SET
    available_balance = user_wallets.available_balance + v_rental_amount,
    updated_at = NOW();

  -- ========================================
  -- PASO 2: LIBERAR SECURITY DEPOSIT AL USUARIO
  -- ========================================

  -- Crear transacción de liberación de garantía AL MISMO USUARIO
  INSERT INTO wallet_transactions (
    user_id, type, amount, status, description,
    reference_type, reference_id
  ) VALUES (
    v_renter_id, 'security_deposit_release', v_deposit_amount, 'completed',
    'Garantía devuelta: $' || v_deposit_amount || ' - ' || p_completion_notes,
    'booking', p_booking_id
  ) RETURNING id INTO v_deposit_release_tx_id;

  -- Liberar garantía del renter: mover de locked a available
  UPDATE user_wallets
  SET
    locked_balance = locked_balance - v_deposit_amount,
    available_balance = available_balance + v_deposit_amount,
    updated_at = NOW()
  WHERE user_id = v_renter_id;

  -- ========================================
  -- PASO 3: ACTUALIZAR BOOKING
  -- ========================================

  UPDATE bookings
  SET
    deposit_status = 'released',
    rental_payment_transaction_id = v_rental_payment_tx_id,
    deposit_release_transaction_id = v_deposit_release_tx_id,
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_booking_id;

  RETURN QUERY SELECT
    TRUE,
    'Booking completado. $' || v_rental_amount || ' pagado al propietario. $' || v_deposit_amount || ' devuelto al usuario.',
    v_rental_payment_tx_id,
    v_deposit_release_tx_id,
    v_rental_amount,
    v_deposit_amount;
END;
$$;

COMMENT ON FUNCTION wallet_complete_booking IS
'Completa un booking sin daños: paga al propietario y devuelve la garantía completa al usuario.';

-- ============================================================================
-- 3. COMPLETAR BOOKING CON DAÑOS (cobrar daños de la garantía)
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_complete_booking_with_damages(
  p_booking_id UUID,
  p_damage_amount NUMERIC,
  p_damage_description TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  rental_payment_transaction_id UUID,
  damage_charge_transaction_id UUID,
  deposit_release_transaction_id UUID,
  amount_to_owner NUMERIC,
  damage_charged NUMERIC,
  amount_returned_to_renter NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_renter_id UUID;
  v_owner_id UUID;
  v_rental_amount NUMERIC;
  v_deposit_amount NUMERIC;
  v_remaining_deposit NUMERIC;
  v_rental_payment_tx_id UUID;
  v_damage_charge_tx_id UUID;
  v_deposit_release_tx_id UUID;
  v_deposit_status TEXT;
BEGIN
  -- Obtener datos del booking
  SELECT
    b.renter_id,
    c.owner_id,
    (b.rental_amount_cents / 100.0),
    (b.deposit_amount_cents / 100.0),
    b.deposit_status
  INTO v_renter_id, v_owner_id, v_rental_amount, v_deposit_amount, v_deposit_status
  FROM bookings b
  JOIN cars c ON b.car_id = c.id
  WHERE b.id = p_booking_id;

  IF v_renter_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Booking no encontrado',
      NULL::UUID, NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_deposit_status != 'locked' THEN
    RETURN QUERY SELECT FALSE, 'El booking no tiene fondos bloqueados',
      NULL::UUID, NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validar que el cargo no exceda la garantía
  IF p_damage_amount > v_deposit_amount THEN
    RETURN QUERY SELECT FALSE,
      'El cargo ($' || p_damage_amount || ') excede la garantía disponible ($' || v_deposit_amount || ')',
      NULL::UUID, NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Calcular depósito restante
  v_remaining_deposit := v_deposit_amount - p_damage_amount;

  -- ========================================
  -- PASO 1: TRANSFERIR RENTAL PAYMENT AL PROPIETARIO
  -- ========================================

  INSERT INTO wallet_transactions (
    user_id, type, amount, status, description,
    reference_type, reference_id
  ) VALUES (
    v_owner_id, 'rental_payment_transfer', v_rental_amount, 'completed',
    'Pago de alquiler recibido: $' || v_rental_amount,
    'booking', p_booking_id
  ) RETURNING id INTO v_rental_payment_tx_id;

  UPDATE user_wallets
  SET
    locked_balance = locked_balance - v_rental_amount,
    updated_at = NOW()
  WHERE user_id = v_renter_id;

  INSERT INTO user_wallets (user_id, available_balance, locked_balance, currency)
  VALUES (v_owner_id, v_rental_amount, 0, 'USD')
  ON CONFLICT (user_id)
  DO UPDATE SET
    available_balance = user_wallets.available_balance + v_rental_amount,
    updated_at = NOW();

  -- ========================================
  -- PASO 2: COBRAR DAÑOS DE LA GARANTÍA AL PROPIETARIO
  -- ========================================

  INSERT INTO wallet_transactions (
    user_id, type, amount, status, description,
    reference_type, reference_id
  ) VALUES (
    v_owner_id, 'security_deposit_charge', p_damage_amount, 'completed',
    'Cargo por daños: $' || p_damage_amount || ' - ' || p_damage_description,
    'booking', p_booking_id
  ) RETURNING id INTO v_damage_charge_tx_id;

  -- Desbloquear del renter y transferir al owner
  UPDATE user_wallets
  SET
    locked_balance = locked_balance - p_damage_amount,
    updated_at = NOW()
  WHERE user_id = v_renter_id;

  UPDATE user_wallets
  SET
    available_balance = available_balance + p_damage_amount,
    updated_at = NOW()
  WHERE user_id = v_owner_id;

  -- ========================================
  -- PASO 3: LIBERAR GARANTÍA RESTANTE AL USUARIO
  -- ========================================

  IF v_remaining_deposit > 0 THEN
    INSERT INTO wallet_transactions (
      user_id, type, amount, status, description,
      reference_type, reference_id
    ) VALUES (
      v_renter_id, 'security_deposit_release', v_remaining_deposit, 'completed',
      'Garantía devuelta (parcial): $' || v_remaining_deposit || ' (se cobraron $' || p_damage_amount || ' por daños)',
      'booking', p_booking_id
    ) RETURNING id INTO v_deposit_release_tx_id;

    UPDATE user_wallets
    SET
      locked_balance = locked_balance - v_remaining_deposit,
      available_balance = available_balance + v_remaining_deposit,
      updated_at = NOW()
    WHERE user_id = v_renter_id;
  END IF;

  -- ========================================
  -- PASO 4: ACTUALIZAR BOOKING
  -- ========================================

  UPDATE bookings
  SET
    deposit_status = CASE
      WHEN v_remaining_deposit = 0 THEN 'fully_charged'
      ELSE 'partially_charged'
    END,
    rental_payment_transaction_id = v_rental_payment_tx_id,
    deposit_release_transaction_id = v_deposit_release_tx_id,
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_booking_id;

  RETURN QUERY SELECT
    TRUE,
    'Booking completado con daños. $' || v_rental_amount || ' + $' || p_damage_amount || ' pagado al propietario. $' || v_remaining_deposit || ' devuelto al usuario.',
    v_rental_payment_tx_id,
    v_damage_charge_tx_id,
    v_deposit_release_tx_id,
    v_rental_amount + p_damage_amount,
    p_damage_amount,
    v_remaining_deposit;
END;
$$;

COMMENT ON FUNCTION wallet_complete_booking_with_damages IS
'Completa un booking con daños: paga al propietario, cobra daños de la garantía y devuelve el resto al usuario.';
