-- ============================================================================
-- Migration: Create calculate_suggested_daily_rate RPC
-- Date: 2025-11-12
-- Purpose: Calculate suggested daily rate for publish form UI
--
-- This function calculates a recommended daily rental rate based on:
-- - Vehicle value (from FIPE or manual entry)
-- - Vehicle category (Economy/Standard/Premium/Luxury)
-- - Regional pricing factors
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_suggested_daily_rate(
  p_value_usd NUMERIC,
  p_category_id UUID,
  p_country TEXT DEFAULT 'AR'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_category vehicle_categories;
  v_suggested_daily_rate DECIMAL(10,2);
BEGIN
  -- Get category details
  SELECT * INTO v_category
  FROM vehicle_categories
  WHERE id = p_category_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'estimated_value_usd', p_value_usd,
      'confidence', 'low',
      'source', 'category_fallback',
      'suggested_daily_rate_usd', NULL,
      'error', 'Category not found'
    );
  END IF;

  -- Calculate suggested daily rate using category base daily rate percentage
  -- Formula: vehicle_value * base_daily_rate_pct
  -- The base_daily_rate_pct is already a decimal (e.g., 0.0035 = 0.35% per day)
  -- For example: Economy = 0.0035 (0.35%), Standard = 0.0030 (0.30%)
  v_suggested_daily_rate := p_value_usd * v_category.base_daily_rate_pct;

  -- Ensure minimum rate of $5/day
  IF v_suggested_daily_rate < 5 THEN
    v_suggested_daily_rate := 5;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'estimated_value_usd', p_value_usd,
    'confidence', 'high',
    'source', 'pricing_model',
    'category_id', p_category_id,
    'category_name', v_category.name_es,
    'suggested_daily_rate_usd', ROUND(v_suggested_daily_rate, 0),
    'base_daily_rate_pct', v_category.base_daily_rate_pct
  );
END;
$$;

COMMENT ON FUNCTION calculate_suggested_daily_rate IS
'Calculate suggested daily rental rate for vehicle based on value and category. Used in publish form UI to guide owners on competitive pricing.';

GRANT EXECUTE ON FUNCTION calculate_suggested_daily_rate TO authenticated;
