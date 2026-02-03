-- ============================================================================
-- ADD: Missing columns for car publishing form
-- Date: 2026-02-03
-- Reason: Form sends fields that don't exist in the database
-- ============================================================================

-- Vehicle specs
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS mileage INTEGER;
COMMENT ON COLUMN public.cars.mileage IS 'Current vehicle mileage in km';

-- Pricing & deposits
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS value_usd NUMERIC(12,2);
COMMENT ON COLUMN public.cars.value_usd IS 'Vehicle market value in USD (from FIPE or manual)';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS uses_dynamic_pricing BOOLEAN DEFAULT false;
COMMENT ON COLUMN public.cars.uses_dynamic_pricing IS 'Whether dynamic pricing is enabled';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS min_rental_days INTEGER DEFAULT 1;
COMMENT ON COLUMN public.cars.min_rental_days IS 'Minimum rental duration in days';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS max_rental_days INTEGER DEFAULT 30;
COMMENT ON COLUMN public.cars.max_rental_days IS 'Maximum rental duration in days';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT true;
COMMENT ON COLUMN public.cars.deposit_required IS 'Whether a security deposit is required';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 0;
COMMENT ON COLUMN public.cars.deposit_amount IS 'Security deposit amount in car currency';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT false;
COMMENT ON COLUMN public.cars.insurance_included IS 'Whether insurance is included in rental price';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS auto_approval BOOLEAN DEFAULT false;
COMMENT ON COLUMN public.cars.auto_approval IS 'Whether bookings are automatically approved';

-- Location details
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_street TEXT;
COMMENT ON COLUMN public.cars.location_street IS 'Street name for pickup location';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_street_number TEXT;
COMMENT ON COLUMN public.cars.location_street_number IS 'Street number for pickup location';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
COMMENT ON COLUMN public.cars.location_lat IS 'Latitude coordinate for pickup location';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
COMMENT ON COLUMN public.cars.location_lng IS 'Longitude coordinate for pickup location';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_province TEXT;
COMMENT ON COLUMN public.cars.location_province IS 'Province/State for pickup location (alias for location_state)';

-- Availability
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS availability_start_date DATE;
COMMENT ON COLUMN public.cars.availability_start_date IS 'Start date when car is available for rent';

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS availability_end_date DATE;
COMMENT ON COLUMN public.cars.availability_end_date IS 'End date when car is available for rent';

-- Description
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS description TEXT;
COMMENT ON COLUMN public.cars.description IS 'Vehicle description for listing';

-- Brand/Model backup (for FIPE integration)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS brand_id UUID;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS model_id UUID;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS brand_text_backup TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS model_text_backup TEXT;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_cars_location ON public.cars (location_lat, location_lng)
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Create index for availability queries
CREATE INDEX IF NOT EXISTS idx_cars_availability ON public.cars (availability_start_date, availability_end_date)
WHERE status = 'active';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verification
DO $$
DECLARE
    col_count INT;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'cars' AND table_schema = 'public';

    RAISE NOTICE 'Cars table now has % columns', col_count;
END $$;
