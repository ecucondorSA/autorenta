/**
 * RPC Function: Sistema de Confirmación Bilateral
 *
 * booking_confirm_and_release()
 * - Permite al propietario o usuario confirmar la finalización del booking
 * - Si AMBOS han confirmado, libera fondos automáticamente
 * - Integrado con sistema de calificaciones/reviews
 */

CREATE OR REPLACE FUNCTION booking_confirm_and_release(
  p_booking_id UUID,
  p_confirming_user_id UUID,
  p_has_damages BOOLEAN DEFAULT FALSE,
  p_damage_amount NUMERIC DEFAULT 0,
  p_damage_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  completion_status TEXT,
  funds_released BOOLEAN,
  owner_confirmed BOOLEAN,
  renter_confirmed BOOLEAN,
  waiting_for TEXT -- 'owner', 'renter', 'none' (si ya se completó)
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_renter_id UUID;
  v_owner_id UUID;
  v_is_owner BOOLEAN;
  v_is_renter BOOLEAN;
  v_owner_confirmed BOOLEAN;
  v_renter_confirmed BOOLEAN;
  v_rental_amount NUMERIC;
  v_deposit_amount NUMERIC;
  v_current_status TEXT;
  v_deposit_status TEXT;
  v_new_completion_status TEXT;
  v_funds_released BOOLEAN := FALSE;
BEGIN
  -- Obtener datos del booking
  SELECT
    b.renter_id,
    c.owner_id,
    b.owner_confirmed_delivery,
    b.renter_confirmed_payment,
    (b.rental_amount_cents / 100.0),
    (b.deposit_amount_cents / 100.0),
    b.completion_status,
    b.deposit_status
  INTO
    v_renter_id,
    v_owner_id,
    v_owner_confirmed,
    v_renter_confirmed,
    v_rental_amount,
    v_deposit_amount,
    v_current_status,
    v_deposit_status
  FROM bookings b
  JOIN cars c ON b.car_id = c.id
  WHERE b.id = p_booking_id;

  IF v_renter_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Booking no encontrado',
      'error'::TEXT, FALSE, FALSE, FALSE, 'none'::TEXT;
    RETURN;
  END IF;

  -- Verificar que el booking esté en estado returned
  IF v_current_status != 'returned' THEN
    RETURN QUERY SELECT FALSE,
      'El booking debe estar en estado "returned" para confirmar. Estado actual: ' || v_current_status,
      v_current_status, FALSE, v_owner_confirmed, v_renter_confirmed,
      CASE
        WHEN NOT v_owner_confirmed AND NOT v_renter_confirmed THEN 'both'
        WHEN NOT v_owner_confirmed THEN 'owner'
        WHEN NOT v_renter_confirmed THEN 'renter'
        ELSE 'none'
      END;
    RETURN;
  END IF;

  -- Determinar quién está confirmando
  v_is_owner := (p_confirming_user_id = v_owner_id);
  v_is_renter := (p_confirming_user_id = v_renter_id);

  IF NOT v_is_owner AND NOT v_is_renter THEN
    RETURN QUERY SELECT FALSE,
      'El usuario no es ni el propietario ni el locatario de este booking',
      v_current_status, FALSE, v_owner_confirmed, v_renter_confirmed, 'none'::TEXT;
    RETURN;
  END IF;

  -- ========================================
  -- CONFIRMACIÓN DEL PROPIETARIO (LOCADOR)
  -- ========================================
  IF v_is_owner THEN
    IF v_owner_confirmed THEN
      RETURN QUERY SELECT FALSE,
        'El propietario ya confirmó la entrega del vehículo',
        v_current_status, FALSE, TRUE, v_renter_confirmed,
        CASE WHEN NOT v_renter_confirmed THEN 'renter' ELSE 'none' END;
      RETURN;
    END IF;

    -- Marcar confirmación del propietario
    UPDATE bookings
    SET
      owner_confirmed_delivery = TRUE,
      owner_confirmation_at = NOW(),
      owner_reported_damages = p_has_damages,
      owner_damage_amount = p_damage_amount,
      owner_damage_description = p_damage_description
    WHERE id = p_booking_id;

    v_owner_confirmed := TRUE;
  END IF;

  -- ========================================
  -- CONFIRMACIÓN DEL LOCATARIO (RENTER)
  -- ========================================
  IF v_is_renter THEN
    IF v_renter_confirmed THEN
      RETURN QUERY SELECT FALSE,
        'El locatario ya confirmó liberar el pago',
        v_current_status, FALSE, v_owner_confirmed, TRUE,
        CASE WHEN NOT v_owner_confirmed THEN 'owner' ELSE 'none' END;
      RETURN;
    END IF;

    -- Marcar confirmación del locatario
    UPDATE bookings
    SET
      renter_confirmed_payment = TRUE,
      renter_confirmation_at = NOW()
    WHERE id = p_booking_id;

    v_renter_confirmed := TRUE;
  END IF;

  -- ========================================
  -- VERIFICAR SI AMBOS HAN CONFIRMADO
  -- ========================================
  IF v_owner_confirmed AND v_renter_confirmed THEN
    -- AMBOS CONFIRMARON → LIBERAR FONDOS AUTOMÁTICAMENTE

    -- Determinar si hay daños reportados
    SELECT owner_reported_damages, owner_damage_amount
    INTO p_has_damages, p_damage_amount
    FROM bookings
    WHERE id = p_booking_id;

    IF p_has_damages AND p_damage_amount > 0 THEN
      -- ========================================
      -- CASO 1: HAY DAÑOS REPORTADOS
      -- ========================================
      DECLARE
        v_complete_result RECORD;
      BEGIN
        -- Llamar a wallet_complete_booking_with_damages
        SELECT * INTO v_complete_result
        FROM wallet_complete_booking_with_damages(
          p_booking_id,
          p_damage_amount,
          p_damage_description
        );

        IF NOT v_complete_result.success THEN
          RAISE EXCEPTION 'Error al completar booking con daños: %', v_complete_result.message;
        END IF;

        v_new_completion_status := 'funds_released';
        v_funds_released := TRUE;

        -- Actualizar booking
        UPDATE bookings
        SET
          completion_status = 'funds_released',
          funds_released_at = NOW(),
          status = 'completed'
        WHERE id = p_booking_id;

        RETURN QUERY SELECT TRUE,
          'Confirmaciones completadas. Fondos liberados con cargo por daños de $' ||
          p_damage_amount || '. Propietario recibió $' || v_complete_result.amount_to_owner ||
          '. Usuario recuperó $' || v_complete_result.amount_returned_to_renter || ' en su wallet.',
          'funds_released'::TEXT,
          TRUE, -- funds_released
          TRUE, -- owner_confirmed
          TRUE, -- renter_confirmed
          'none'::TEXT; -- waiting_for
      END;
    ELSE
      -- ========================================
      -- CASO 2: SIN DAÑOS
      -- ========================================
      DECLARE
        v_complete_result RECORD;
      BEGIN
        -- Llamar a wallet_complete_booking (sin daños)
        SELECT * INTO v_complete_result
        FROM wallet_complete_booking(
          p_booking_id,
          'Confirmado por ambas partes - vehículo en buenas condiciones'
        );

        IF NOT v_complete_result.success THEN
          RAISE EXCEPTION 'Error al completar booking: %', v_complete_result.message;
        END IF;

        v_new_completion_status := 'funds_released';
        v_funds_released := TRUE;

        -- Actualizar booking
        UPDATE bookings
        SET
          completion_status = 'funds_released',
          funds_released_at = NOW(),
          status = 'completed'
        WHERE id = p_booking_id;

        RETURN QUERY SELECT TRUE,
          'Confirmaciones completadas. Fondos liberados exitosamente. Propietario recibió $' ||
          v_complete_result.amount_to_owner || '. Usuario recuperó $' ||
          v_complete_result.amount_to_renter || ' en su wallet.',
          'funds_released'::TEXT,
          TRUE, -- funds_released
          TRUE, -- owner_confirmed
          TRUE, -- renter_confirmed
          'none'::TEXT; -- waiting_for
      END;
    END IF;
  ELSE
    -- ========================================
    -- AÚN FALTA UNA CONFIRMACIÓN
    -- ========================================

    -- Determinar nuevo completion_status
    IF v_owner_confirmed AND NOT v_renter_confirmed THEN
      v_new_completion_status := 'pending_renter';
    ELSIF v_renter_confirmed AND NOT v_owner_confirmed THEN
      v_new_completion_status := 'pending_owner';
    ELSE
      v_new_completion_status := 'pending_both';
    END IF;

    -- Actualizar completion_status
    UPDATE bookings
    SET completion_status = v_new_completion_status
    WHERE id = p_booking_id;

    RETURN QUERY SELECT TRUE,
      'Confirmación registrada. Esperando confirmación de ' ||
      CASE
        WHEN NOT v_owner_confirmed THEN 'el propietario'
        WHEN NOT v_renter_confirmed THEN 'el locatario'
        ELSE 'ambas partes'
      END,
      v_new_completion_status,
      FALSE, -- funds_released
      v_owner_confirmed,
      v_renter_confirmed,
      CASE
        WHEN NOT v_owner_confirmed THEN 'owner'
        WHEN NOT v_renter_confirmed THEN 'renter'
        ELSE 'both'
      END;
  END IF;
END;
$$;

COMMENT ON FUNCTION booking_confirm_and_release IS
'Maneja la confirmación bilateral del propietario y locatario.
Cuando AMBOS confirman, libera fondos automáticamente mediante wallet_complete_booking().
Integrado con sistema de calificaciones y reseñas.';
