-- ================================================
-- Migration: Expand cars table with missing fields
-- Description: Add fields required by publish-car-v2 frontend
-- Date: 2025-10-17
-- Fixes: Column mismatch between frontend and database
-- ================================================

BEGIN;

-- Vehicle specifications
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS mileage INTEGER CHECK (mileage >= 0),
ADD COLUMN IF NOT EXISTS transmission TEXT CHECK (transmission IN ('manual', 'automatic')),
ADD COLUMN IF NOT EXISTS fuel TEXT CHECK (fuel IN ('gasoline', 'diesel', 'electric', 'hybrid')),
ADD COLUMN IF NOT EXISTS seats INTEGER CHECK (seats >= 1 AND seats <= 12),
ADD COLUMN IF NOT EXISTS doors INTEGER CHECK (doors >= 2 AND doors <= 6);

-- Rental terms
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS min_rental_days INTEGER DEFAULT 1 CHECK (min_rental_days >= 1),
ADD COLUMN IF NOT EXISTS max_rental_days INTEGER CHECK (max_rental_days IS NULL OR max_rental_days >= min_rental_days),
ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancel_policy TEXT DEFAULT 'flex' CHECK (cancel_policy IN ('flex', 'moderate', 'strict'));

-- Location details
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS location_street TEXT,
ADD COLUMN IF NOT EXISTS location_street_number TEXT,
ADD COLUMN IF NOT EXISTS location_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS location_postal_code TEXT,
ADD COLUMN IF NOT EXISTS location_state TEXT;

-- Features (JSON)
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cars_transmission ON public.cars(transmission);
CREATE INDEX IF NOT EXISTS idx_cars_fuel ON public.cars(fuel);
CREATE INDEX IF NOT EXISTS idx_cars_location_state ON public.cars(location_state);

-- Comments
COMMENT ON COLUMN public.cars.color IS 'Vehicle color (e.g., White, Black, Red)';
COMMENT ON COLUMN public.cars.mileage IS 'Current mileage in kilometers';
COMMENT ON COLUMN public.cars.transmission IS 'Transmission type: manual or automatic';
COMMENT ON COLUMN public.cars.fuel IS 'Fuel type: gasoline, diesel, electric, hybrid';
COMMENT ON COLUMN public.cars.seats IS 'Number of passenger seats';
COMMENT ON COLUMN public.cars.doors IS 'Number of doors';
COMMENT ON COLUMN public.cars.min_rental_days IS 'Minimum rental period in days';
COMMENT ON COLUMN public.cars.max_rental_days IS 'Maximum rental period in days (NULL = unlimited)';
COMMENT ON COLUMN public.cars.insurance_included IS 'Whether insurance is included in the price';
COMMENT ON COLUMN public.cars.cancel_policy IS 'Cancellation policy: flex, moderate, or strict';
COMMENT ON COLUMN public.cars.location_street IS 'Street name';
COMMENT ON COLUMN public.cars.location_street_number IS 'Street number';
COMMENT ON COLUMN public.cars.location_neighborhood IS 'Neighborhood or district';
COMMENT ON COLUMN public.cars.location_postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN public.cars.location_state IS 'State or province (alias for location_province)';
COMMENT ON COLUMN public.cars.features IS 'Vehicle features as JSON: {ac: true, bluetooth: true, ...}';

COMMIT;

-- ================================================
-- Verification Queries (run after migration)
-- ================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'cars' AND table_schema = 'public'
-- ORDER BY ordinal_position;
