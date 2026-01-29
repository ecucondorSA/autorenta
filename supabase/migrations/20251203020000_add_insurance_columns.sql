-- Migration: Add insurance columns to cars table
-- Date: 2025-12-03
-- Description: Adds columns for insurance policy tracking

-- Add insurance columns to cars table
ALTER TABLE cars
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS insurance_company TEXT;

-- Add index for quick expiration lookups
CREATE INDEX IF NOT EXISTS idx_cars_insurance_expires_at ON cars(insurance_expires_at)
WHERE insurance_expires_at IS NOT NULL;

COMMENT ON COLUMN cars.insurance_policy_number IS 'Insurance policy number for the vehicle';
COMMENT ON COLUMN cars.insurance_expires_at IS 'Expiration date of the insurance policy';
COMMENT ON COLUMN cars.insurance_company IS 'Name of the insurance company';
