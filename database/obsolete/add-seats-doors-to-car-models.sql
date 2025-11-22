-- ================================================
-- Add seats and doors to car_models table
-- Description: Normalize vehicle specifications in car_models
-- Date: 2025-10-17
-- ================================================

BEGIN;

-- Step 1: Add seats and doors columns to car_models
ALTER TABLE public.car_models
ADD COLUMN IF NOT EXISTS seats integer CHECK (seats BETWEEN 1 AND 9),
ADD COLUMN IF NOT EXISTS doors integer CHECK (doors BETWEEN 2 AND 6);

-- Step 2: Populate seats and doors based on category and common defaults
-- Default values by category:
-- - Sedan: 5 seats, 4 doors
-- - SUV: 5 seats, 4 doors
-- - Hatchback: 5 seats, 4 doors (or 2 for small city cars)
-- - Pickup: 5 seats, 4 doors (or 2 for single cab)
-- - Van/Minivan: 7-9 seats, 4 doors
-- - Coupe: 4 seats, 2 doors
-- - Convertible: 4 seats, 2 doors

-- Update by category
UPDATE public.car_models
SET seats = 5, doors = 4
WHERE category ILIKE '%sedan%'
AND (seats IS NULL OR doors IS NULL);

UPDATE public.car_models
SET seats = 5, doors = 4
WHERE category ILIKE '%suv%'
AND (seats IS NULL OR doors IS NULL);

UPDATE public.car_models
SET seats = 5, doors = 4
WHERE category ILIKE '%hatchback%'
AND (seats IS NULL OR doors IS NULL);

UPDATE public.car_models
SET seats = 5, doors = 4
WHERE category ILIKE '%pickup%'
AND (seats IS NULL OR doors IS NULL);

UPDATE public.car_models
SET seats = 7, doors = 4
WHERE (category ILIKE '%van%' OR category ILIKE '%minivan%')
AND (seats IS NULL OR doors IS NULL);

UPDATE public.car_models
SET seats = 4, doors = 2
WHERE (category ILIKE '%coupe%' OR category ILIKE '%convertible%')
AND (seats IS NULL OR doors IS NULL);

-- Step 3: Default for any remaining NULL values (assume standard sedan)
UPDATE public.car_models
SET seats = 5
WHERE seats IS NULL;

UPDATE public.car_models
SET doors = 4
WHERE doors IS NULL;

-- Step 4: Make columns NOT NULL after populating
ALTER TABLE public.car_models
ALTER COLUMN seats SET NOT NULL,
ALTER COLUMN doors SET NOT NULL;

-- Step 5: Update cars table to make seats/doors nullable
-- (They will be populated from car_models on insert)
ALTER TABLE public.cars
ALTER COLUMN seats DROP NOT NULL,
ALTER COLUMN doors DROP NOT NULL;

-- Step 6: Backfill existing cars with seats/doors from their models
UPDATE public.cars c
SET
  seats = cm.seats,
  doors = cm.doors
FROM public.car_models cm
WHERE c.model_id = cm.id
AND (c.seats IS NULL OR c.doors IS NULL);

COMMIT;

-- ================================================
-- Verification Queries
-- ================================================
-- SELECT cm.name as model, cm.category, cm.seats, cm.doors
-- FROM car_models cm
-- JOIN car_brands cb ON cm.brand_id = cb.id
-- ORDER BY cb.name, cm.name
-- LIMIT 20;
--
-- SELECT c.title, cm.name as model, c.seats, c.doors, cm.seats as model_seats, cm.doors as model_doors
-- FROM cars c
-- JOIN car_models cm ON c.model_id = cm.id
-- LIMIT 10;
