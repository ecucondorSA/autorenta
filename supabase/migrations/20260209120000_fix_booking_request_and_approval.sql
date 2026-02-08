-- ============================================================================
-- MIGRATION: Fix Booking Request + Owner Approval/Rejection (Prod Drift)
-- Date: 2026-02-09
--
-- Why:
-- - Production RPCs were referencing non-existent columns (e.g. bookings.total_amount,
--   bookings.owner_confirmed_at, cars.daily_price) causing runtime failures.
-- - Bookings RLS was enabled without policies, making views like public.my_bookings
--   unusable for authenticated users.
--
-- Goals:
-- - Make public.request_booking(...) work against the current bookings schema.
-- - Make owner actions (approve/reject) work without touching missing columns.
-- - Add minimal RLS policies so renters/owners can read and update their bookings.
-- ============================================================================

-- ============================================================================
-- 1) RPC: request_booking (simple) -> returns bookings row
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_car_owner UUID;
  v_price_per_day NUMERIC;
  v_currency TEXT;
  v_days INTEGER;
  v_subtotal NUMERIC;
  v_service_fee NUMERIC;
  v_total NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_start >= p_end THEN
    RAISE EXCEPTION 'La fecha de fin debe ser posterior a la fecha de inicio';
  END IF;

  IF p_start < now() THEN
    RAISE EXCEPTION 'No podés reservar en el pasado';
  END IF;

  -- 🔒 Prevent race conditions when two renters try to book the same car
  PERFORM 1 FROM public.cars WHERE id = p_car_id FOR UPDATE;

  SELECT owner_id, price_per_day, currency
  INTO v_car_owner, v_price_per_day, v_currency
  FROM public.cars
  WHERE id = p_car_id AND status = 'active';

  IF v_car_owner IS NULL THEN
    RAISE EXCEPTION 'Auto no disponible';
  END IF;

  IF v_car_owner = auth.uid() THEN
    RAISE EXCEPTION 'No podés reservar tu propio auto';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE car_id = p_car_id
      AND status IN (
        'pending',
        'pending_payment',
        'pending_approval',
        'confirmed',
        'in_progress',
        'pending_return'
      )
      AND (start_at, end_at) OVERLAPS (p_start, p_end)
  ) THEN
    RAISE EXCEPTION 'Auto no disponible en esas fechas';
  END IF;

  v_days := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_end - p_start)) / 86400.0)::INT);

  -- Use quote_booking when the range spans multiple dates. If it's same-day, fallback
  -- to a minimal calculation to avoid quote_booking(date,date) validation errors.
  IF (p_end::date > p_start::date) THEN
    SELECT qb.price_subtotal, qb.service_fee, qb.total
    INTO v_subtotal, v_service_fee, v_total
    FROM public.quote_booking(p_car_id, p_start::date, p_end::date, NULL) qb;
  ELSE
    v_subtotal := ROUND(COALESCE(v_price_per_day, 0) * v_days, 2);
    v_service_fee := ROUND(v_subtotal * 0.10, 2);
    v_total := ROUND(v_subtotal + v_service_fee, 2);
  END IF;

  INSERT INTO public.bookings (
    car_id,
    renter_id,
    owner_id,
    start_at,
    end_at,
    status,
    currency,
    daily_rate,
    total_days,
    subtotal,
    service_fee,
    total_price,
    payment_mode,
    created_at,
    updated_at
  ) VALUES (
    p_car_id,
    auth.uid(),
    v_car_owner,
    p_start,
    p_end,
    'pending',
    COALESCE(v_currency, 'USD'),
    COALESCE(v_price_per_day, 0),
    v_days,
    COALESCE(v_subtotal, 0),
    COALESCE(v_service_fee, 0),
    COALESCE(v_total, 0),
    'wallet',
    NOW(),
    NOW()
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ============================================================================
-- 2) RPC: request_booking (with location/delivery inputs) -> returns JSON
-- Keeps signature for client compatibility but stores only fields that exist.
-- ============================================================================
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
  p_delivery_required BOOLEAN DEFAULT false,
  p_delivery_distance_km NUMERIC DEFAULT NULL,
  p_delivery_fee_cents BIGINT DEFAULT 0,
  p_distance_risk_tier TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_days INTEGER;
  v_subtotal NUMERIC;
  v_service_fee NUMERIC;
  v_total NUMERIC;
  v_total_with_delivery NUMERIC;
  v_delivery_fee NUMERIC;
