-- ============================================================================
-- MIGRATION: Create estimate_vehicle_value_usd() function
-- Date: 2025-11-11
-- Purpose: Estimate vehicle value from brand/model/year using pricing_models table
-- Impact: Enables automatic valuation for cars without owner-provided value_usd
-- ============================================================================

BEGIN;

-- ============================================================================
-- Main function: estimate_vehicle_value_usd()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.estimate_vehicle_value_usd(
  p_brand TEXT,
  p_model TEXT,
  p_year INTEGER
)
RETURNS TABLE (
  estimated_value INTEGER,
  category_id UUID,
  confidence_level TEXT,
  data_source TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_pricing_model RECORD;
  v_base_value INTEGER;
  v_age_years INTEGER;
  v_depreciation_rate DECIMAL;
  v_estimated_value INTEGER;
  v_category_id UUID;
  v_confidence TEXT;
BEGIN
  -- Calculate vehicle age
  v_age_years := EXTRACT(YEAR FROM NOW())::INTEGER - p_year;

  -- Try to find exact match in pricing_models
  SELECT
    base_value_usd,
    category_id,
    confidence_level,
    (SELECT depreciation_rate_annual FROM vehicle_categories WHERE id = vpm.category_id) AS dep_rate
  INTO v_pricing_model
  FROM public.vehicle_pricing_models vpm
  WHERE
    LOWER(TRIM(vpm.brand)) = LOWER(TRIM(p_brand))
    AND LOWER(TRIM(vpm.model)) = LOWER(TRIM(p_model))
    AND p_year >= vpm.year_from
    AND p_year <= vpm.year_to
    AND vpm.active = true
  ORDER BY vpm.year_from DESC
  LIMIT 1;

  -- If found exact match, apply depreciation
  IF FOUND THEN
    v_base_value := v_pricing_model.base_value_usd;
    v_category_id := v_pricing_model.category_id;
    v_depreciation_rate := v_pricing_model.dep_rate;
    v_confidence := v_pricing_model.confidence_level;

    -- Apply depreciation: value = base_value * (1 - depreciation_rate) ^ age_years
    -- Cap depreciation at 50% max (even 20 year old car has some value)
    v_estimated_value := (
      v_base_value *
      GREATEST(POWER(1 - v_depreciation_rate, v_age_years), 0.50)
    )::INTEGER;

    RETURN QUERY SELECT
      v_estimated_value,
      v_category_id,
      v_confidence,
      'pricing_models'::TEXT;
    RETURN;
  END IF;

  -- Fallback 1: Try to find brand match only (any model)
  SELECT
    AVG(base_value_usd)::INTEGER,
    mode() WITHIN GROUP (ORDER BY category_id),
    'low',
    AVG((SELECT depreciation_rate_annual FROM vehicle_categories WHERE id = vpm.category_id))
  INTO v_base_value, v_category_id, v_confidence, v_depreciation_rate
  FROM public.vehicle_pricing_models vpm
  WHERE
    LOWER(TRIM(vpm.brand)) = LOWER(TRIM(p_brand))
    AND p_year >= vpm.year_from - 5 -- Allow 5 year tolerance
    AND p_year <= vpm.year_to + 5
    AND vpm.active = true;

  IF v_base_value IS NOT NULL THEN
    v_estimated_value := (
      v_base_value *
      GREATEST(POWER(1 - v_depreciation_rate, v_age_years), 0.50)
    )::INTEGER;

    RETURN QUERY SELECT
      v_estimated_value,
      v_category_id,
      v_confidence,
      'brand_average'::TEXT;
    RETURN;
  END IF;

  -- Fallback 2: Use year-based estimate
  -- Assume $20k for new car, depreciate by 5% per year
  v_base_value := 20000;
  v_depreciation_rate := 0.05;
  v_estimated_value := (
    v_base_value *
    GREATEST(POWER(1 - v_depreciation_rate, v_age_years), 0.30)
  )::INTEGER;

  -- Classify by estimated value
  v_category_id := (
    SELECT id FROM vehicle_categories
    WHERE code = CASE
      WHEN v_estimated_value < 10000 THEN 'economy'
      WHEN v_estimated_value < 20000 THEN 'standard'
      WHEN v_estimated_value < 35000 THEN 'premium'
      ELSE 'luxury'
    END
  );

  RETURN QUERY SELECT
    v_estimated_value,
    v_category_id,
    'estimated'::TEXT,
    'year_based'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.estimate_vehicle_value_usd IS
'Estimates vehicle value based on brand/model/year using pricing_models reference data.
Returns estimated_value, category_id, confidence_level, and data_source.
Fallbacks: 1) Exact match, 2) Brand average, 3) Year-based estimate';

-- ============================================================================
-- Helper function: populate_car_estimates()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_car_estimates(p_car_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_car RECORD;
  v_estimate RECORD;
BEGIN
  -- Get car details
  SELECT brand_text_backup, model_text_backup, year
  INTO v_car
  FROM public.cars
  WHERE id = p_car_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car with id % not found', p_car_id;
  END IF;

  -- Get estimate
  SELECT * INTO v_estimate
  FROM public.estimate_vehicle_value_usd(
    v_car.brand_text_backup,
    v_car.model_text_backup,
    v_car.year
  );

  -- Update car record
  UPDATE public.cars
  SET
    estimated_value_usd = v_estimate.estimated_value,
    category_id = v_estimate.category_id,
    value_usd_source = CASE
      WHEN value_usd IS NOT NULL THEN 'owner_manual'
      ELSE v_estimate.data_source
    END
  WHERE id = p_car_id;
END;
$$;

COMMENT ON FUNCTION public.populate_car_estimates IS
'Populates estimated_value_usd and category_id for a single car';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test estimation for known models
-- SELECT * FROM estimate_vehicle_value_usd('Toyota', 'Corolla', 2020);
-- SELECT * FROM estimate_vehicle_value_usd('Fiat', 'Uno', 2018);
-- SELECT * FROM estimate_vehicle_value_usd('Mercedes-Benz', 'C-Class', 2022);

-- Test with actual car (replace with real car ID)
-- SELECT
--   id,
--   brand_text_backup AS brand,
--   model_text_backup AS model,
--   year,
--   value_usd AS owner_value,
--   (SELECT estimated_value FROM estimate_vehicle_value_usd(brand_text_backup, model_text_backup, year)) AS estimated_value,
--   (SELECT data_source FROM estimate_vehicle_value_usd(brand_text_backup, model_text_backup, year)) AS source
-- FROM cars
-- LIMIT 10;
