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
