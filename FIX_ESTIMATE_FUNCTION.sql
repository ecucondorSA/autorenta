-- ============================================================================
-- FIX: estimate_vehicle_value_usd() - Resolver ambigüedad de category_id
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
    vpm.base_value_usd,
    vpm.category_id,  -- FIX: Usar vpm.category_id en lugar de solo category_id
    vpm.confidence_level,
    (SELECT vc.depreciation_rate_annual FROM vehicle_categories vc WHERE vc.id = vpm.category_id) AS dep_rate
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

    -- Apply depreciation
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
    AVG(vpm.base_value_usd)::INTEGER,
    mode() WITHIN GROUP (ORDER BY vpm.category_id),
    'low',
    AVG((SELECT vc.depreciation_rate_annual FROM vehicle_categories vc WHERE vc.id = vpm.category_id))
  INTO v_base_value, v_category_id, v_confidence, v_depreciation_rate
  FROM public.vehicle_pricing_models vpm
  WHERE
    LOWER(TRIM(vpm.brand)) = LOWER(TRIM(p_brand))
    AND p_year >= vpm.year_from - 5
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
  v_base_value := 20000;
  v_depreciation_rate := 0.05;
  v_estimated_value := (
    v_base_value *
    GREATEST(POWER(1 - v_depreciation_rate, v_age_years), 0.30)
  )::INTEGER;

  -- Classify by estimated value
  v_category_id := (
    SELECT vc.id FROM vehicle_categories vc
    WHERE vc.code = CASE
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
Fallbacks: 1) Exact match, 2) Brand average, 3) Year-based estimate
FIX: Resolved category_id ambiguity by using table aliases';
