-- ============================================================================
-- VEHICLE-AWARE PRICING SYSTEM - COMPLETE DEPLOYMENT
-- Date: 2025-11-11
-- Purpose: Deploy all 8 migrations for vehicle-aware dynamic pricing
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this ENTIRE file
-- 3. Click "Run" to apply all changes
-- 4. Verify success with queries at the end
-- ============================================================================

-- MIGRATION 1: Create vehicle_categories table
-- ============================================================================
-- ============================================================================
-- MIGRATION: Create vehicle_categories table for dynamic pricing
-- Date: 2025-11-11
-- Purpose: Enable vehicle-aware base price calculation by category
-- Impact: Foundation for smart dynamic pricing system
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create vehicle_categories table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_es TEXT, -- Spanish name for UI
  base_daily_rate_pct DECIMAL(5,4) NOT NULL DEFAULT 0.0030, -- 0.30% of vehicle value per day
  depreciation_rate_annual DECIMAL(4,3) NOT NULL DEFAULT 0.050, -- 5% per year default
  surge_sensitivity DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- How much surge affects (0.80-1.20)
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_categories_code ON public.vehicle_categories(code);
CREATE INDEX IF NOT EXISTS idx_vehicle_categories_active ON public.vehicle_categories(active) WHERE active = true;

-- Add comments
COMMENT ON TABLE public.vehicle_categories IS 'Vehicle categories for dynamic pricing base calculation';
COMMENT ON COLUMN public.vehicle_categories.base_daily_rate_pct IS 'Daily rental rate as % of vehicle value (0.0030 = 0.30%)';
COMMENT ON COLUMN public.vehicle_categories.depreciation_rate_annual IS 'Annual depreciation rate (0.050 = 5% per year)';
COMMENT ON COLUMN public.vehicle_categories.surge_sensitivity IS 'Multiplier for surge pricing (1.00 = standard, 0.80 = less sensitive, 1.20 = more sensitive)';

-- ============================================================================
-- 2. Seed initial categories
-- ============================================================================

INSERT INTO public.vehicle_categories (code, name, name_es, base_daily_rate_pct, depreciation_rate_annual, surge_sensitivity, description, display_order) VALUES
(
  'economy',
  'Economy',
  'Económico',
  0.0035, -- 0.35% per day
  0.070,  -- 7% annual depreciation
  1.10,   -- 10% more sensitive to surge
  'Entry-level vehicles, compact cars, basic features. Examples: Fiat Uno, Chevrolet Onix, Renault Kwid.',
  1
),
(
  'standard',
  'Standard',
  'Estándar',
  0.0030, -- 0.30% per day (BASELINE)
  0.050,  -- 5% annual depreciation
  1.00,   -- Standard surge sensitivity
  'Mid-range sedans and hatchbacks, good features. Examples: Toyota Corolla, Honda Civic, Volkswagen Golf.',
  2
),
(
  'premium',
  'Premium',
  'Premium',
  0.0025, -- 0.25% per day
  0.040,  -- 4% annual depreciation
  0.90,   -- 10% less sensitive to surge
  'Upscale vehicles, premium features, SUVs. Examples: Toyota RAV4, Honda CR-V, Audi A4.',
  3
),
(
  'luxury',
  'Luxury',
  'Lujo',
  0.0020, -- 0.20% per day
  0.030,  -- 3% annual depreciation
  0.80,   -- 20% less sensitive to surge
  'High-end luxury vehicles, top features. Examples: Mercedes-Benz, BMW, Tesla Model S.',
  4
);

-- ============================================================================
-- 3. Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_vehicle_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vehicle_categories_updated_at
  BEFORE UPDATE ON public.vehicle_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_categories_updated_at();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View all categories
-- SELECT * FROM public.vehicle_categories ORDER BY display_order;

-- Example: Calculate daily price for $20,000 vehicle by category
-- SELECT
--   code,
--   name_es,
--   20000 * base_daily_rate_pct AS daily_price_usd,
--   ROUND((20000 * base_daily_rate_pct) * 1.0, 2) AS daily_price_usd_rounded
-- FROM public.vehicle_categories
-- ORDER BY display_order;

