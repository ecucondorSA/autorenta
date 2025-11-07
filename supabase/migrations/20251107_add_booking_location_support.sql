-- Migration: Add location and delivery support to booking request
-- Version: 1.0
-- Date: 2025-11-07

-- ============================================================================
-- 1. UPDATE request_booking RPC to accept location parameters
-- ============================================================================

DROP FUNCTION IF EXISTS public.request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_total_price NUMERIC DEFAULT NULL,
  p_driver_age INTEGER DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'wallet',
  p_pickup_lat NUMERIC DEFAULT NULL,
  p_pickup_lng NUMERIC DEFAULT NULL,
  p_dropoff_lat NUMERIC DEFAULT NULL,
  p_dropoff_lng NUMERIC DEFAULT NULL,
  p_delivery_required BOOLEAN DEFAULT FALSE,
  p_delivery_distance_km NUMERIC DEFAULT NULL,
  p_delivery_fee_cents BIGINT DEFAULT 0,
  p_distance_risk_tier TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_car_owner UUID;
  v_booking_id UUID;
  v_daily_price NUMERIC;
  v_calculated_total NUMERIC;
  v_duration_days INTEGER;
  v_user_balance NUMERIC;
  v_user_role TEXT;
  v_car_status TEXT;
  v_result JSON;
BEGIN
  -- Obtener user_id del token JWT
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Validar que las fechas sean futuras
  IF p_start <= NOW() THEN
    RAISE EXCEPTION 'La fecha de inicio debe ser futura';
  END IF;

  IF p_end <= p_start THEN
    RAISE EXCEPTION 'La fecha de fin debe ser posterior a la fecha de inicio';
  END IF;

  -- Obtener información del auto
  SELECT owner_id, daily_price, status
  INTO v_car_owner, v_daily_price, v_car_status
  FROM public.cars
  WHERE id = p_car_id;

  IF v_car_owner IS NULL THEN
    RAISE EXCEPTION 'Auto no encontrado';
  END IF;

  IF v_car_status != 'active' THEN
    RAISE EXCEPTION 'El auto no está disponible para renta';
  END IF;

  -- Validar que el usuario no intente rentar su propio auto
  IF v_user_id = v_car_owner THEN
    RAISE EXCEPTION 'No puedes rentar tu propio auto';
  END IF;

  -- Validar disponibilidad incluyendo 'pending_payment'
  IF EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE car_id = p_car_id
      AND status IN ('pending', 'pending_payment', 'confirmed', 'in_progress')
      AND (start_at, end_at) OVERLAPS (p_start, p_end)
  ) THEN
    RAISE EXCEPTION 'Auto no disponible en esas fechas';
  END IF;

  -- Calcular duración en días
  v_duration_days := EXTRACT(EPOCH FROM (p_end - p_start)) / 86400;

  IF v_duration_days < 1 THEN
    v_duration_days := 1;
  END IF;

  -- Calcular precio total si no se proporcionó
  IF p_total_price IS NULL THEN
    v_calculated_total := v_daily_price * v_duration_days;
    -- Agregar tarifa de delivery si está habilitada
    IF p_delivery_required AND p_delivery_fee_cents > 0 THEN
      v_calculated_total := v_calculated_total + (p_delivery_fee_cents / 100.0);
    END IF;
  ELSE
    v_calculated_total := p_total_price;
  END IF;

  -- Validar balance del usuario si el método de pago es wallet
  IF p_payment_method = 'wallet' THEN
    SELECT balance INTO v_user_balance
    FROM public.wallets
    WHERE user_id = v_user_id;

    IF v_user_balance IS NULL OR v_user_balance < v_calculated_total THEN
      RAISE EXCEPTION 'Balance insuficiente en wallet';
    END IF;
  END IF;

  -- Crear el booking con status 'pending' o 'pending_payment' e incluir datos de ubicación
  INSERT INTO public.bookings (
    car_id,
    renter_id,
    start_at,
    end_at,
    total_price,
    status,
    driver_age,
    payment_method,
    pickup_location_lat,
    pickup_location_lng,
    dropoff_location_lat,
    dropoff_location_lng,
    delivery_required,
    delivery_distance_km,
    delivery_fee_cents,
    distance_risk_tier,
    created_at,
    updated_at
  )
  VALUES (
    p_car_id,
    v_user_id,
    p_start,
    p_end,
    v_calculated_total,
    CASE
      WHEN p_payment_method = 'wallet' THEN 'pending'
      ELSE 'pending_payment'
    END,
    p_driver_age,
    p_payment_method,
    p_pickup_lat,
    p_pickup_lng,
    p_dropoff_lat,
    p_dropoff_lng,
    p_delivery_required,
    p_delivery_distance_km,
    p_delivery_fee_cents,
    p_distance_risk_tier,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_booking_id;

  -- Retornar resultado como JSON
  SELECT json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'total_price', v_calculated_total,
    'status', CASE
      WHEN p_payment_method = 'wallet' THEN 'pending'
      ELSE 'pending_payment'
    END,
    'pickup_location_lat', p_pickup_lat,
    'pickup_location_lng', p_pickup_lng,
    'dropoff_location_lat', p_dropoff_lat,
    'dropoff_location_lng', p_dropoff_lng,
    'delivery_required', p_delivery_required,
    'delivery_fee_cents', p_delivery_fee_cents,
    'distance_km', p_delivery_distance_km
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.request_booking IS
'Crea un booking después de validar disponibilidad, balance y permisos.
Ahora incluye soporte para ubicaciones de retiro/devolución y tarifas de delivery.
Parámetros de ubicación son opcionales para compatibilidad con código existente.';

-- ============================================================================
-- 2. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, INTEGER, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, NUMERIC, BIGINT, TEXT) TO authenticated;

-- ============================================================================
-- 3. Log migration completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: Added location and delivery support to request_booking()';
  RAISE NOTICE '   - request_booking() now accepts pickup/dropoff location coordinates';
  RAISE NOTICE '   - request_booking() now accepts delivery_required, delivery_distance_km, delivery_fee_cents';
  RAISE NOTICE '   - request_booking() now accepts distance_risk_tier for pricing multipliers';
  RAISE NOTICE '   - All location parameters are optional for backward compatibility';
END $$;
