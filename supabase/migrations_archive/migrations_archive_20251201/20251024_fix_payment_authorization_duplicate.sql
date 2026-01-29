-- ============================================================================
-- FIX: Remove duplicate create_payment_authorization functions
-- ============================================================================
-- Elimina todas las versiones de la función y crea solo la versión correcta
-- ============================================================================

-- Eliminar todas las versiones existentes
DROP FUNCTION IF EXISTS public.create_payment_authorization(uuid, uuid, numeric, numeric, numeric, text, text);
DROP FUNCTION IF EXISTS public.create_payment_authorization(uuid, uuid, bigint, text, text, text);
DROP FUNCTION IF EXISTS public.create_payment_authorization CASCADE;

-- Crear la versión correcta con booking_id NULLABLE
CREATE OR REPLACE FUNCTION public.create_payment_authorization(
  p_user_id uuid,
  p_booking_id uuid DEFAULT NULL, -- ✅ NULLABLE
  p_amount_usd numeric DEFAULT NULL,
  p_amount_ars numeric DEFAULT NULL,
  p_fx_rate numeric DEFAULT NULL,
  p_description text DEFAULT 'Preautorización de garantía',
  p_external_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent_id uuid;
  v_result jsonb;
BEGIN
  -- Validar campos requeridos
  IF p_amount_usd IS NULL OR p_amount_ars IS NULL OR p_fx_rate IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required fields: amount_usd, amount_ars, fx_rate'
    );
  END IF;

  -- Si se proporciona booking_id, validar que exista
  IF p_booking_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = p_booking_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Booking not found: ' || p_booking_id::text
      );
    END IF;
  END IF;

  -- Insertar payment intent
  INSERT INTO public.payment_intents (
    user_id,
    booking_id,
    intent_type,
    is_preauth,
    amount_usd,
    amount_ars,
    fx_rate,
    status,
    description,
    external_reference
  ) VALUES (
    p_user_id,
    p_booking_id, -- Puede ser NULL
    'preauth',
    true,
    p_amount_usd,
    p_amount_ars,
    p_fx_rate,
    'pending',
    p_description,
    COALESCE(p_external_reference, 'preauth_' || gen_random_uuid()::text)
  )
  RETURNING id INTO v_intent_id;

  -- Retornar resultado
  SELECT jsonb_build_object(
    'success', true,
    'intent_id', v_intent_id,
    'external_reference', external_reference
  )
  INTO v_result
  FROM public.payment_intents
  WHERE id = v_intent_id;

  RETURN v_result;

EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insert or update on table "payment_intents" violates foreign key constraint "payment_intents_booking_id_fkey"',
      'detail', 'El booking_id proporcionado no existe en la tabla bookings',
      'sqlstate', SQLSTATE
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON FUNCTION public.create_payment_authorization IS
'Crea un intent de preautorización (hold) para garantía de booking.
booking_id es OPCIONAL - permite crear preauth sin booking asociado.
Retorna intent_id y external_reference para usar con Mercado Pago.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_payment_authorization TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_authorization TO service_role;

-- ============================================================================
-- FIN
-- ============================================================================