BEGIN
  -- Reuse the same validations and atomic insert logic
  v_booking := public.request_booking(p_car_id, p_start, p_end);

  v_days := COALESCE(v_booking.total_days, 1);
  v_subtotal := COALESCE(v_booking.subtotal, 0);
  v_service_fee := COALESCE(v_booking.service_fee, 0);
  v_total := COALESCE(v_booking.total_price, 0);

  -- If caller provided an explicit total, prefer it (still allowing delivery fee add-on)
  IF p_total_price IS NOT NULL AND p_total_price > 0 THEN
    v_total := p_total_price;
  END IF;

  v_delivery_fee := COALESCE(p_delivery_fee_cents, 0) / 100.0;
  v_total_with_delivery := v_total + CASE WHEN p_delivery_required THEN v_delivery_fee ELSE 0 END;

  -- Persist the final total if it differs (e.g., delivery fee or overridden total)
  IF v_total_with_delivery IS DISTINCT FROM v_booking.total_price THEN
    UPDATE public.bookings
    SET total_price = v_total_with_delivery,
        updated_at = NOW()
    WHERE id = v_booking.id;
    v_booking.total_price := v_total_with_delivery;
  END IF;

  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'status', v_booking.status,
    'currency', v_booking.currency,
    'total_days', v_days,
    'daily_rate', v_booking.daily_rate,
    'subtotal', v_subtotal,
    'service_fee', v_service_fee,
    'total_price', v_booking.total_price,
    -- Echo back inputs (for UI), even if we don't store them yet
    'pickup_location_lat', p_pickup_lat,
    'pickup_location_lng', p_pickup_lng,
    'dropoff_location_lat', p_dropoff_lat,
    'dropoff_location_lng', p_dropoff_lng,
    'delivery_required', p_delivery_required,
    'delivery_distance_km', p_delivery_distance_km,
    'delivery_fee_cents', p_delivery_fee_cents,
    'distance_risk_tier', p_distance_risk_tier,
    'driver_age', p_driver_age,
    'payment_method', p_payment_method
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_booking(
  UUID,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  NUMERIC,
  INTEGER,
  TEXT,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  BOOLEAN,
  NUMERIC,
  BIGINT,
  TEXT
) TO authenticated;

-- ============================================================================
-- 3) RPC: approve_booking_v2 (owner) - pending -> pending_payment
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_booking_v2(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_booking RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cars WHERE id = v_booking.car_id AND owner_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para aprobar esta reserva');
  END IF;

  IF v_booking.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La reserva no está en estado pendiente (Actual: ' || v_booking.status || ')'
    );
  END IF;

  UPDATE public.bookings
  SET status = 'pending_payment',
      updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reserva aprobada. Pendiente de pago.',
    'booking_id', p_booking_id,
    'new_status', 'pending_payment'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_booking_v2(UUID) TO authenticated;

-- ============================================================================
-- 4) RPC: reject_booking (owner) - pending -> cancelled_owner
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reject_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_booking RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cars WHERE id = v_booking.car_id AND owner_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para rechazar esta reserva');
  END IF;

  IF v_booking.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La reserva no está en estado pendiente (Actual: ' || v_booking.status || ')'
    );
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled_owner',
      cancelled_at = NOW(),
      cancelled_by = v_user_id,
      cancellation_reason = COALESCE(NULLIF(p_reason, ''), 'Rechazada por el propietario'),
      updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reserva rechazada',
    'booking_id', p_booking_id,
    'new_status', 'cancelled_owner'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_booking(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 5) BOOKINGS RLS: Minimal policies so views work (my_bookings/owner_bookings)
-- ============================================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_select_renter ON public.bookings;
CREATE POLICY bookings_select_renter
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (renter_id = auth.uid());

DROP POLICY IF EXISTS bookings_select_owner ON public.bookings;
CREATE POLICY bookings_select_owner
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS bookings_insert_renter ON public.bookings;
CREATE POLICY bookings_insert_renter
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    renter_id = auth.uid()
    AND owner_id = (SELECT c.owner_id FROM public.cars c WHERE c.id = car_id)
  );

DROP POLICY IF EXISTS bookings_update_renter ON public.bookings;
CREATE POLICY bookings_update_renter
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (renter_id = auth.uid())
  WITH CHECK (renter_id = auth.uid());

DROP POLICY IF EXISTS bookings_update_owner ON public.bookings;
CREATE POLICY bookings_update_owner
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

