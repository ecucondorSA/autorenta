-- Add missing rental rules fields to cars
-- Fixes PGRST204: missing columns in PostgREST schema cache

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS fuel_policy text DEFAULT 'full_to_full',
  ADD COLUMN IF NOT EXISTS allow_second_driver boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS second_driver_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_anticipation_days integer DEFAULT 90;

COMMENT ON COLUMN cars.fuel_policy IS 'Fuel policy for rentals (e.g., full_to_full, same_to_same).';
COMMENT ON COLUMN cars.allow_second_driver IS 'Whether a second driver is allowed for this car.';
COMMENT ON COLUMN cars.second_driver_cost IS 'Extra cost (in platform currency) for adding a second driver.';
COMMENT ON COLUMN cars.max_anticipation_days IS 'Maximum days in advance a renter can book this car.';

-- Backfill sensible defaults for existing rows
UPDATE cars
SET
  fuel_policy = COALESCE(fuel_policy, 'full_to_full'),
  allow_second_driver = COALESCE(allow_second_driver, true),
  second_driver_cost = COALESCE(second_driver_cost, 0),
  max_anticipation_days = COALESCE(max_anticipation_days, 90)
WHERE
  fuel_policy IS NULL
  OR allow_second_driver IS NULL
  OR second_driver_cost IS NULL
  OR max_anticipation_days IS NULL;
