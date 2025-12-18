-- Migration: Add rental restrictions and conditions fields to cars table
-- These fields support the "Condiciones del alquiler" section in car-detail page

-- Geographic restrictions
ALTER TABLE cars ADD COLUMN IF NOT EXISTS allowed_provinces text[] DEFAULT '{}';
ALTER TABLE cars ADD COLUMN IF NOT EXISTS max_distance_km integer;

-- Behavior restrictions
ALTER TABLE cars ADD COLUMN IF NOT EXISTS allow_smoking boolean DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS allow_pets boolean DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS allow_rideshare boolean DEFAULT false;

-- Insurance deductible (franquicia)
ALTER TABLE cars ADD COLUMN IF NOT EXISTS insurance_deductible_usd numeric;

-- Comments for documentation
COMMENT ON COLUMN cars.allowed_provinces IS 'Provincias donde puede circular el auto (vacío = sin restricción)';
COMMENT ON COLUMN cars.max_distance_km IS 'Distancia máxima en km desde punto de recogida (null = sin límite)';
COMMENT ON COLUMN cars.allow_smoking IS 'Permite fumar en el vehículo';
COMMENT ON COLUMN cars.allow_pets IS 'Permite mascotas en el vehículo';
COMMENT ON COLUMN cars.allow_rideshare IS 'Permite uso en apps de rideshare (Uber/Cabify)';
COMMENT ON COLUMN cars.insurance_deductible_usd IS 'Franquicia del seguro en USD (monto máximo a cargo del locatario)';

-- Set sensible defaults for existing records
UPDATE cars SET
  allow_smoking = false,
  allow_pets = false,
  allow_rideshare = false
WHERE allow_smoking IS NULL;