-- Example output:
-- economy:   $20k * 0.35% = $70/day
-- standard:  $20k * 0.30% = $60/day (baseline)
-- premium:   $20k * 0.25% = $50/day
-- luxury:    $20k * 0.20% = $40/day
-- ============================================================================
-- MIGRATION: Create vehicle_pricing_models table for value estimation
-- Date: 2025-11-11
-- Purpose: Reference data for estimating vehicle values by make/model/year
-- Impact: Enables automatic value_usd estimation for cars without manual value
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create vehicle_pricing_models table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_pricing_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL, -- Use 9999 for current/future models
  base_value_usd INTEGER NOT NULL, -- Reference market value in USD
  category_id UUID NOT NULL REFERENCES public.vehicle_categories(id),
  confidence_level TEXT NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low', 'estimated'
  data_source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'api', 'estimated', 'ml'
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure year range is valid
  CONSTRAINT check_year_range CHECK (year_to >= year_from),

  -- Ensure positive value
  CONSTRAINT check_positive_value CHECK (base_value_usd > 0)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_brand ON public.vehicle_pricing_models(brand);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_model ON public.vehicle_pricing_models(model);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_brand_model ON public.vehicle_pricing_models(brand, model);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_year_range ON public.vehicle_pricing_models(year_from, year_to);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_category ON public.vehicle_pricing_models(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_active ON public.vehicle_pricing_models(active) WHERE active = true;

-- Add comments
COMMENT ON TABLE public.vehicle_pricing_models IS 'Reference valuations for vehicle make/model/year combinations';
COMMENT ON COLUMN public.vehicle_pricing_models.base_value_usd IS 'Market value in USD for this model in the given year range';
COMMENT ON COLUMN public.vehicle_pricing_models.confidence_level IS 'Data quality: high (verified), medium (estimated), low (placeholder)';
COMMENT ON COLUMN public.vehicle_pricing_models.data_source IS 'Source of valuation: manual, api (external service), estimated, ml (machine learning)';

-- ============================================================================
-- 2. Seed popular models in Argentina (Economy Category)
-- ============================================================================

INSERT INTO public.vehicle_pricing_models (brand, model, year_from, year_to, base_value_usd, category_id, confidence_level, data_source, notes) VALUES
-- Fiat Uno
('Fiat', 'Uno', 2015, 2018, 6000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Popular entry-level city car'),
('Fiat', 'Uno', 2019, 2021, 7500, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Updated generation'),
('Fiat', 'Uno', 2022, 9999, 9000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Current model'),

-- Chevrolet Onix
('Chevrolet', 'Onix', 2015, 2019, 8000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Best-seller compact'),
('Chevrolet', 'Onix', 2020, 2022, 12000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'New generation'),
('Chevrolet', 'Onix', 2023, 9999, 15000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'high', 'manual', 'Current model, verified pricing'),

-- Renault Kwid
('Renault', 'Kwid', 2017, 2020, 7000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Ultra-compact, budget'),
('Renault', 'Kwid', 2021, 9999, 9500, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Facelift'),

-- Ford Ka
('Ford', 'Ka', 2015, 2018, 7500, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Discontinued but popular used'),
('Ford', 'Ka', 2019, 2021, 9000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Final years'),

-- Volkswagen Gol
('Volkswagen', 'Gol', 2015, 2019, 8500, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Classic economy car'),
('Volkswagen', 'Gol', 2020, 9999, 11000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Later generation');

-- ============================================================================
-- 3. Seed popular models in Argentina (Standard Category)
-- ============================================================================

INSERT INTO public.vehicle_pricing_models (brand, model, year_from, year_to, base_value_usd, category_id, confidence_level, data_source, notes) VALUES
-- Toyota Corolla
('Toyota', 'Corolla', 2015, 2018, 14000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'high', 'manual', 'Reliable sedan, high demand'),
('Toyota', 'Corolla', 2019, 2021, 18000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'high', 'manual', 'TNGA platform'),
('Toyota', 'Corolla', 2022, 9999, 22000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'high', 'manual', 'Hybrid available'),

-- Honda Civic
('Honda', 'Civic', 2015, 2018, 15000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'Sporty sedan'),
('Honda', 'Civic', 2019, 2021, 19000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', '10th generation'),
('Honda', 'Civic', 2022, 9999, 24000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'high', 'manual', '11th generation'),

-- Volkswagen Golf
('Volkswagen', 'Golf', 2015, 2018, 16000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'Premium hatchback'),
('Volkswagen', 'Golf', 2019, 2022, 20000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'MK7.5'),
('Volkswagen', 'Golf', 2023, 9999, 25000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'MK8'),

-- Peugeot 308
('Peugeot', '308', 2015, 2019, 12000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'French sedan'),
('Peugeot', '308', 2020, 9999, 18000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'New design'),

-- Chevrolet Cruze
('Chevrolet', 'Cruze', 2015, 2019, 13000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'Mid-size sedan'),
('Chevrolet', 'Cruze', 2020, 9999, 18000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'Refreshed'),

-- Nissan Versa
('Nissan', 'Versa', 2015, 2019, 11000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'Affordable sedan'),
('Nissan', 'Versa', 2020, 9999, 14000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'New generation');

-- ============================================================================
-- 4. Seed popular models in Argentina (Premium Category)
-- ============================================================================

INSERT INTO public.vehicle_pricing_models (brand, model, year_from, year_to, base_value_usd, category_id, confidence_level, data_source, notes) VALUES
-- Toyota RAV4
('Toyota', 'RAV4', 2015, 2018, 22000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'high', 'manual', 'Best-selling SUV'),
('Toyota', 'RAV4', 2019, 2021, 28000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'high', 'manual', '5th generation'),
('Toyota', 'RAV4', 2022, 9999, 35000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'high', 'manual', 'Hybrid Prime available'),

-- Honda CR-V
('Honda', 'CR-V', 2015, 2018, 20000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Family SUV'),
('Honda', 'CR-V', 2019, 2022, 27000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Turbo engine'),
('Honda', 'CR-V', 2023, 9999, 33000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Hybrid option'),

-- Jeep Compass
('Jeep', 'Compass', 2017, 2020, 24000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Off-road capable'),
('Jeep', 'Compass', 2021, 9999, 30000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Refreshed design'),

-- Volkswagen Tiguan
('Volkswagen', 'Tiguan', 2017, 2021, 28000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Premium SUV'),
('Volkswagen', 'Tiguan', 2022, 9999, 35000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Updated tech'),

-- Hyundai Tucson
('Hyundai', 'Tucson', 2016, 2020, 20000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Value SUV'),
('Hyundai', 'Tucson', 2021, 9999, 28000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'high', 'manual', 'Radical redesign'),

-- Hyundai Creta
('Hyundai', 'Creta', 2017, 2021, 18000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Compact SUV'),
('Hyundai', 'Creta', 2022, 9999, 25000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'high', 'manual', 'New generation');

-- ============================================================================
-- 5. Seed popular models in Argentina (Luxury Category)
-- ============================================================================

INSERT INTO public.vehicle_pricing_models (brand, model, year_from, year_to, base_value_usd, category_id, confidence_level, data_source, notes) VALUES
-- Mercedes-Benz C-Class
('Mercedes-Benz', 'C-Class', 2015, 2018, 35000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Entry luxury sedan'),
('Mercedes-Benz', 'C-Class', 2019, 2021, 42000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'W205 facelift'),
('Mercedes-Benz', 'C-Class', 2022, 9999, 55000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'W206 new generation'),

-- BMW Serie 3
('BMW', '3 Series', 2015, 2018, 38000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Sports sedan'),
('BMW', '3 Series', 2019, 2022, 45000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'G20 generation'),
('BMW', '3 Series', 2023, 9999, 58000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Updated tech'),

-- Audi A4
('Audi', 'A4', 2016, 2019, 36000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Tech-focused luxury'),
('Audi', 'A4', 2020, 9999, 48000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'B9 facelift'),

-- Tesla Model 3
('Tesla', 'Model 3', 2019, 2021, 45000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'high', 'manual', 'Electric sedan'),
('Tesla', 'Model 3', 2022, 9999, 48000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'high', 'manual', 'Highland refresh'),

-- Volvo S60
('Volvo', 'S60', 2019, 9999, 42000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Scandinavian luxury'),

-- Mercedes-Benz GLC
('Mercedes-Benz', 'GLC', 2016, 2019, 42000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Luxury SUV'),
('Mercedes-Benz', 'GLC', 2020, 9999, 55000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Updated platform');

-- ============================================================================
-- 6. Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_vehicle_pricing_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vehicle_pricing_models_updated_at
  BEFORE UPDATE ON public.vehicle_pricing_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_pricing_models_updated_at();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count models by category
-- SELECT
--   c.name_es AS category,
--   COUNT(*) AS model_count,
--   MIN(base_value_usd) AS min_value,
--   AVG(base_value_usd)::INTEGER AS avg_value,
--   MAX(base_value_usd) AS max_value
-- FROM vehicle_pricing_models vpm
-- JOIN vehicle_categories c ON vpm.category_id = c.id
-- GROUP BY c.name_es, c.display_order
-- ORDER BY c.display_order;

-- Find pricing for specific car
-- SELECT brand, model, year_from, year_to, base_value_usd,
--        (SELECT name_es FROM vehicle_categories WHERE id = category_id) AS category
-- FROM vehicle_pricing_models
-- WHERE brand ILIKE '%Toyota%' AND model ILIKE '%Corolla%'
-- ORDER BY year_from DESC;

-- Test depreciation calculation (5 year old Corolla 2019)
-- WITH car AS (
--   SELECT base_value_usd,
--          (SELECT depreciation_rate_annual FROM vehicle_categories WHERE id = category_id) AS dep_rate
--   FROM vehicle_pricing_models
--   WHERE brand = 'Toyota' AND model = 'Corolla' AND year_from <= 2019 AND year_to >= 2019
-- )
-- SELECT
--   base_value_usd AS original_value,
--   dep_rate AS annual_depreciation,
--   (EXTRACT(YEAR FROM NOW()) - 2019)::INTEGER AS years_old,
--   (base_value_usd * POWER(1 - dep_rate, EXTRACT(YEAR FROM NOW()) - 2019))::INTEGER AS current_estimated_value
-- FROM car;
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
-- ============================================================================
-- MIGRATION: Migrate existing cars to vehicle categories
-- Date: 2025-11-11
-- Purpose: Classify all existing cars into categories and estimate missing values
-- Impact: Populates category_id and estimated_value_usd for all cars
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Classify cars WITH value_usd into categories
-- ============================================================================

-- Economy: < $10,000 USD
UPDATE public.cars
SET
  category_id = (SELECT id FROM vehicle_categories WHERE code = 'economy'),
  value_usd_source = 'owner_manual'
WHERE
  value_usd IS NOT NULL
  AND value_usd < 10000
  AND category_id IS NULL;

-- Standard: $10,000 - $20,000 USD
UPDATE public.cars
SET
  category_id = (SELECT id FROM vehicle_categories WHERE code = 'standard'),
  value_usd_source = 'owner_manual'
WHERE
  value_usd IS NOT NULL
  AND value_usd >= 10000
  AND value_usd < 20000
  AND category_id IS NULL;

-- Premium: $20,000 - $35,000 USD
UPDATE public.cars
SET
  category_id = (SELECT id FROM vehicle_categories WHERE code = 'premium'),
  value_usd_source = 'owner_manual'
WHERE
  value_usd IS NOT NULL
  AND value_usd >= 20000
  AND value_usd < 35000
  AND category_id IS NULL;

-- Luxury: >= $35,000 USD
UPDATE public.cars
SET
  category_id = (SELECT id FROM vehicle_categories WHERE code = 'luxury'),
  value_usd_source = 'owner_manual'
WHERE
  value_usd IS NOT NULL
  AND value_usd >= 35000
  AND category_id IS NULL;

-- ============================================================================
-- 2. Estimate values for cars WITHOUT value_usd
-- ============================================================================

-- Create temporary table to store estimates
CREATE TEMP TABLE temp_car_estimates AS
SELECT
  c.id AS car_id,
  c.brand_text_backup,
  c.model_text_backup,
  c.year,
  e.estimated_value,
  e.category_id,
  e.data_source
FROM public.cars c
CROSS JOIN LATERAL public.estimate_vehicle_value_usd(
  c.brand_text_backup,
  c.model_text_backup,
  c.year
) e
WHERE
  c.value_usd IS NULL
  AND c.estimated_value_usd IS NULL;

-- Update cars with estimates
UPDATE public.cars c
SET
  estimated_value_usd = e.estimated_value,
  category_id = e.category_id,
  value_usd_source = e.data_source
FROM temp_car_estimates e
WHERE c.id = e.car_id;

-- ============================================================================
-- 3. Fallback for any remaining cars without category
-- ============================================================================

-- If any cars still don't have category (edge cases), default to standard
UPDATE public.cars
SET
  category_id = (SELECT id FROM vehicle_categories WHERE code = 'standard'),
  estimated_value_usd = COALESCE(estimated_value_usd, 15000), -- Default $15k
  value_usd_source = COALESCE(value_usd_source, 'estimated')
WHERE category_id IS NULL;

-- ============================================================================
-- 4. Verification and summary
-- ============================================================================

DO $$
DECLARE
  v_total_cars INTEGER;
  v_with_owner_value INTEGER;
  v_with_estimated_value INTEGER;
  v_economy INTEGER;
  v_standard INTEGER;
  v_premium INTEGER;
  v_luxury INTEGER;
BEGIN
  -- Count totals
  SELECT COUNT(*) INTO v_total_cars FROM public.cars;
  SELECT COUNT(*) INTO v_with_owner_value FROM public.cars WHERE value_usd IS NOT NULL;
  SELECT COUNT(*) INTO v_with_estimated_value FROM public.cars WHERE estimated_value_usd IS NOT NULL;

  -- Count by category
  SELECT COUNT(*) INTO v_economy
  FROM public.cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  WHERE vc.code = 'economy';

  SELECT COUNT(*) INTO v_standard
  FROM public.cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  WHERE vc.code = 'standard';

  SELECT COUNT(*) INTO v_premium
  FROM public.cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  WHERE vc.code = 'premium';

  SELECT COUNT(*) INTO v_luxury
  FROM public.cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  WHERE vc.code = 'luxury';

  -- Log summary
  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE 'Total cars processed: %', v_total_cars;
  RAISE NOTICE 'Cars with owner-provided value: %', v_with_owner_value;
  RAISE NOTICE 'Cars with estimated value: %', v_with_estimated_value;
  RAISE NOTICE '';
  RAISE NOTICE 'Distribution by category:';
  RAISE NOTICE '  Economy: % (%.1f%%)', v_economy, (v_economy::FLOAT / v_total_cars * 100);
  RAISE NOTICE '  Standard: % (%.1f%%)', v_standard, (v_standard::FLOAT / v_total_cars * 100);
  RAISE NOTICE '  Premium: % (%.1f%%)', v_premium, (v_premium::FLOAT / v_total_cars * 100);
  RAISE NOTICE '  Luxury: % (%.1f%%)', v_luxury, (v_luxury::FLOAT / v_total_cars * 100);
END $$;

-- ============================================================================
-- 5. Create NOT NULL constraint (now that all cars have category_id)
-- ============================================================================

-- Make category_id required for all future cars
ALTER TABLE public.cars
ALTER COLUMN category_id SET NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View distribution by category
-- SELECT
--   vc.name_es AS category,
--   COUNT(*) AS car_count,
--   MIN(COALESCE(c.value_usd, c.estimated_value_usd)) AS min_value,
--   AVG(COALESCE(c.value_usd, c.estimated_value_usd))::INTEGER AS avg_value,
--   MAX(COALESCE(c.value_usd, c.estimated_value_usd)) AS max_value,
--   SUM(CASE WHEN c.value_usd IS NOT NULL THEN 1 ELSE 0 END) AS with_owner_value,
--   SUM(CASE WHEN c.estimated_value_usd IS NOT NULL THEN 1 ELSE 0 END) AS with_estimated_value
-- FROM public.cars c
-- JOIN vehicle_categories vc ON c.category_id = vc.id
-- GROUP BY vc.name_es, vc.display_order
-- ORDER BY vc.display_order;

-- Check for any cars without category (should be 0)
-- SELECT COUNT(*) AS cars_without_category
-- FROM public.cars
-- WHERE category_id IS NULL;

-- Sample cars by category
-- SELECT
--   vc.name_es AS category,
--   c.brand_text_backup,
--   c.model_text_backup,
--   c.year,
--   c.value_usd AS owner_value,
--   c.estimated_value_usd,
--   COALESCE(c.value_usd, c.estimated_value_usd) AS effective_value,
--   c.value_usd_source
-- FROM public.cars c
-- JOIN vehicle_categories vc ON c.category_id = vc.id
-- ORDER BY vc.display_order, RANDOM()
-- LIMIT 20;
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
-- ============================================================================
-- MIGRATION: Update lock_price_for_booking() to use vehicle-aware pricing
-- Date: 2025-11-11
-- Purpose: Pass car_id to calculate_dynamic_price() for vehicle-specific pricing
-- Impact: Price locks now consider vehicle type, value, and depreciation
-- ============================================================================

BEGIN;

-- ============================================================================
-- Update lock_price_for_booking() to pass car_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.lock_price_for_booking(
  p_car_id UUID,
  p_user_id UUID,
  p_rental_start TIMESTAMPTZ,
  p_rental_hours INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_region_id UUID;
  v_car_record RECORD;
  v_dynamic_price JSONB;
  v_lock_token UUID;
  v_lock_expires TIMESTAMPTZ;
BEGIN
  -- Validate car exists and get details
  SELECT id, region_id, price_per_day, uses_dynamic_pricing
  INTO v_car_record
  FROM public.cars
  WHERE id = p_car_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found or deleted';
  END IF;

  -- Check if car uses dynamic pricing
  IF v_car_record.uses_dynamic_pricing = false OR v_car_record.region_id IS NULL THEN
    -- Return fixed price (no lock needed)
    RETURN jsonb_build_object(
      'uses_dynamic_pricing', false,
      'fixed_price', v_car_record.price_per_day,
      'message', 'This car uses fixed pricing'
    );
  END IF;

  -- Calculate dynamic price using VEHICLE-AWARE pricing
  v_dynamic_price := public.calculate_dynamic_price(
    v_car_record.region_id,
    p_user_id,
    p_rental_start,
    p_rental_hours,
    p_car_id  -- NEW: Pass car_id for vehicle-specific base price
  );

  -- Generate lock token and expiry
  v_lock_token := gen_random_uuid();
  v_lock_expires := NOW() + INTERVAL '15 minutes';

  -- Return complete price lock data
  RETURN jsonb_build_object(
    'uses_dynamic_pricing', true,
    'vehicle_aware_pricing', true,  -- NEW: Flag to indicate vehicle-specific pricing
    'price', v_dynamic_price,
    'locked_until', v_lock_expires,
    'lock_token', v_lock_token,
    'car_id', p_car_id,
    'user_id', p_user_id,
    'rental_start', p_rental_start,
    'rental_hours', p_rental_hours,
    'created_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return fallback to fixed price
    RAISE WARNING 'Error calculating dynamic price for car %: %', p_car_id, SQLERRM;
    RETURN jsonb_build_object(
      'uses_dynamic_pricing', false,
      'fixed_price', v_car_record.price_per_day,
      'error', SQLERRM,
      'fallback', true,
      'message', 'Fell back to fixed pricing due to calculation error'
    );
END;
$$;

COMMENT ON FUNCTION public.lock_price_for_booking IS
'Locks a dynamic price for 15 minutes before booking.
Updated to use vehicle-aware pricing that considers vehicle type, value, and depreciation.';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test price lock for a specific car
-- SELECT lock_price_for_booking(
--   'your-car-id'::UUID,
--   'your-user-id'::UUID,
--   NOW() + INTERVAL '2 days',
--   24
-- );

-- Compare locked prices for different vehicles
-- SELECT
--   c.brand_text_backup || ' ' || c.model_text_backup AS vehicle,
--   vc.name AS category,
--   COALESCE(c.value_usd, c.estimated_value_usd) AS vehicle_value,
--   (
--     lock_price_for_booking(
--       c.id,
--       (SELECT id FROM profiles LIMIT 1),
--       NOW() + INTERVAL '2 days',
--       24
--     )->'price'->>'total_price'
--   )::DECIMAL AS locked_total_price_24h
-- FROM cars c
-- JOIN vehicle_categories vc ON c.category_id = vc.id
-- WHERE c.uses_dynamic_pricing = true
--   AND c.region_id IS NOT NULL
-- ORDER BY vehicle_value DESC
-- LIMIT 10;


-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after deployment to verify success
-- ============================================================================

-- Check categories table
SELECT 'vehicle_categories' AS table_name, COUNT(*) AS count FROM vehicle_categories;

-- Check pricing models
SELECT 'vehicle_pricing_models' AS table_name, COUNT(*) AS count FROM vehicle_pricing_models;

-- Check cars have categories
SELECT 'cars_with_category' AS metric, COUNT(*) AS count FROM cars WHERE category_id IS NOT NULL;

-- Sample pricing by category
SELECT 
  vc.name AS category,
  COUNT(c.id) AS cars_count,
  AVG(COALESCE(c.value_usd, c.estimated_value_usd))::INTEGER AS avg_value_usd
FROM cars c
JOIN vehicle_categories vc ON c.category_id = vc.id
GROUP BY vc.name
ORDER BY avg_value_usd;

