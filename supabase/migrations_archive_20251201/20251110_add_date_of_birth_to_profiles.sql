-- ============================================================================
-- MIGRATION: Add date_of_birth to profiles
-- Date: 2025-11-10
-- Purpose: Implement real age calculation for insurance pricing
-- Impact: Enables accurate driver age-based risk assessment
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add date_of_birth column to profiles
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- ============================================================================
-- 2. Add constraint: must be at least 18 years old
-- ============================================================================

ALTER TABLE public.profiles
ADD CONSTRAINT check_age_18_or_older
CHECK (
  date_of_birth IS NULL OR
  date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')
);

-- ============================================================================
-- 3. Add index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth
ON public.profiles(date_of_birth);

-- ============================================================================
-- 4. Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN public.profiles.date_of_birth IS
  'Date of birth (YYYY-MM-DD). Required for accurate insurance pricing. Must be 18+ years old.';

-- ============================================================================
-- 5. Create helper function to calculate age
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_age(birth_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF birth_date IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN DATE_PART('year', AGE(CURRENT_DATE, birth_date))::INTEGER;
END;
$$;

COMMENT ON FUNCTION public.calculate_age(DATE) IS
  'Calculate age in years from birth date. Returns NULL if birth_date is NULL.';

-- ============================================================================
-- 6. Create helper function to validate 18+ age
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_at_least_18(birth_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF birth_date IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN birth_date <= (CURRENT_DATE - INTERVAL '18 years');
END;
$$;

COMMENT ON FUNCTION public.is_at_least_18(DATE) IS
  'Check if a person is at least 18 years old based on birth date.';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Verify column was added
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'date_of_birth';

-- Test age calculation
-- SELECT
--   '1990-01-01'::DATE as birth_date,
--   calculate_age('1990-01-01'::DATE) as age,
--   is_at_least_18('1990-01-01'::DATE) as is_adult;

-- Test constraint (should fail for age < 18)
-- UPDATE profiles SET date_of_birth = '2020-01-01' WHERE id = 'some-uuid';
