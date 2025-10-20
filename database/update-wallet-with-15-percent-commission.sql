/**
 * Actualización: Sistema de comisión del 23% para AutoRenta
 *
 * Modelo de negocio:
 * - El precio publicado por el locador YA incluye la comisión del 23%
 * - Ejemplo: Auto vale $77, locador publica a $100 ($77 + 23% = $100)
 * - Al completar el booking:
 *   - Locador recibe: $77 (77% del rental_amount)
 *   - AutoRenta recibe: $23 (23% del rental_amount)
 *   - Usuario recupera: $250 de garantía (si no hay daños)
 */

-- ============================================================================
-- FUNCIÓN AUXILIAR: Calcular comisión de AutoRenta (23%)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_platform_fee(
  p_amount NUMERIC
)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- 23% del monto
  RETURN ROUND(p_amount * 0.23, 2);
END;
$$;

COMMENT ON FUNCTION calculate_platform_fee IS
'Calcula la comisión del 23% de AutoRenta sobre un monto dado.';

-- ============================================================================
-- 2. COMPLETAR BOOKING SIN DAÑOS (CON COMISIÓN DEL 23%)
-- ============================================================================

-- Eliminar función existente primero (cambio de firma)
DROP FUNCTION IF EXISTS wallet_complete_booking(UUID, TEXT);

