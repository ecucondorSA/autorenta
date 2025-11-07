-- ============================================================================
-- Add Advanced Car Publishing Fields
-- Epic: #87 - Advanced Car Publishing Features
-- Created: 2025-01-27
-- Purpose: Add missing fields for complete vehicle data capture
-- ============================================================================

BEGIN;

-- Add vehicle documentation fields
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS plate TEXT,
  ADD COLUMN IF NOT EXISTS vin TEXT;

-- Add complete address fields
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS location_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS location_postal_code TEXT;

-- Add payment and delivery options (stored as JSONB arrays)
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_options JSONB DEFAULT '[]'::jsonb;

-- Add terms and conditions
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Create indexes for searchable fields
CREATE INDEX IF NOT EXISTS idx_cars_plate ON public.cars(plate) WHERE plate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_vin ON public.cars(vin) WHERE vin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_location_neighborhood ON public.cars(location_neighborhood) WHERE location_neighborhood IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_location_postal_code ON public.cars(location_postal_code) WHERE location_postal_code IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.cars.plate IS 'Patente del vehículo (ej: ABC123)';
COMMENT ON COLUMN public.cars.vin IS 'Número de chasis/VIN del vehículo';
COMMENT ON COLUMN public.cars.location_neighborhood IS 'Barrio o zona de la ubicación';
COMMENT ON COLUMN public.cars.location_postal_code IS 'Código postal de la ubicación';
COMMENT ON COLUMN public.cars.payment_methods IS 'Array JSON de métodos de pago aceptados: ["cash", "transfer", "card"]';
COMMENT ON COLUMN public.cars.delivery_options IS 'Array JSON de opciones de entrega: ["pickup", "delivery"]';
COMMENT ON COLUMN public.cars.terms_and_conditions IS 'Términos y condiciones específicos del vehículo';

-- Set default values for existing records
UPDATE public.cars
SET
  payment_methods = COALESCE(payment_methods, '[]'::jsonb),
  delivery_options = COALESCE(delivery_options, '["pickup"]'::jsonb)
WHERE
  payment_methods IS NULL OR
  delivery_options IS NULL;

COMMIT;
