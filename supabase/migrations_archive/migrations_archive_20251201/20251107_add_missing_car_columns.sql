-- Add missing columns to cars table
-- These columns are being sent by the frontend but don't exist in production

ALTER TABLE public.cars
  -- Brand/Model IDs (no FK constraints since tables don't exist yet)
  ADD COLUMN IF NOT EXISTS brand_id UUID,
  ADD COLUMN IF NOT EXISTS model_id UUID,

  -- Text backups for brand/model (in case FK relations fail)
  ADD COLUMN IF NOT EXISTS brand_text_backup TEXT,
  ADD COLUMN IF NOT EXISTS model_text_backup TEXT,

  -- Vehicle details
  ADD COLUMN IF NOT EXISTS fuel TEXT,
  ADD COLUMN IF NOT EXISTS fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS transmission TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS mileage INTEGER,
  ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS doors INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}',

  -- Pricing details
  ADD COLUMN IF NOT EXISTS value_usd NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS min_rental_days INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_rental_days INTEGER,
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_approval BOOLEAN DEFAULT false,

  -- Location details
  ADD COLUMN IF NOT EXISTS location_street TEXT,
  ADD COLUMN IF NOT EXISTS location_street_number TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT DEFAULT 'AR',
  ADD COLUMN IF NOT EXISTS location_province TEXT,

  -- Ratings
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_cars_brand_id ON public.cars(brand_id);
CREATE INDEX IF NOT EXISTS idx_cars_model_id ON public.cars(model_id);
CREATE INDEX IF NOT EXISTS idx_cars_transmission ON public.cars(transmission);
CREATE INDEX IF NOT EXISTS idx_cars_fuel ON public.cars(fuel);
CREATE INDEX IF NOT EXISTS idx_cars_price_range ON public.cars(price_per_day);

-- Update existing records to have default values
UPDATE public.cars
SET
  seats = COALESCE(seats, 5),
  doors = COALESCE(doors, 4),
  features = COALESCE(features, '{}'),
  min_rental_days = COALESCE(min_rental_days, 1),
  rating_avg = COALESCE(rating_avg, 0),
  rating_count = COALESCE(rating_count, 0),
  deposit_required = COALESCE(deposit_required, false),
  insurance_included = COALESCE(insurance_included, false),
  auto_approval = COALESCE(auto_approval, false)
WHERE
  seats IS NULL OR
  doors IS NULL OR
  features IS NULL OR
  min_rental_days IS NULL OR
  rating_avg IS NULL OR
  rating_count IS NULL OR
  deposit_required IS NULL OR
  insurance_included IS NULL OR
  auto_approval IS NULL;
