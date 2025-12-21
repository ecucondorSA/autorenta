-- =============================================
-- MIGRATION: Add region_id to cars table
-- Required for dynamic pricing by region
-- =============================================

-- 1. Add region_id column (nullable initially)
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.pricing_regions(id) ON DELETE SET NULL;

-- 2. Create default region if it doesn't exist
INSERT INTO public.pricing_regions (id, name, country_code, currency, base_price_per_hour)
VALUES (
  'default-region-uuid'::uuid,
  'Default Region',
  'UY',
  'USD',
  2.50
)
ON CONFLICT DO NOTHING;

-- 3. Set default region for existing cars without region_id
UPDATE public.cars
SET region_id = 'default-region-uuid'::uuid
WHERE region_id IS NULL;

-- 4. Make region_id NOT NULL after backfilling
ALTER TABLE public.cars
ALTER COLUMN region_id SET NOT NULL;

-- 5. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cars_region_id ON public.cars(region_id);

-- 6. Add comment for documentation
COMMENT ON COLUMN public.cars.region_id IS 'Pricing region for dynamic pricing calculations';

-- =============================================
-- ROLLBACK (if needed)
-- =============================================
-- ALTER TABLE public.cars DROP COLUMN IF EXISTS region_id;
-- DROP INDEX IF EXISTS idx_cars_region_id;
