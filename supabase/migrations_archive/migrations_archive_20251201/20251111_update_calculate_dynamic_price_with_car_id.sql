-- ============================================================================
-- MIGRATION: Update calculate_dynamic_price() to accept car_id for vehicle-aware pricing
-- Date: 2025-11-11
-- Purpose: Enable per-vehicle base price calculation in dynamic pricing
-- Impact: Dynamic pricing now considers vehicle type, value, and depreciation
-- ============================================================================

BEGIN;

-- ============================================================================
-- Updated function: calculate_dynamic_price() with optional car_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(
  p_region_id UUID,
  p_user_id UUID,
  p_rental_start TIMESTAMPTZ,
  p_rental_hours INT,
  p_car_id UUID DEFAULT NULL  -- NEW: Optional car ID for vehicle-aware pricing
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_price DECIMAL(10,2);
  v_currency TEXT;
  v_vehicle_info JSONB;
  v_day_factor DECIMAL(5,3) := 0.0;
  v_hour_factor DECIMAL(5,3) := 0.0;
  v_user_factor DECIMAL(5,3) := 0.0;
  v_demand_factor DECIMAL(5,3) := 0.0;
  v_event_factor DECIMAL(5,3) := 0.0;
  v_final_price DECIMAL(10,2);
  v_user_rentals INT;
  v_dow INT; -- Day of week
  v_hour INT; -- Hour of day
  v_surge_sensitivity DECIMAL(3,2) := 1.00;
BEGIN
  -- ============================================================================
  -- 1. Get base price (VEHICLE-AWARE or region-wide fallback)
  -- ============================================================================

  IF p_car_id IS NOT NULL THEN
    -- NEW: Vehicle-aware pricing
    v_vehicle_info := public.calculate_vehicle_base_price(p_car_id, p_region_id);
    v_base_price := (v_vehicle_info->'pricing'->>'base_price_per_hour')::DECIMAL(10,2);
    v_currency := v_vehicle_info->'pricing'->>'currency';

    -- Get category surge sensitivity
    SELECT surge_sensitivity
    INTO v_surge_sensitivity
    FROM public.vehicle_categories
    WHERE id = (
      SELECT category_id FROM public.cars WHERE id = p_car_id
    );

    v_surge_sensitivity := COALESCE(v_surge_sensitivity, 1.00);
  ELSE
    -- OLD: Region-wide pricing (backward compatibility)
    SELECT base_price_per_hour, currency
    INTO v_base_price, v_currency
    FROM public.pricing_regions
    WHERE id = p_region_id AND active = true;

    IF v_base_price IS NULL THEN
      RAISE EXCEPTION 'Region not found or inactive';
    END IF;
  END IF;

  -- ============================================================================
  -- 2. Get day factor
  -- ============================================================================

  v_dow := EXTRACT(DOW FROM p_rental_start); -- 0=Sunday, 6=Saturday
  SELECT COALESCE(factor, 0.0)
  INTO v_day_factor
  FROM public.pricing_day_factors
  WHERE region_id = p_region_id AND day_of_week = v_dow;

  -- ============================================================================
  -- 3. Get hour factor
  -- ============================================================================

  v_hour := EXTRACT(HOUR FROM p_rental_start);
  SELECT COALESCE(factor, 0.0)
  INTO v_hour_factor
  FROM public.pricing_hour_factors
  WHERE region_id = p_region_id
    AND hour_start <= v_hour
    AND hour_end >= v_hour
  LIMIT 1;

  -- ============================================================================
  -- 4. Get user factor (based on rental history)
  -- ============================================================================

  SELECT COUNT(*)
  INTO v_user_rentals
  FROM public.bookings
  WHERE renter_id = p_user_id AND status = 'completed';

  IF v_user_rentals = 0 THEN
    -- New user
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'new';
  ELSIF v_user_rentals >= 10 THEN
    -- Frequent user
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'frequent';
  ELSIF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND identity_verified = true
  ) THEN
    -- Verified user
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'verified';
  END IF;

  -- ============================================================================
  -- 5. Get demand factor (latest snapshot)
  -- ============================================================================

  SELECT COALESCE(surge_factor, 0.0)
  INTO v_demand_factor
  FROM public.pricing_demand_snapshots
  WHERE region_id = p_region_id
  ORDER BY timestamp DESC
  LIMIT 1;

  -- Apply category surge sensitivity (luxury cars less affected by surge)
  v_demand_factor := v_demand_factor * v_surge_sensitivity;

  -- ============================================================================
  -- 6. Check for special events
  -- ============================================================================

  SELECT COALESCE(SUM(factor), 0.0)
  INTO v_event_factor
  FROM public.pricing_special_events
  WHERE region_id = p_region_id
    AND active = true
    AND p_rental_start BETWEEN start_date AND end_date;

  -- ============================================================================
  -- 7. Calculate final price
  -- ============================================================================

  v_final_price := v_base_price * (1 + v_day_factor + v_hour_factor + v_user_factor + v_demand_factor + v_event_factor);

  -- Apply min/max caps (20% discount to 60% surcharge)
  v_final_price := GREATEST(v_base_price * 0.8, LEAST(v_final_price, v_base_price * 1.6));

  -- Round to nearest 0.10
  v_final_price := ROUND(v_final_price / 0.1) * 0.1;

  -- ============================================================================
  -- 8. Return full breakdown
  -- ============================================================================

  RETURN jsonb_build_object(
    'price_per_hour', v_final_price,
    'total_price', v_final_price * p_rental_hours,
    'currency', v_currency,
    'vehicle_aware', p_car_id IS NOT NULL,
    'vehicle_info', COALESCE(v_vehicle_info, NULL),
    'breakdown', jsonb_build_object(
      'base_price', v_base_price,
      'day_factor', v_day_factor,
      'hour_factor', v_hour_factor,
      'user_factor', v_user_factor,
      'demand_factor', v_demand_factor,
      'event_factor', v_event_factor,
      'surge_sensitivity', v_surge_sensitivity,
      'total_multiplier', (1 + v_day_factor + v_hour_factor + v_user_factor + v_demand_factor + v_event_factor)
    ),
    'details', jsonb_build_object(
      'user_rentals', v_user_rentals,
      'day_of_week', v_dow,
      'hour_of_day', v_hour
    )
  );
