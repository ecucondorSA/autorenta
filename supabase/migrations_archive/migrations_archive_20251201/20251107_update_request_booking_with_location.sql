-- Update request_booking RPC to accept location parameters for distance-based pricing
-- Migration: 20251107_update_request_booking_with_location.sql

-- Drop existing function
DROP FUNCTION IF EXISTS request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

-- Create updated function with location parameters
CREATE OR REPLACE FUNCTION request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  -- New location parameters
  p_pickup_lat NUMERIC DEFAULT NULL,
  p_pickup_lng NUMERIC DEFAULT NULL,
  p_dropoff_lat NUMERIC DEFAULT NULL,
  p_dropoff_lng NUMERIC DEFAULT NULL,
  p_delivery_required BOOLEAN DEFAULT FALSE
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

  -- Check availability (existing logic)
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE car_id = p_car_id
      AND status IN ('pending', 'confirmed', 'in_progress')
      AND (start_at, end_at) OVERLAPS (p_start, p_end)
  ) THEN
    RAISE EXCEPTION 'Car not available for selected dates';
  END IF;

  -- Create booking with location and distance data
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
    distance_risk_tier
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
    v_distance_tier
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, NUMERIC, NUMERIC, NUMERIC, BOOLEAN) TO authenticated;

-- Add comment
COMMENT ON FUNCTION request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, NUMERIC, NUMERIC, NUMERIC, BOOLEAN) IS 'Create a new booking request with optional pickup/dropoff location and distance-based pricing';
