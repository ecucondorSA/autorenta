-- Update quote_booking RPC to accept user location for distance-based pricing
-- Migration: 20251107_update_quote_booking_with_location.sql

-- Drop existing function (keep all existing signatures for backward compatibility)
DROP FUNCTION IF EXISTS quote_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS quote_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS quote_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

-- Create updated function with location parameters
CREATE OR REPLACE FUNCTION quote_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_promo_code TEXT DEFAULT NULL,
  -- New location parameters
  p_user_lat NUMERIC DEFAULT NULL,
  p_user_lng NUMERIC DEFAULT NULL,
  p_delivery_required BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_car cars;
  v_days INTEGER;
  v_base_price_cents BIGINT;
  v_dynamic_price_cents BIGINT;
  v_discount_cents BIGINT := 0;
  v_service_fee_cents BIGINT;
  v_delivery_fee_cents BIGINT := 0;
  v_distance_km NUMERIC;
  v_distance_tier TEXT := 'local';
  v_distance_data JSONB;
  v_total_cents BIGINT;
  v_result JSONB;
BEGIN
  -- Get car details
  SELECT * INTO v_car FROM cars WHERE id = p_car_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found or not active';
  END IF;

  -- Validate dates
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  -- Calculate rental days
  v_days := EXTRACT(DAY FROM (p_end - p_start));
  IF v_days < 1 THEN
    v_days := 1;
  END IF;

  -- Get base price (cents per day)
  v_base_price_cents := v_car.price_per_day_cents * v_days;

  -- Get dynamic price if available
  SELECT daily_rate_cents * v_days INTO v_dynamic_price_cents
  FROM dynamic_car_pricing
  WHERE car_id = p_car_id
    AND date >= p_start::DATE
    AND date < p_end::DATE
  ORDER BY date DESC
  LIMIT 1;

  -- Use dynamic price if available, otherwise base price
  IF v_dynamic_price_cents IS NOT NULL THEN
    v_base_price_cents := v_dynamic_price_cents;
  END IF;

  -- Calculate service fee (10% of base price)
  v_service_fee_cents := (v_base_price_cents * 0.10)::BIGINT;

  -- Calculate distance-based pricing if user location provided
  IF p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
    -- Calculate distance from user to car
    v_distance_km := calculate_distance_km(
      p_user_lat,
      p_user_lng,
      v_car.location_lat,
      v_car.location_lng
    );

    -- Get distance pricing data
    v_distance_data := calculate_distance_based_pricing(
      v_distance_km,
      v_car.security_deposit_usd
    );

    -- Extract values
    v_distance_tier := v_distance_data->>'tier';

    -- Only charge delivery fee if delivery is requested
    IF p_delivery_required THEN
      v_delivery_fee_cents := (v_distance_data->>'delivery_fee_cents')::BIGINT;
    END IF;
  END IF;

  -- Apply promo code discount if provided
  IF p_promo_code IS NOT NULL THEN
    SELECT
      CASE
        WHEN discount_type = 'percentage' THEN
          (v_base_price_cents * (discount_value / 100))::BIGINT
        WHEN discount_type = 'fixed' THEN
          (discount_value * 100)::BIGINT  -- Convert USD to cents
        ELSE 0
      END INTO v_discount_cents
    FROM promo_codes
    WHERE code = UPPER(p_promo_code)
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until >= NOW())
      AND (max_uses IS NULL OR uses_count < max_uses);

    -- If promo code not found or invalid, set discount to 0
    v_discount_cents := COALESCE(v_discount_cents, 0);
  END IF;

  -- Calculate total
  v_total_cents := v_base_price_cents - v_discount_cents + v_service_fee_cents + v_delivery_fee_cents;

  -- Build result JSON
  v_result := jsonb_build_object(
    'car_id', v_car.id,
    'rental_days', v_days,
    'price_per_day_cents', v_car.price_per_day_cents,
    'base_price_cents', v_base_price_cents,
    'discount_cents', v_discount_cents,
    'service_fee_cents', v_service_fee_cents,
    'delivery_fee_cents', v_delivery_fee_cents,
    'total_cents', v_total_cents,
    'security_deposit_usd', v_car.security_deposit_usd,
    'currency', 'ARS',
    'distance_km', v_distance_km,
    'distance_tier', v_distance_tier,
    'delivery_required', p_delivery_required
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION quote_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION quote_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, BOOLEAN) TO anon;

-- Add comment
COMMENT ON FUNCTION quote_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, BOOLEAN) IS 'Get a price quote for a booking with optional user location for distance-based pricing and delivery fee calculation';
