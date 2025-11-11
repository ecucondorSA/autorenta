-- ============================================================================
-- MIGRATION: Update request_booking RPC to support Dynamic Pricing
-- Date: 2025-11-11
-- Purpose: Enable request_booking to accept and validate dynamic pricing locks
-- Impact: Allows bookings to use locked dynamic prices instead of fixed prices
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Drop existing function
-- ============================================================================

DROP FUNCTION IF EXISTS request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, NUMERIC, NUMERIC, NUMERIC, BOOLEAN);

-- ============================================================================
-- 2. Create updated function with dynamic pricing support
-- ============================================================================

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

  -- Get car location and guarantee
  SELECT location_lat, location_lng, security_deposit_usd
  INTO v_car_lat, v_car_lng, v_base_guarantee_usd
  FROM cars
  WHERE id = p_car_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found or not active';
  END IF;

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
  -- AVAILABILITY CHECK
  -- ============================================================================

  -- Check availability (existing logic)
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE car_id = p_car_id
      AND status IN ('pending', 'confirmed', 'in_progress')
      AND (start_at, end_at) OVERLAPS (p_start, p_end)
  ) THEN
    RAISE EXCEPTION 'Car not available for selected dates';
  END IF;

  -- ============================================================================
  -- CREATE BOOKING WITH DYNAMIC PRICING DATA
  -- ============================================================================

  INSERT INTO bookings (
    car_id,
    renter_id,
    start_at,
    end_at,
    status,
    expires_at,
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

-- ============================================================================
-- 3. Grant execute permissions
-- ============================================================================

-- Grant to authenticated users (11 parameters)
GRANT EXECUTE ON FUNCTION request_booking(
  UUID, TIMESTAMPTZ, TIMESTAMPTZ,
  NUMERIC, NUMERIC, NUMERIC, NUMERIC,
  BOOLEAN, BOOLEAN, UUID, JSONB
) TO authenticated;

-- ============================================================================
-- 4. Add function comment
-- ============================================================================

COMMENT ON FUNCTION request_booking(
  UUID, TIMESTAMPTZ, TIMESTAMPTZ,
  NUMERIC, NUMERIC, NUMERIC, NUMERIC,
  BOOLEAN, BOOLEAN, UUID, JSONB
) IS 'Create a new booking request with optional pickup/dropoff location, distance-based pricing, and dynamic pricing support. Validates price locks and prevents expired price usage.';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Test 1: Traditional fixed pricing booking (should work as before)
-- SELECT * FROM request_booking(
--   'car-uuid'::UUID,
--   NOW() + INTERVAL '1 day',
--   NOW() + INTERVAL '2 days',
--   -34.603722, -58.381592, -- Buenos Aires pickup
--   -34.603722, -58.381592, -- Buenos Aires dropoff
--   false,                   -- no delivery
--   false,                   -- NOT using dynamic pricing
--   NULL,                    -- no lock token
--   NULL                     -- no snapshot
-- );

-- Test 2: Dynamic pricing booking (requires valid lock)
-- First lock price:
-- SELECT * FROM lock_price_for_booking(
--   'car-uuid'::UUID,
--   'user-uuid'::UUID,
--   NOW() + INTERVAL '1 day',
--   24
-- );
--
-- Then create booking with lock:
-- SELECT * FROM request_booking(
--   'car-uuid'::UUID,
--   NOW() + INTERVAL '1 day',
--   NOW() + INTERVAL '2 days',
--   NULL, NULL, NULL, NULL,  -- no location
--   false,                    -- no delivery
--   true,                     -- USING dynamic pricing
--   'lock-token-uuid'::UUID,  -- from lock_price response
--   '{"lock_token": "...", "locked_until": "...", ...}'::JSONB  -- from lock_price response
-- );

-- Test 3: Expired lock (should fail)
-- Use same call as Test 2 but wait 16 minutes after locking price
-- Expected: ERROR - "Price lock has expired. Please refresh the price."

-- Test 4: Invalid lock token (should fail)
-- Use Test 2 call but with different lock_token than in snapshot
-- Expected: ERROR - "Invalid price lock token"
