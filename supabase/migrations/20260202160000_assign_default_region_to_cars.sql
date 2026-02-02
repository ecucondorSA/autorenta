-- Migration: Assign default region_id to cars without one
-- Date: 2026-02-02
-- Purpose: Fix "No region_id, skipping dynamic pricing" warnings

BEGIN;

-- 1. Get the default region (Argentina/Buenos Aires)
DO $$
DECLARE
  v_default_region_id UUID;
BEGIN
  -- Try to find Argentina region first
  SELECT id INTO v_default_region_id
  FROM public.pricing_regions
  WHERE country_code = 'AR' AND active = true
  LIMIT 1;

  -- If no Argentina region, get any active region
  IF v_default_region_id IS NULL THEN
    SELECT id INTO v_default_region_id
    FROM public.pricing_regions
    WHERE active = true
    LIMIT 1;
  END IF;

  -- Only proceed if we have a region
  IF v_default_region_id IS NOT NULL THEN
    -- Update all cars without region_id
    UPDATE public.cars
    SET region_id = v_default_region_id,
        updated_at = NOW()
    WHERE region_id IS NULL;

    RAISE NOTICE 'Updated cars with default region_id: %', v_default_region_id;
  ELSE
    RAISE WARNING 'No active pricing_regions found. Cars not updated.';
  END IF;
END $$;

-- 2. Create index for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_cars_region_id ON public.cars(region_id);

-- 3. Add comment explaining the column
COMMENT ON COLUMN public.cars.region_id IS 'Reference to pricing_regions for dynamic pricing calculations';

COMMIT;
