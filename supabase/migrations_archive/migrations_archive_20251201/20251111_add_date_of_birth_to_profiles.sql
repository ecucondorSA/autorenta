-- Migration: Add date_of_birth column to profiles table
-- Date: 2025-11-11
-- Purpose: Fix critical gap - date_of_birth field exists in UI but not in database
--          This field is required for insurance risk calculation and age verification

-- Add date_of_birth column
ALTER TABLE profiles
ADD COLUMN date_of_birth DATE;

-- Add constraint to ensure minimum age of 18 years
ALTER TABLE profiles
ADD CONSTRAINT check_minimum_age_18
CHECK (
  date_of_birth IS NULL OR
  date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')
);

-- Add comment for documentation
COMMENT ON COLUMN profiles.date_of_birth IS
  'User date of birth (YYYY-MM-DD format). Required for insurance calculations. Must be at least 18 years old.';

-- Create index for age-based queries (optional but recommended)
CREATE INDEX idx_profiles_date_of_birth ON profiles(date_of_birth)
WHERE date_of_birth IS NOT NULL;

-- Grant permissions (should already be covered by existing RLS, but explicit is good)
-- RLS policies on profiles table will automatically apply to this column

-- Audit: Log this migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added date_of_birth column to profiles table';
  RAISE NOTICE 'Constraint: Minimum age 18 years enforced via check_minimum_age_18';
  RAISE NOTICE 'Index: idx_profiles_date_of_birth created for performance';
END $$;
