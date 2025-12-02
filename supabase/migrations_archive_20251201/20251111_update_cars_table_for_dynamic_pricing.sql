-- ============================================================================
-- MIGRATION: Update cars table for vehicle-aware dynamic pricing
-- Date: 2025-11-11
-- Purpose: Add category and estimated value fields for smart base price calculation
-- Impact: Enables per-vehicle pricing instead of region-wide pricing
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add new columns to cars table
-- ============================================================================

-- Category reference (economy/standard/premium/luxury)
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.vehicle_categories(id);

-- Estimated value if owner didn't provide value_usd
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS estimated_value_usd INTEGER;

-- Track source of value_usd data
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS value_usd_source TEXT DEFAULT 'owner_manual'; -- owner_manual, estimated, fipe, api

-- FIPE integration fields (for future sync with FIPE API)
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS fipe_code TEXT; -- FIPE reference code

ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS fipe_last_sync TIMESTAMPTZ; -- Last time synced with FIPE

-- Pricing override (if owner wants custom daily rate %)
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS custom_daily_rate_pct DECIMAL(5,4); -- Override category default

-- ============================================================================
-- 2. Add indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cars_category_id ON public.cars(category_id);
CREATE INDEX IF NOT EXISTS idx_cars_value_usd ON public.cars(value_usd) WHERE value_usd IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_estimated_value ON public.cars(estimated_value_usd) WHERE estimated_value_usd IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_fipe_code ON public.cars(fipe_code) WHERE fipe_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_dynamic_pricing ON public.cars(uses_dynamic_pricing) WHERE uses_dynamic_pricing = true;

-- ============================================================================
-- 3. Add check constraints
-- ============================================================================

-- Ensure value_usd_source is valid
ALTER TABLE public.cars
DROP CONSTRAINT IF EXISTS check_value_usd_source,
ADD CONSTRAINT check_value_usd_source
CHECK (value_usd_source IN ('owner_manual', 'estimated', 'fipe', 'api', 'ml'));

-- Ensure custom daily rate is reasonable if provided
ALTER TABLE public.cars
DROP CONSTRAINT IF EXISTS check_custom_daily_rate_pct,
ADD CONSTRAINT check_custom_daily_rate_pct
CHECK (custom_daily_rate_pct IS NULL OR (custom_daily_rate_pct >= 0.0010 AND custom_daily_rate_pct <= 0.0100));
-- Min 0.10%, max 1.00% per day

-- ============================================================================
-- 4. Add column comments
-- ============================================================================

COMMENT ON COLUMN public.cars.category_id IS 'Vehicle category (economy/standard/premium/luxury) for base price calculation';
COMMENT ON COLUMN public.cars.estimated_value_usd IS 'Auto-estimated value if owner did not provide value_usd';
COMMENT ON COLUMN public.cars.value_usd_source IS 'Source of vehicle valuation: owner_manual, estimated (from pricing_models), fipe (Brazilian API), api (external), ml (MercadoLibre)';
COMMENT ON COLUMN public.cars.fipe_code IS 'FIPE reference code for automatic price updates (Brazilian vehicles)';
COMMENT ON COLUMN public.cars.fipe_last_sync IS 'Last time vehicle value was synced with FIPE API';
COMMENT ON COLUMN public.cars.custom_daily_rate_pct IS 'Owner override for daily rate percentage (if different from category default)';

-- ============================================================================
-- 5. Create helper function: get effective vehicle value
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_effective_vehicle_value(p_car_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_value_usd INTEGER;
  v_estimated_value INTEGER;
BEGIN
  -- Get both values
  SELECT value_usd, estimated_value_usd
  INTO v_value_usd, v_estimated_value
  FROM public.cars
  WHERE id = p_car_id;

  -- Prefer owner-provided value, fallback to estimated
  RETURN COALESCE(v_value_usd, v_estimated_value);
END;
$$;

COMMENT ON FUNCTION public.get_effective_vehicle_value IS 'Returns value_usd if set by owner, otherwise estimated_value_usd';

-- ============================================================================
-- 6. Create helper function: get effective daily rate %
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_effective_daily_rate_pct(p_car_id UUID)
RETURNS DECIMAL(5,4)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_custom_rate DECIMAL(5,4);
  v_category_rate DECIMAL(5,4);
  v_category_id UUID;
BEGIN
  -- Get car's custom rate and category
  SELECT custom_daily_rate_pct, category_id
  INTO v_custom_rate, v_category_id
  FROM public.cars
  WHERE id = p_car_id;

  -- If car has custom rate, use it
  IF v_custom_rate IS NOT NULL THEN
    RETURN v_custom_rate;
  END IF;

  -- Otherwise get category default
  SELECT base_daily_rate_pct
  INTO v_category_rate
  FROM public.vehicle_categories
  WHERE id = v_category_id;

  -- Fallback to 0.30% if no category
  RETURN COALESCE(v_category_rate, 0.0030);
END;
$$;

COMMENT ON FUNCTION public.get_effective_daily_rate_pct IS 'Returns custom rate if set, otherwise category default, fallback 0.30%';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check new columns exist
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'cars'
--   AND column_name IN ('category_id', 'estimated_value_usd', 'value_usd_source', 'fipe_code', 'custom_daily_rate_pct')
-- ORDER BY column_name;

-- Test helper functions (replace with actual car ID)
-- SELECT
--   id,
--   title,
--   value_usd,
--   estimated_value_usd,
--   get_effective_vehicle_value(id) AS effective_value,
--   custom_daily_rate_pct,
--   get_effective_daily_rate_pct(id) AS effective_rate_pct,
--   (get_effective_vehicle_value(id) * get_effective_daily_rate_pct(id))::INTEGER AS estimated_daily_price_usd
-- FROM public.cars
-- LIMIT 5;