CREATE OR REPLACE FUNCTION wallet_complete_booking(
  p_booking_id UUID,
  p_completion_notes TEXT DEFAULT 'Auto entregado en buenas condiciones'
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  rental_payment_transaction_id UUID,
  deposit_release_transaction_id UUID,
  platform_fee_transaction_id UUID,
  amount_to_owner NUMERIC,
  amount_to_renter NUMERIC,
  platform_fee NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_renter_id UUID;
  v_owner_id UUID;
  v_rental_amount NUMERIC;
  v_deposit_amount NUMERIC;
  v_platform_fee NUMERIC;
  v_amount_to_owner NUMERIC;
  v_rental_payment_tx_id UUID;
  v_deposit_release_tx_id UUID;
  v_platform_fee_tx_id UUID;
  v_deposit_status TEXT;
  v_platform_wallet_id UUID := '00000000-0000-0000-0000-000000000001'; -- ID fijo del wallet de AutoRenta
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
    RETURN QUERY SELECT FALSE, 'Booking no encontrado', NULL::UUID, NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_deposit_status != 'locked' THEN
    RETURN QUERY SELECT FALSE, 'El booking no tiene fondos bloqueados', NULL::UUID, NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- ========================================
  -- CALCULAR COMISIÓN Y MONTO AL PROPIETARIO
  -- ========================================

  v_platform_fee := calculate_platform_fee(v_rental_amount); -- 23%
  v_amount_to_owner := v_rental_amount - v_platform_fee;       -- 77%

  -- ========================================
  -- PASO 1: TRANSFERIR RENTAL PAYMENT AL PROPIETARIO (77%)
  -- ========================================

  INSERT INTO wallet_transactions (
    user_id, type, amount, status, description,
    reference_type, reference_id
  ) VALUES (
    v_owner_id, 'rental_payment_transfer', v_amount_to_owner, 'completed',
    'Pago de alquiler recibido: $' || v_amount_to_owner || ' (77% del total) - ' || p_completion_notes,
    'booking', p_booking_id
  ) RETURNING id INTO v_rental_payment_tx_id;

  -- Desbloquear del renter (quitar rental_amount completo de locked)
  UPDATE user_wallets
  SET
    locked_balance = locked_balance - v_rental_amount,
    updated_at = NOW()
  WHERE user_id = v_renter_id;

  -- Acreditar al owner (agregar solo 77% a available)
  INSERT INTO user_wallets (user_id, available_balance, locked_balance, currency)
  VALUES (v_owner_id, v_amount_to_owner, 0, 'USD')
  ON CONFLICT (user_id)
  DO UPDATE SET
    available_balance = user_wallets.available_balance + v_amount_to_owner,
    updated_at = NOW();

  -- ========================================
  -- PASO 1.5: TRANSFERIR COMISIÓN A AUTORENT A (23%)
  -- ========================================

  -- Crear wallet de la plataforma si no existe
  INSERT INTO user_wallets (user_id, available_balance, locked_balance, currency)
  VALUES (v_platform_wallet_id, 0, 0, 'USD')
  ON CONFLICT (user_id) DO NOTHING;

  -- Registrar transacción de comisión
  INSERT INTO wallet_transactions (
    user_id, type, amount, status, description,
    reference_type, reference_id
  ) VALUES (
    v_platform_wallet_id, 'deposit', v_platform_fee, 'completed',
    'Comisión AutoRenta (23%): $' || v_platform_fee || ' del booking ' || p_booking_id,
    'booking', p_booking_id
  ) RETURNING id INTO v_platform_fee_tx_id;

  -- Acreditar comisión a AutoRenta
  UPDATE user_wallets
  SET
    available_balance = available_balance + v_platform_fee,
    updated_at = NOW()
  WHERE user_id = v_platform_wallet_id;

  -- ========================================
  -- PASO 2: LIBERAR SECURITY DEPOSIT AL USUARIO
  -- ========================================

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
    'Booking completado. $' || v_amount_to_owner || ' pagado al propietario (77%). $' || v_platform_fee || ' comisión AutoRenta (23%). $' || v_deposit_amount || ' devuelto al usuario.',
    v_rental_payment_tx_id,
    v_deposit_release_tx_id,
    v_platform_fee_tx_id,
    v_amount_to_owner,
    v_deposit_amount,
    v_platform_fee;
END;
$$;

COMMENT ON FUNCTION wallet_complete_booking IS
'Completa un booking sin daños: paga al propietario (77%), cobra comisión AutoRenta (23%) y devuelve la garantía completa al usuario.';

-- ============================================================================
-- 3. COMPLETAR BOOKING CON DAÑOS (CON COMISIÓN DEL 23%)
-- ============================================================================

-- Eliminar función existente primero (cambio de firma)
DROP FUNCTION IF EXISTS wallet_complete_booking_with_damages(UUID, NUMERIC, TEXT);

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
  platform_fee_transaction_id UUID,
  amount_to_owner NUMERIC,
  damage_charged NUMERIC,
  amount_returned_to_renter NUMERIC,
  platform_fee NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_renter_id UUID;
  v_owner_id UUID;
  v_rental_amount NUMERIC;
  v_deposit_amount NUMERIC;
  v_platform_fee NUMERIC;
  v_amount_to_owner NUMERIC;
  v_remaining_deposit NUMERIC;
  v_rental_payment_tx_id UUID;
  v_damage_charge_tx_id UUID;
  v_deposit_release_tx_id UUID;
  v_platform_fee_tx_id UUID;
  v_deposit_status TEXT;
  v_platform_wallet_id UUID := '00000000-0000-0000-0000-000000000001'; -- ID fijo del wallet de AutoRenta
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
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_deposit_status != 'locked' THEN
    RETURN QUERY SELECT FALSE, 'El booking no tiene fondos bloqueados',
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validar que el cargo no exceda la garantía
  IF p_damage_amount > v_deposit_amount THEN
    RETURN QUERY SELECT FALSE,
      'El cargo ($' || p_damage_amount || ') excede la garantía disponible ($' || v_deposit_amount || ')',
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Calcular comisión y monto al propietario
  v_platform_fee := calculate_platform_fee(v_rental_amount); -- 23%
  v_amount_to_owner := v_rental_amount - v_platform_fee;      -- 77%

  -- Calcular depósito restante
  v_remaining_deposit := v_deposit_amount - p_damage_amount;

  -- ========================================
  -- PASO 1: TRANSFERIR RENTAL PAYMENT AL PROPIETARIO (77%)
  -- ========================================

  INSERT INTO wallet_transactions (
    user_id, type, amount, status, description,
    reference_type, reference_id
  ) VALUES (
    v_owner_id, 'rental_payment_transfer', v_amount_to_owner, 'completed',
    'Pago de alquiler recibido: $' || v_amount_to_owner || ' (77% del total)',
    'booking', p_booking_id
  ) RETURNING id INTO v_rental_payment_tx_id;

  UPDATE user_wallets
  SET
    locked_balance = locked_balance - v_rental_amount,
    updated_at = NOW()
  WHERE user_id = v_renter_id;

  INSERT INTO user_wallets (user_id, available_balance, locked_balance, currency)
  VALUES (v_owner_id, v_amount_to_owner, 0, 'USD')
  ON CONFLICT (user_id)
  DO UPDATE SET
    available_balance = user_wallets.available_balance + v_amount_to_owner,
    updated_at = NOW();

  -- ========================================
  -- PASO 1.5: TRANSFERIR COMISIÓN A AUTORENTA (23%)
  -- ========================================

  INSERT INTO user_wallets (user_id, available_balance, locked_balance, currency)
  VALUES (v_platform_wallet_id, 0, 0, 'USD')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO wallet_transactions (
    user_id, type, amount, status, description,
    reference_type, reference_id
  ) VALUES (
    v_platform_wallet_id, 'deposit', v_platform_fee, 'completed',
    'Comisión AutoRenta (23%): $' || v_platform_fee || ' del booking ' || p_booking_id,
    'booking', p_booking_id
  ) RETURNING id INTO v_platform_fee_tx_id;

  UPDATE user_wallets
  SET
    available_balance = available_balance + v_platform_fee,
    updated_at = NOW()
  WHERE user_id = v_platform_wallet_id;

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
    'Booking completado con daños. $' || v_amount_to_owner || ' + $' || p_damage_amount || ' pagado al propietario. $' || v_platform_fee || ' comisión AutoRenta (23%). $' || v_remaining_deposit || ' devuelto al usuario.',
    v_rental_payment_tx_id,
    v_damage_charge_tx_id,
    v_deposit_release_tx_id,
    v_platform_fee_tx_id,
    v_amount_to_owner + p_damage_amount,
    p_damage_amount,
    v_remaining_deposit,
    v_platform_fee;
END;
$$;

COMMENT ON FUNCTION wallet_complete_booking_with_damages IS
'Completa un booking con daños: paga al propietario (77%), cobra comisión AutoRenta (23%), cobra daños de la garantía y devuelve el resto al usuario.';
