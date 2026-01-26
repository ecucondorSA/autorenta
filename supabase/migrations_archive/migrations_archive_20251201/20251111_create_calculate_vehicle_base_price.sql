-- ============================================================================
-- MIGRATION: Create calculate_vehicle_base_price() function
-- Date: 2025-11-11
-- Purpose: Calculate vehicle-specific base price for dynamic pricing
-- Impact: Core function for vehicle-aware pricing (replaces region-wide base price)
-- ============================================================================

BEGIN;

-- ============================================================================
-- Main function: calculate_vehicle_base_price()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_vehicle_base_price(
  p_car_id UUID,
  p_region_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_car RECORD;
  v_category RECORD;
  v_region RECORD;
  v_vehicle_value_usd INTEGER;
  v_current_value_usd DECIMAL;
  v_age_years INTEGER;
  v_daily_rate_pct DECIMAL(5,4);
  v_base_price_usd_per_day DECIMAL(10,2);
  v_base_price_usd_per_hour DECIMAL(10,2);
  v_base_price_local_per_hour DECIMAL(10,2);
  v_currency TEXT;
  v_fx_rate DECIMAL(10,4);
  v_result JSONB;
BEGIN
  -- ============================================================================
  -- 1. Get car details
  -- ============================================================================

  SELECT
    c.id,
    c.year,
    c.value_usd,
    c.estimated_value_usd,
    c.custom_daily_rate_pct,
    c.category_id,
    c.brand_text_backup,
    c.model_text_backup
  INTO v_car
  FROM public.cars c
  WHERE c.id = p_car_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car with id % not found', p_car_id;
  END IF;

  -- ============================================================================
  -- 2. Get effective vehicle value (owner-provided or estimated)
  -- ============================================================================

  v_vehicle_value_usd := COALESCE(v_car.value_usd, v_car.estimated_value_usd);

  IF v_vehicle_value_usd IS NULL THEN
    RAISE EXCEPTION 'Car % has no value_usd or estimated_value_usd', p_car_id;
  END IF;

  -- ============================================================================
  -- 3. Get category details (depreciation rate, daily rate %)
  -- ============================================================================

  SELECT
    vc.id,
    vc.code,
    vc.name,
    vc.base_daily_rate_pct,
    vc.depreciation_rate_annual
  INTO v_category
  FROM public.vehicle_categories vc
  WHERE vc.id = v_car.category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car % has invalid category_id', p_car_id;
  END IF;

  -- ============================================================================
  -- 4. Apply depreciation to get current value
  -- ============================================================================

  v_age_years := EXTRACT(YEAR FROM NOW())::INTEGER - v_car.year;

  -- Apply category-specific annual depreciation
  -- Formula: current_value = base_value * (1 - depreciation_rate) ^ age
  -- Cap minimum value at 30% of original (even old cars have value)
  v_current_value_usd := (
    v_vehicle_value_usd *
    GREATEST(POWER(1 - v_category.depreciation_rate_annual, v_age_years), 0.30)
  );

  -- ============================================================================
  -- 5. Get daily rate percentage (custom or category default)
  -- ============================================================================

  v_daily_rate_pct := COALESCE(
    v_car.custom_daily_rate_pct,
    v_category.base_daily_rate_pct
  );

  -- ============================================================================
  -- 6. Calculate base price in USD
  -- ============================================================================

  -- Daily rate in USD
  v_base_price_usd_per_day := v_current_value_usd * v_daily_rate_pct;

  -- Hourly rate in USD (divide by 24)
  v_base_price_usd_per_hour := v_base_price_usd_per_day / 24.0;

  -- ============================================================================
  -- 7. Convert to local currency using region's exchange rate
  -- ============================================================================

  SELECT
    pr.currency,
    COALESCE(pr.base_price_per_hour, 0) AS fallback_price
  INTO v_region
  FROM public.pricing_regions pr
  WHERE pr.id = p_region_id AND pr.active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Region % not found or not active', p_region_id;
  END IF;

  v_currency := v_region.currency;

  -- Get exchange rate for USD -> local currency
  -- Fallback to 1.0 if no exchange rate found (region already in USD)
  SELECT COALESCE(platform_rate, 1.0)
  INTO v_fx_rate
  FROM public.exchange_rates
  WHERE from_currency = 'USD' AND to_currency = v_currency
  ORDER BY created_at DESC
  LIMIT 1;

  v_fx_rate := COALESCE(v_fx_rate, 1.0);

  -- Calculate final price in local currency
  v_base_price_local_per_hour := v_base_price_usd_per_hour * v_fx_rate;

  -- ============================================================================
  -- 8. Build result JSON
  -- ============================================================================

  v_result := jsonb_build_object(
    'car_id', p_car_id,
    'vehicle', jsonb_build_object(
      'brand', v_car.brand_text_backup,
      'model', v_car.model_text_backup,
      'year', v_car.year,
      'age_years', v_age_years,
      'original_value_usd', v_vehicle_value_usd,
      'current_value_usd', ROUND(v_current_value_usd, 2),
      'depreciation_applied', ROUND((1 - v_current_value_usd / v_vehicle_value_usd) * 100, 1) || '%'
    ),
    'category', jsonb_build_object(
      'code', v_category.code,
      'name', v_category.name,
      'daily_rate_pct', v_daily_rate_pct,
      'depreciation_rate_annual', v_category.depreciation_rate_annual
    ),
    'pricing', jsonb_build_object(
      'base_price_usd_per_day', ROUND(v_base_price_usd_per_day, 2),
      'base_price_usd_per_hour', ROUND(v_base_price_usd_per_hour, 2),
      'currency', v_currency,
      'fx_rate', v_fx_rate,
      'base_price_per_hour', ROUND(v_base_price_local_per_hour, 2)
    )
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.calculate_vehicle_base_price IS
'Calculates vehicle-specific base price per hour for dynamic pricing.
Considers: vehicle value, age, category, depreciation, and currency conversion.
Returns JSON with detailed breakdown of calculation.';

-- ============================================================================
-- Helper function: get_vehicle_base_price_simple()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_vehicle_base_price_simple(
  p_car_id UUID,
  p_region_id UUID
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.calculate_vehicle_base_price(p_car_id, p_region_id);
  RETURN (v_result->'pricing'->>'base_price_per_hour')::DECIMAL(10,2);
END;
$$;

COMMENT ON FUNCTION public.get_vehicle_base_price_simple IS
'Simplified version that returns only the final base price per hour (no breakdown)';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test with sample car (replace with actual car ID)
-- SELECT calculate_vehicle_base_price(
--   'your-car-id-here'::UUID,
--   'your-region-id-here'::UUID
-- );

-- Compare old vs new pricing for all cars
-- SELECT
--   c.id,
--   c.brand_text_backup || ' ' || c.model_text_backup || ' ' || c.year AS vehicle,
--   vc.name AS category,
--   COALESCE(c.value_usd, c.estimated_value_usd) AS vehicle_value,
--   pr.base_price_per_hour AS old_region_base_price,
--   get_vehicle_base_price_simple(c.id, c.region_id) AS new_vehicle_base_price,
--   ROUND(
--     (get_vehicle_base_price_simple(c.id, c.region_id) - pr.base_price_per_hour) /
--     NULLIF(pr.base_price_per_hour, 0) * 100,
--     1
--   ) AS price_change_pct
-- FROM public.cars c
-- JOIN vehicle_categories vc ON c.category_id = vc.id
-- LEFT JOIN pricing_regions pr ON c.region_id = pr.id
-- WHERE c.region_id IS NOT NULL
-- LIMIT 20;