END;
$$;

COMMENT ON FUNCTION public.calculate_dynamic_price IS
'Calculates dynamic price with 5 factors: day, hour, user, demand, events.
NEW: Optionally accepts p_car_id for vehicle-aware base pricing.
If p_car_id is NULL, falls back to region-wide base price (backward compatible).';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test OLD way (region-wide, no car_id)
-- SELECT calculate_dynamic_price(
--   'your-region-id'::UUID,
--   'your-user-id'::UUID,
--   NOW() + INTERVAL '2 days',
--   24
-- );

-- Test NEW way (vehicle-aware, with car_id)
-- SELECT calculate_dynamic_price(
--   'your-region-id'::UUID,
--   'your-user-id'::UUID,
--   NOW() + INTERVAL '2 days',
--   24,
--   'your-car-id'::UUID
-- );

-- Compare pricing for two different vehicles (Fiat Uno vs Toyota Corolla)
-- WITH comparison AS (
--   SELECT
--     c.id AS car_id,
--     c.brand_text_backup || ' ' || c.model_text_backup || ' ' || c.year AS vehicle,
--     vc.name AS category,
--     calculate_dynamic_price(
--       c.region_id,
--       (SELECT id FROM profiles LIMIT 1), -- Sample user
--       NOW() + INTERVAL '2 days',
--       24,
--       c.id
--     ) AS pricing
--   FROM cars c
--   JOIN vehicle_categories vc ON c.category_id = vc.id
--   WHERE c.region_id IS NOT NULL
--   LIMIT 10
-- )
-- SELECT
--   vehicle,
--   category,
--   (pricing->'vehicle_info'->'vehicle'->>'current_value_usd')::INTEGER AS current_value_usd,
--   (pricing->'breakdown'->>'base_price')::DECIMAL AS base_price_per_hour,
--   (pricing->>'price_per_hour')::DECIMAL AS final_price_per_hour,
--   (pricing->'breakdown'->>'total_multiplier')::DECIMAL AS multiplier
-- FROM comparison
-- ORDER BY current_value_usd DESC;
