-- ================================================
-- Migration: Change cars.brand and cars.model to Foreign Keys
-- Description: Migrate from TEXT fields to FK references to car_brands and car_models
-- Date: 2025-10-17
-- ================================================

BEGIN;

-- Step 1: Add new FK columns (nullable for now)
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES car_brands(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES car_models(id) ON DELETE RESTRICT;

-- Step 2: Migrate existing data by matching brand/model names
-- Update brand_id
UPDATE public.cars c
SET brand_id = cb.id
FROM car_brands cb
WHERE LOWER(TRIM(c.brand)) = LOWER(TRIM(cb.name))
AND c.brand_id IS NULL;

-- Step 3: Migrate model_id (matching both brand and model name)
UPDATE public.cars c
SET model_id = cm.id
FROM car_models cm
JOIN car_brands cb ON cm.brand_id = cb.id
WHERE LOWER(TRIM(c.model)) = LOWER(TRIM(cm.name))
AND LOWER(TRIM(c.brand)) = LOWER(TRIM(cb.name))
AND c.model_id IS NULL;

-- Step 4: Check for any unmapped records (should be 0)
DO $$
DECLARE
  unmapped_brands INT;
  unmapped_models INT;
BEGIN
  SELECT COUNT(*) INTO unmapped_brands FROM cars WHERE brand_id IS NULL;
  SELECT COUNT(*) INTO unmapped_models FROM cars WHERE model_id IS NULL;

  IF unmapped_brands > 0 THEN
    RAISE NOTICE 'WARNING: % cars with unmapped brands', unmapped_brands;
  END IF;

  IF unmapped_models > 0 THEN
    RAISE NOTICE 'WARNING: % cars with unmapped models', unmapped_models;
  END IF;

  IF unmapped_brands > 0 OR unmapped_models > 0 THEN
    RAISE EXCEPTION 'Cannot proceed with migration: unmapped brand/model records exist';
  END IF;
END $$;

-- Step 5: Make FK columns NOT NULL (now that all records are mapped)
ALTER TABLE public.cars
ALTER COLUMN brand_id SET NOT NULL,
ALTER COLUMN model_id SET NOT NULL;

-- Step 6: Rename old TEXT columns to keep as backup temporarily
ALTER TABLE public.cars
RENAME COLUMN brand TO brand_text_backup;
ALTER TABLE public.cars
RENAME COLUMN model TO model_text_backup;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cars_brand_id ON public.cars(brand_id);
CREATE INDEX IF NOT EXISTS idx_cars_model_id ON public.cars(model_id);

-- Step 8: Update RLS policies if needed (cars policies already use owner_id, so no change needed)

COMMIT;

-- ================================================
-- Verification Queries (run after migration)
-- ================================================
-- SELECT COUNT(*) as total_cars,
--        COUNT(brand_id) as with_brand_id,
--        COUNT(model_id) as with_model_id
-- FROM cars;
--
-- SELECT c.id, c.title, cb.name as brand, cm.name as model
-- FROM cars c
-- JOIN car_brands cb ON c.brand_id = cb.id
-- JOIN car_models cm ON c.model_id = cm.id
-- LIMIT 10;
