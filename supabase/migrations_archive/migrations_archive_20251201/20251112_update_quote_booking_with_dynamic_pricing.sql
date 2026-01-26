-- ============================================================================
-- Migration: Update quote_booking to use calculate_dynamic_price RPC
-- Date: 2025-11-12
-- Purpose: Connect real-time dynamic pricing to booking quotes
-- Impact: Quotes now use vehicle-aware dynamic pricing instead of cached prices
--
-- CRITICAL: This activates the entire dynamic pricing system with 12 factors
-- ============================================================================

-- Drop existing function (all signatures)
DROP FUNCTION IF EXISTS quote_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, BOOLEAN);
DROP FUNCTION IF EXISTS quote_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

-- Create updated function with dynamic pricing integration
CREATE OR REPLACE FUNCTION quote_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_promo_code TEXT DEFAULT NULL,
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
  v_discount_cents BIGINT := 0;
  v_service_fee_cents BIGINT;
  v_delivery_fee_cents BIGINT := 0;
  v_distance_km NUMERIC;
  v_distance_tier TEXT := 'local';
  v_distance_data JSONB;
  v_total_cents BIGINT;
  v_result JSONB;

  -- NEW: Dynamic pricing variables
  v_pricing_result JSONB;
  v_price_per_hour NUMERIC;
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

  -- Calculate rental days (minimum 1 day)
  v_days := EXTRACT(DAY FROM (p_end - p_start));
  IF v_days < 1 THEN
    v_days := 1;
  END IF;

  -- ========================================================================
  -- NEW: Calculate price based on pricing_strategy (uses_dynamic_pricing)
  -- ========================================================================
  IF COALESCE(v_car.uses_dynamic_pricing, false) = true THEN
    -- Use real-time dynamic pricing with vehicle-aware calculation
    BEGIN
      v_pricing_result := calculate_dynamic_price(
        v_car.region_id,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID), -- Guest fallback
        p_start,
        v_days * 24, -- Convert days to hours
        p_car_id -- Vehicle-aware pricing
      );

      -- Extract hourly price and convert to total price in cents
      v_price_per_hour := (v_pricing_result->>'price_per_hour')::NUMERIC;
      v_base_price_cents := (v_price_per_hour * 24 * v_days * 100)::BIGINT;

      -- Log successful dynamic pricing calculation
      RAISE NOTICE 'Dynamic pricing calculated: % ARS/hour = % ARS total for car %',
        v_price_per_hour, v_base_price_cents / 100.0, p_car_id;

    EXCEPTION WHEN OTHERS THEN
      -- Fallback to static price if dynamic pricing fails
      RAISE WARNING 'Dynamic pricing calculation failed for car %, using static price: %',
        p_car_id, SQLERRM;
      v_base_price_cents := v_car.price_per_day_cents * v_days;
    END;
  ELSE
    -- Use static/custom pricing from car.price_per_day_cents
    v_base_price_cents := v_car.price_per_day_cents * v_days;
  END IF;

  -- Calculate service fee (10% of base price)
  v_service_fee_cents := (v_base_price_cents * 0.10)::BIGINT;

  -- Calculate distance-based pricing if user location provided
  IF p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
    v_distance_km := calculate_distance_km(
      p_user_lat,
      p_user_lng,
      v_car.location_lat,
      v_car.location_lng
    );

    v_distance_data := calculate_distance_based_pricing(
      v_distance_km,
      v_car.security_deposit_usd
    );

    v_distance_tier := v_distance_data->>'tier';

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
          (discount_value * 100)::BIGINT
        ELSE 0
      END INTO v_discount_cents
    FROM promo_codes
    WHERE code = UPPER(p_promo_code)
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until >= NOW())
      AND (max_uses IS NULL OR uses_count < max_uses);

    v_discount_cents := COALESCE(v_discount_cents, 0);
  END IF;

  -- Calculate total
  v_total_cents := v_base_price_cents - v_discount_cents + v_service_fee_cents + v_delivery_fee_cents;

  -- Build result JSON
  v_result := jsonb_build_object(
    'car_id', v_car.id,
    'rental_days', v_days,
    'price_per_day_cents', (v_base_price_cents / v_days), -- Daily rate
    'base_price_cents', v_base_price_cents,
    'discount_cents', v_discount_cents,
    'service_fee_cents', v_service_fee_cents,
    'delivery_fee_cents', v_delivery_fee_cents,
    'total_cents', v_total_cents,
    'security_deposit_usd', v_car.security_deposit_usd,
    'currency', 'ARS',
    'distance_km', v_distance_km,
    'distance_tier', v_distance_tier,
    'delivery_required', p_delivery_required,
    'pricing_strategy', CASE WHEN v_car.uses_dynamic_pricing THEN 'dynamic' ELSE 'custom' END, -- NEW
    'dynamic_pricing_applied', COALESCE(v_car.uses_dynamic_pricing, false) -- NEW
  );

  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION quote_booking TO authenticated;
GRANT EXECUTE ON FUNCTION quote_booking TO anon;

-- Add comment
COMMENT ON FUNCTION quote_booking IS
'Get a price quote for a booking. Uses real-time dynamic pricing (12 factors) for cars with uses_dynamic_pricing=true, otherwise uses static price_per_day_cents. Activates vehicle-aware pricing, surge pricing, time-of-day, day-of-week, user history, demand factors, event pricing, and category-based adjustments.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test with dynamic pricing car (if exists)
-- SELECT quote_booking(
--   (SELECT id FROM cars WHERE uses_dynamic_pricing = true LIMIT 1),
--   NOW(),
--   NOW() + INTERVAL '3 days',
--   NULL,
--   NULL,
--   NULL,
--   false
-- );

-- Expected result:
-- - pricing_strategy: 'dynamic'
-- - dynamic_pricing_applied: true
-- - base_price_cents: calculated from calculate_dynamic_price RPC

-- Test with static pricing car (if exists)
-- SELECT quote_booking(
--   (SELECT id FROM cars WHERE uses_dynamic_pricing = false LIMIT 1),
--   NOW(),
--   NOW() + INTERVAL '3 days',
--   NULL,
--   NULL,
--   NULL,
--   false
-- );

-- Expected result:
-- - pricing_strategy: 'custom'
-- - dynamic_pricing_applied: false
-- - base_price_cents: price_per_day_cents * days
