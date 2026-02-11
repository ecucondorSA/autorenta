-- ============================================================================
-- Migration: Improve disconnect_mercadopago to check active bookings
-- Date: 2026-02-11
-- Issue: User could disconnect MP while having in-progress bookings,
--        breaking the payout flow (owner can't receive split payments).
--
-- Fix: Add booking status check before allowing disconnect.
--        Blocks disconnect if owner has bookings in states where
--        financial operations may still be pending.
-- ============================================================================

CREATE OR REPLACE FUNCTION disconnect_mercadopago()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_active_bookings INTEGER;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Check 1: Active/pending cars (existing check)
  IF EXISTS (
    SELECT 1 FROM cars
    WHERE owner_id = v_user_id
    AND status IN ('active', 'pending')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No puedes desconectar MercadoPago mientras tengas autos activos',
      'warning', 'Debes pausar o eliminar tus autos primero'
    );
  END IF;

  -- Check 2: In-progress bookings where this owner's car is involved
  SELECT COUNT(*) INTO v_active_bookings
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE c.owner_id = v_user_id
    AND b.status IN ('confirmed', 'in_progress', 'pending_return', 'pending_payment');

  IF v_active_bookings > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No puedes desconectar MercadoPago mientras tengas reservas en curso',
      'warning', 'Tienes ' || v_active_bookings || ' reserva(s) activa(s). Esperá a que finalicen.'
    );
  END IF;

  -- Clear OAuth data
  UPDATE profiles
  SET
    mercadopago_collector_id = NULL,
    mercadopago_connected = FALSE,
    mercadopago_connected_at = NULL,
    mercadopago_access_token = NULL,
    mercadopago_refresh_token = NULL,
    mercadopago_access_token_expires_at = NULL,
    mercadopago_public_key = NULL,
    mercadopago_account_type = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;

  IF FOUND THEN
    v_result := json_build_object(
      'success', true,
      'message', 'Cuenta de MercadoPago desconectada exitosamente'
    );
  ELSE
    v_result := json_build_object(
      'success', false,
      'error', 'No se pudo desconectar la cuenta'
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION disconnect_mercadopago IS 'Desconecta la cuenta de MercadoPago del usuario. Bloquea si tiene autos activos o reservas en curso.';
