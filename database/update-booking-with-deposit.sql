-- ================================================
-- Update booking functions to include deposit
-- Description: Modify request_booking() and pricing_recalculate() to handle deposits
-- Date: 2025-10-17
-- ================================================

BEGIN;

-- ================================================
-- 1. Update request_booking() to include deposit in total_amount
-- ================================================

CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_car RECORD;
  v_booking_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_total_amount NUMERIC;
  v_deposit_amount NUMERIC := 0;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validate dates
  v_start_date := p_start::DATE;
  v_end_date := p_end::DATE;

  IF v_end_date <= v_start_date THEN
    RAISE EXCEPTION 'La fecha de fin debe ser posterior a la de inicio';
  END IF;

  IF v_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'No se pueden hacer reservas en el pasado';
  END IF;

  -- Get car details
  SELECT id, owner_id, price_per_day, status, deposit_required, deposit_amount
  INTO v_car
  FROM public.cars
  WHERE id = p_car_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auto no encontrado';
  END IF;

  IF v_car.status != 'active' THEN
    RAISE EXCEPTION 'Auto no disponible para alquilar';
  END IF;

  -- Validate user is not owner
  IF v_car.owner_id = v_user_id THEN
    RAISE EXCEPTION 'No puedes reservar tu propio auto';
  END IF;

  -- Validate availability (no overlap with confirmed or in_progress bookings)
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE car_id = p_car_id
    AND status IN ('confirmed', 'in_progress')
    AND (start_at, end_at) OVERLAPS (p_start, p_end)
  ) THEN
    RAISE EXCEPTION 'Auto no disponible en esas fechas';
  END IF;

  -- Calculate total amount INCLUDING deposit
  v_total_amount := (v_end_date - v_start_date) * v_car.price_per_day;

  -- Add deposit if required
  IF v_car.deposit_required AND v_car.deposit_amount IS NOT NULL THEN
    v_deposit_amount := v_car.deposit_amount;
    v_total_amount := v_total_amount + v_deposit_amount;
  END IF;

  -- Create booking with pending status
  INSERT INTO public.bookings (
    car_id,
    renter_id,
    start_at,
    end_at,
    status,
    total_amount,
    currency,
    expires_at
  ) VALUES (
    p_car_id,
    v_user_id,
    p_start,
    p_end,
    'pending',
    v_total_amount,
    'USD', -- TODO: Get from car currency
    NOW() + INTERVAL '30 minutes'
  )
  RETURNING id INTO v_booking_id;

  -- Return booking details
  RETURN json_build_object(
    'booking_id', v_booking_id,
    'status', 'pending',
    'total_amount', v_total_amount,
    'deposit_amount', v_deposit_amount,
    'expires_at', NOW() + INTERVAL '30 minutes'
  );
END;
$$;

-- ================================================
-- 2. Update pricing_recalculate() to include deposit in breakdown
-- ================================================

-- Drop existing function first (return type changed from VOID to JSON)
DROP FUNCTION IF EXISTS public.pricing_recalculate(UUID);

CREATE OR REPLACE FUNCTION public.pricing_recalculate(p_booking_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_car RECORD;
  v_days INTEGER;
  v_nightly_rate_cents INTEGER;
  v_subtotal_cents INTEGER;
  v_insurance_cents INTEGER := 0;
  v_fees_cents INTEGER := 0;
  v_discounts_cents INTEGER := 0;
  v_deposit_cents INTEGER := 0;
  v_total_cents INTEGER;
  v_breakdown JSONB;
  v_lines JSONB := '[]'::JSONB;
BEGIN
  -- Get booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  -- Get car details including deposit
  SELECT
    price_per_day,
    currency,
    deposit_required,
    deposit_amount,
    insurance_included
  INTO v_car
  FROM public.cars
  WHERE id = v_booking.car_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car % not found', v_booking.car_id;
  END IF;

  -- Calculate days
  v_days := (v_booking.end_at::DATE - v_booking.start_at::DATE);

  -- Convert price to cents
  v_nightly_rate_cents := (v_car.price_per_day * 100)::INTEGER;

  -- Calculate subtotal (rental only, without deposit)
  v_subtotal_cents := v_nightly_rate_cents * v_days;

  -- Add insurance if NOT included in price
  IF v_car.insurance_included IS FALSE THEN
    v_insurance_cents := (v_subtotal_cents * 0.10)::INTEGER; -- 10% insurance fee
    v_lines := v_lines || jsonb_build_object(
      'label', 'Seguro adicional',
      'amount_cents', v_insurance_cents
    );
  END IF;

  -- Add service fee (5% of subtotal)
  v_fees_cents := (v_subtotal_cents * 0.05)::INTEGER;
  v_lines := v_lines || jsonb_build_object(
    'label', 'Cargo por servicio',
    'amount_cents', v_fees_cents
  );

  -- Add deposit if required (IMPORTANT: deposit is separate from rental total)
  IF v_car.deposit_required AND v_car.deposit_amount IS NOT NULL THEN
    v_deposit_cents := (v_car.deposit_amount * 100)::INTEGER;
    v_lines := v_lines || jsonb_build_object(
      'label', 'Depósito de garantía (se devuelve)',
      'amount_cents', v_deposit_cents
    );
  END IF;

  -- Calculate final total
  v_total_cents := v_subtotal_cents + v_insurance_cents + v_fees_cents + v_deposit_cents - v_discounts_cents;

  -- Build breakdown JSON
  v_breakdown := jsonb_build_object(
    'days', v_days,
    'nightly_rate_cents', v_nightly_rate_cents,
    'subtotal_cents', v_subtotal_cents,
    'insurance_cents', v_insurance_cents,
    'fees_cents', v_fees_cents,
    'discounts_cents', v_discounts_cents,
    'deposit_cents', v_deposit_cents,
    'total_cents', v_total_cents,
    'currency', v_car.currency,
    'lines', v_lines
  );

  -- Update booking
  UPDATE public.bookings
  SET
    days_count = v_days,
    nightly_rate_cents = v_nightly_rate_cents,
    subtotal_cents = v_subtotal_cents,
    insurance_cents = v_insurance_cents,
    fees_cents = v_fees_cents,
    discounts_cents = v_discounts_cents,
    total_cents = v_total_cents,
    total_amount = (v_total_cents::NUMERIC / 100),
    breakdown = v_breakdown
  WHERE id = p_booking_id;

  -- Return breakdown
  RETURN v_breakdown;
END;
$$;

COMMIT;

-- ================================================
-- Verification Queries
-- ================================================
-- Test with a sample car
-- SELECT id, deposit_required, deposit_amount, price_per_day
-- FROM cars
-- WHERE status = 'active'
-- LIMIT 1;

-- Test pricing recalculation
-- SELECT * FROM pricing_recalculate('booking-uuid-here');
