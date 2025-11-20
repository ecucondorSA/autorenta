-- ============================================================================
-- FIX: request_booking missing 'pending_payment' in availability check
-- Date: 2025-11-16
-- Purpose: Include 'pending_payment' status in availability validation
-- Issue: Function only checks ('pending', 'confirmed', 'in_progress') but
--        should also include 'pending_payment' to match constraint and prevent
--        double bookings
-- ============================================================================

BEGIN;

-- Update function to include 'pending_payment' in availability check
CREATE OR REPLACE FUNCTION request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  -- Location parameters
  p_pickup_lat NUMERIC DEFAULT NULL,
  p_pickup_lng NUMERIC DEFAULT NULL,
  p_dropoff_lat NUMERIC DEFAULT NULL,
  p_dropoff_lng NUMERIC DEFAULT NULL,
  p_delivery_required BOOLEAN DEFAULT FALSE,
  -- Dynamic pricing parameters
  p_use_dynamic_pricing BOOLEAN DEFAULT FALSE,
  p_price_lock_token UUID DEFAULT NULL,
  p_dynamic_price_snapshot JSONB DEFAULT NULL
) RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking bookings;
  v_car_lat NUMERIC;
  v_car_lng NUMERIC;
  v_distance_km NUMERIC;
  v_delivery_fee_cents BIGINT := 0;
  v_distance_tier TEXT := 'local';
  v_distance_data JSONB;
  v_base_guarantee_usd NUMERIC;
  v_price_locked_until TIMESTAMPTZ;
  -- Variables for total_amount calculation
  v_car RECORD;
  v_days INTEGER;
  v_base_total NUMERIC := 0;
  v_total_amount NUMERIC := 0;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate dates
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  IF p_start < NOW() THEN
    RAISE EXCEPTION 'Start date cannot be in the past';
  END IF;

  -- ============================================================================
  -- DYNAMIC PRICING VALIDATION
  -- ============================================================================

  IF p_use_dynamic_pricing = TRUE THEN
    -- Validate required dynamic pricing parameters
    IF p_price_lock_token IS NULL THEN
      RAISE EXCEPTION 'Price lock token is required when using dynamic pricing';
    END IF;

    IF p_dynamic_price_snapshot IS NULL THEN
      RAISE EXCEPTION 'Dynamic price snapshot is required when using dynamic pricing';
    END IF;

    -- Extract lock expiry from snapshot
    v_price_locked_until := (p_dynamic_price_snapshot->>'locked_until')::TIMESTAMPTZ;

    -- Validate price lock hasn't expired
    IF v_price_locked_until IS NULL OR v_price_locked_until < NOW() THEN
      RAISE EXCEPTION 'Price lock has expired. Please refresh the price.';
    END IF;

    -- Validate lock token matches snapshot
    IF (p_dynamic_price_snapshot->>'lock_token')::UUID != p_price_lock_token THEN
      RAISE EXCEPTION 'Invalid price lock token';
    END IF;

    -- Validate car_id matches snapshot
    IF (p_dynamic_price_snapshot->>'car_id')::UUID != p_car_id THEN
      RAISE EXCEPTION 'Price lock car_id mismatch';
    END IF;

    -- Validate user_id matches snapshot
    IF (p_dynamic_price_snapshot->>'user_id')::UUID != auth.uid() THEN
      RAISE EXCEPTION 'Price lock user_id mismatch';
    END IF;
  END IF;

  -- ============================================================================
  -- CAR VALIDATION & LOCATION LOGIC
  -- ============================================================================

  -- Get car with pricing info for total_amount calculation
  SELECT
    location_lat,
    location_lng,
    security_deposit_usd,
    price_per_day,
    currency,
    deposit_required,
    deposit_amount
  INTO v_car
  FROM cars
  WHERE id = p_car_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found or not active';
  END IF;

  -- Extract location and guarantee
  v_car_lat := v_car.location_lat;
  v_car_lng := v_car.location_lng;
  v_base_guarantee_usd := v_car.security_deposit_usd;

  -- Calculate distance-based pricing if delivery is required
  IF p_delivery_required AND p_pickup_lat IS NOT NULL AND p_pickup_lng IS NOT NULL THEN
    -- Calculate distance from car location to pickup location
    v_distance_km := calculate_distance_km(v_car_lat, v_car_lng, p_pickup_lat, p_pickup_lng);

    -- Get full distance pricing data
    v_distance_data := calculate_distance_based_pricing(v_distance_km, v_base_guarantee_usd);

    -- Extract values from JSONB
    v_delivery_fee_cents := (v_distance_data->>'delivery_fee_cents')::BIGINT;
    v_distance_tier := v_distance_data->>'tier';
  ELSIF p_pickup_lat IS NOT NULL AND p_pickup_lng IS NOT NULL THEN
    -- Calculate distance even if not delivery (for risk tier)
    v_distance_km := calculate_distance_km(v_car_lat, v_car_lng, p_pickup_lat, p_pickup_lng);
    v_distance_data := calculate_distance_based_pricing(v_distance_km, v_base_guarantee_usd);
    v_distance_tier := v_distance_data->>'tier';
    v_delivery_fee_cents := 0; -- No delivery fee if pickup at car location
  END IF;

  -- ============================================================================
  -- CALCULATE TOTAL_AMOUNT
  -- ============================================================================

  -- Calculate number of days
  v_days := EXTRACT(DAY FROM (p_end - p_start))::INTEGER;
  IF v_days < 1 THEN
    v_days := 1; -- Minimum 1 day
  END IF;

  -- Base total from daily rate
  IF v_car.price_per_day IS NOT NULL AND v_car.price_per_day > 0 THEN
    v_base_total := v_car.price_per_day * v_days;
  END IF;

  -- Add delivery fee (convert cents to decimal)
  IF v_delivery_fee_cents > 0 THEN
    v_base_total := v_base_total + (v_delivery_fee_cents / 100.0);
  END IF;

  -- Add deposit if required (deposit_amount is already in decimal)
  IF v_car.deposit_required AND v_car.deposit_amount IS NOT NULL THEN
    v_base_total := v_base_total + v_car.deposit_amount;
  END IF;

  -- Use dynamic pricing if provided, otherwise use calculated total
  IF p_use_dynamic_pricing = TRUE AND p_dynamic_price_snapshot IS NOT NULL THEN
    -- Extract total from dynamic price snapshot
    v_total_amount := COALESCE(
      (p_dynamic_price_snapshot->>'total_amount')::NUMERIC,
      (p_dynamic_price_snapshot->>'total_cents')::NUMERIC / 100.0,
      v_base_total
    );
  ELSE
    v_total_amount := v_base_total;
  END IF;

  -- Ensure total_amount is at least 0 (satisfy CHECK constraint)
  IF v_total_amount < 0 THEN
    v_total_amount := 0;
  END IF;

  -- ============================================================================
  -- ✅ FIX: AVAILABILITY CHECK - Include 'pending_payment'
  -- ============================================================================

  -- ✅ FIX: Include 'pending_payment' to match constraint bookings_no_overlap
  -- The constraint prevents overlaps for: pending, pending_payment, confirmed, in_progress
  -- So the validation must also include 'pending_payment' to prevent race conditions
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE car_id = p_car_id
      AND status IN ('pending', 'pending_payment', 'confirmed', 'in_progress')
      AND (start_at, end_at) OVERLAPS (p_start, p_end)
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Car not available for selected dates';
  END IF;

  -- ============================================================================
  -- CREATE BOOKING WITH TOTAL_AMOUNT
  -- ============================================================================

  INSERT INTO bookings (
    car_id,
    renter_id,
    start_at,
    end_at,
    status,
    expires_at,
    -- Include total_amount and currency
    total_amount,
    currency,
    -- Location fields
    pickup_location_lat,
    pickup_location_lng,
    dropoff_location_lat,
    dropoff_location_lng,
    delivery_required,
    delivery_distance_km,
    delivery_fee_cents,
    distance_risk_tier,
    -- Dynamic pricing fields
    has_dynamic_pricing,
    dynamic_price_snapshot,
    price_locked_until,
    price_lock_token
  ) VALUES (
    p_car_id,
    auth.uid(),
    p_start,
    p_end,
    'pending',
    NOW() + INTERVAL '30 minutes',
    -- Set total_amount and currency
    v_total_amount,
    COALESCE(v_car.currency, 'ARS'),
    -- Location values
    p_pickup_lat,
    p_pickup_lng,
    p_dropoff_lat,
    p_dropoff_lng,
    p_delivery_required,
    v_distance_km,
    v_delivery_fee_cents,
    v_distance_tier,
    -- Dynamic pricing values
    p_use_dynamic_pricing,
    p_dynamic_price_snapshot,
    v_price_locked_until,
    p_price_lock_token
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION request_booking(
  UUID, TIMESTAMPTZ, TIMESTAMPTZ,
  NUMERIC, NUMERIC, NUMERIC, NUMERIC,
  BOOLEAN, BOOLEAN, UUID, JSONB
) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION request_booking(
  UUID, TIMESTAMPTZ, TIMESTAMPTZ,
  NUMERIC, NUMERIC, NUMERIC, NUMERIC,
  BOOLEAN, BOOLEAN, UUID, JSONB
) IS 'Create a new booking request with optional pickup/dropoff location, distance-based pricing, and dynamic pricing support. ✅ FIX 2025-11-16: Now includes ''pending_payment'' in availability check to match constraint and prevent double bookings.';

COMMIT;








