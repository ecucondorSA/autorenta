-- =============================================
-- BATCH DYNAMIC PRICING FUNCTION
-- Created: 2025-11-04
-- Purpose: Calculate dynamic prices for multiple regions efficiently
-- =============================================

CREATE OR REPLACE FUNCTION public.calculate_batch_dynamic_prices(
  p_region_ids UUID[],
  p_user_id UUID,
  p_rental_start TIMESTAMPTZ,
  p_rental_hours INT
)
RETURNS JSONB[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_results JSONB[] := '{}';
  v_region_id UUID;
  v_pricing_result JSONB;
BEGIN
  -- Loop through each region_id and calculate pricing
  FOREACH v_region_id IN ARRAY p_region_ids
  LOOP
    -- Call existing single-region function
    BEGIN
      v_pricing_result := public.calculate_dynamic_price(
        v_region_id,
        p_user_id,
        p_rental_start,
        p_rental_hours
      );

      -- Add region_id to result for mapping
      v_pricing_result := jsonb_set(
        v_pricing_result,
        '{region_id}',
        to_jsonb(v_region_id::text)
      );

      -- Determine surge_active flag
      v_pricing_result := jsonb_set(
        v_pricing_result,
        '{surge_active}',
        to_jsonb((v_pricing_result->'breakdown'->>'demand_factor')::decimal > 0.0)
      );

      -- Append to results array
      v_results := array_append(v_results, v_pricing_result);
    EXCEPTION
      WHEN OTHERS THEN
        -- If a region fails, add error result
        v_results := array_append(v_results, jsonb_build_object(
          'region_id', v_region_id::text,
          'error', SQLERRM,
          'price_per_hour', 0,
          'total_price', 0,
          'currency', 'ARS',
          'surge_active', false
        ));
    END;
  END LOOP;

  RETURN v_results;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.calculate_batch_dynamic_prices TO anon, authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.calculate_batch_dynamic_prices IS 'Calculates dynamic prices for multiple regions in a single call. Returns array of pricing objects with region_id for mapping.';
