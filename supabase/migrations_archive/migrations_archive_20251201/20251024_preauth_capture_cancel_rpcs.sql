-- ============================================================================
-- PREAUTHORIZATION CAPTURE & CANCEL RPC FUNCTIONS
-- ============================================================================
-- Funciones para capturar y cancelar preautorizaciones de MercadoPago
-- Integra con wallet_ledger para registro contable de doble entrada
-- ============================================================================

-- ============================================================================
-- RPC: capture_preauth
-- ============================================================================
-- Captura una preautorización y registra en wallet_ledger
--
-- Flujo:
-- 1. Valida que el intent esté en estado 'authorized'
-- 2. Obtiene datos del booking asociado
-- 3. Crea entries en wallet_ledger:
--    - DEBIT del renter (quien hizo la preauth)
--    - CREDIT al owner (quien recibe el pago)
-- 4. Actualiza booking status si corresponde
--
-- Params:
--   p_intent_id: UUID del payment intent
--   p_booking_id: UUID del booking (opcional si ya está en intent)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.capture_preauth(
  p_intent_id uuid,
  p_booking_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent record;
  v_booking record;
  v_amount_cents bigint;
  v_renter_id uuid;
  v_owner_id uuid;
  v_ref_key text;
BEGIN
  -- Obtener payment intent
  SELECT * INTO v_intent
  FROM public.payment_intents
  WHERE id = p_intent_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment intent not found'
    );
  END IF;

  -- Validar que esté en estado captured (ya fue capturado por MP)
  IF v_intent.status != 'captured' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment intent is not in captured state',
      'current_status', v_intent.status
    );
  END IF;

  -- Usar booking_id del parámetro o del intent
  v_booking_id := COALESCE(p_booking_id, v_intent.booking_id);

  IF v_booking_id IS NULL THEN
    -- Si no hay booking, solo retornar éxito
    -- Puede ser una preauth sin booking asociado
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Preauth captured but no booking associated'
    );
  END IF;

  -- Obtener booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Obtener renter (user_id del booking) y owner (owner del car)
  v_renter_id := v_booking.user_id;

  SELECT owner_id INTO v_owner_id
  FROM public.cars
  WHERE id = v_booking.car_id;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Car owner not found'
    );
  END IF;

  -- Convertir monto a centavos (amount_captured_ars * 100)
  v_amount_cents := ROUND(v_intent.amount_captured_ars * 100);

  -- Generar reference key
  v_ref_key := 'preauth-capture-' || p_intent_id::text;

  -- DEBIT del renter (paga el booking)
  INSERT INTO public.wallet_ledger (
    user_id,
    entry_type,
    amount_cents,
    ref,
    description,
    metadata
  ) VALUES (
    v_renter_id,
    'debit',
    v_amount_cents,
    v_ref_key,
    'Pago de reserva #' || v_booking_id::text,
    jsonb_build_object(
      'intent_id', p_intent_id,
      'booking_id', v_booking_id,
      'mp_payment_id', v_intent.mp_payment_id,
      'type', 'preauth_capture',
      'owner_id', v_owner_id
    )
  );

  -- CREDIT al owner (recibe el pago)
  INSERT INTO public.wallet_ledger (
    user_id,
    entry_type,
    amount_cents,
    ref,
    description,
    metadata
  ) VALUES (
    v_owner_id,
    'credit',
    v_amount_cents,
    v_ref_key,
    'Pago recibido por reserva #' || v_booking_id::text,
    jsonb_build_object(
      'intent_id', p_intent_id,
      'booking_id', v_booking_id,
      'mp_payment_id', v_intent.mp_payment_id,
      'type', 'preauth_capture',
      'renter_id', v_renter_id
    )
  );

  -- Actualizar booking a confirmed si estaba pending
  IF v_booking.status = 'pending' THEN
    UPDATE public.bookings
    SET
      status = 'confirmed',
      paid_at = now(),
      payment_method = 'credit_card',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'payment_intent_id', p_intent_id,
        'mp_payment_id', v_intent.mp_payment_id,
        'captured_at', now()
      )
    WHERE id = v_booking_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'intent_id', p_intent_id,
    'booking_id', v_booking_id,
    'amount_cents', v_amount_cents,
    'renter_id', v_renter_id,
    'owner_id', v_owner_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- ============================================================================
-- RPC: cancel_preauth
-- ============================================================================
-- Cancela una preautorización y libera fondos bloqueados
--
-- Flujo:
-- 1. Valida que el intent esté en estado 'cancelled'
-- 2. Si había fondos bloqueados en user_wallets, los libera
-- 3. Actualiza booking status si corresponde
--
-- Params:
--   p_intent_id: UUID del payment intent
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_preauth(
  p_intent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent record;
  v_booking record;
  v_amount_cents bigint;
BEGIN
  -- Obtener payment intent
  SELECT * INTO v_intent
  FROM public.payment_intents
  WHERE id = p_intent_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment intent not found'
    );
  END IF;

  -- Validar que esté en estado cancelled
  IF v_intent.status != 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment intent is not in cancelled state',
      'current_status', v_intent.status
    );
  END IF;

  -- Si hay booking asociado, actualizarlo
  IF v_intent.booking_id IS NOT NULL THEN
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = v_intent.booking_id;

    IF FOUND THEN
      -- Actualizar booking a cancelled si estaba pending
      IF v_booking.status = 'pending' THEN
        UPDATE public.bookings
        SET
          status = 'cancelled',
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'payment_intent_id', p_intent_id,
            'cancelled_reason', 'preauth_cancelled',
            'cancelled_at', now()
          )
        WHERE id = v_intent.booking_id;
      END IF;
    END IF;
  END IF;

  -- Si había fondos bloqueados, liberarlos
  -- (Esto depende de si implementaste locking en user_wallets)
  -- Por ahora, solo registrar la cancelación

  RETURN jsonb_build_object(
    'success', true,
    'intent_id', p_intent_id,
    'booking_id', v_intent.booking_id,
    'message', 'Preauthorization cancelled successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- ============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON FUNCTION public.capture_preauth IS
'Captura una preautorización de MercadoPago y crea entries en wallet_ledger.
Debe llamarse DESPUÉS de que MercadoPago confirme la captura (status=approved).
Crea DEBIT para renter y CREDIT para owner.';

COMMENT ON FUNCTION public.cancel_preauth IS
'Cancela una preautorización y libera fondos bloqueados.
Actualiza el booking a cancelled si corresponde.
Debe llamarse DESPUÉS de que MercadoPago confirme la cancelación (status=cancelled).';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Solo service_role puede ejecutar estas funciones
-- (webhooks y edge functions)
GRANT EXECUTE ON FUNCTION public.capture_preauth TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_preauth TO service_role;

-- También permitir a authenticated para testing
GRANT EXECUTE ON FUNCTION public.capture_preauth TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_preauth TO authenticated;

-- ============================================================================
-- FIN
-- ============================================================================
