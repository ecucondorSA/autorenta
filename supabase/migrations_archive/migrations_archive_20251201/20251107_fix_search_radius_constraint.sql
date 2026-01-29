-- Fix search radius constraint to match UI (5-100 km instead of 5-200 km)
-- Migration: 20251107_fix_search_radius_constraint.sql
-- Description: Aligns database constraint with frontend validation for preferred_search_radius_km

-- First, check if any existing profiles would violate the new constraint
DO $$
DECLARE
  violating_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO violating_count
  FROM profiles
  WHERE preferred_search_radius_km > 100;

  IF violating_count > 0 THEN
    RAISE NOTICE 'WARNING: % profiles have search radius > 100 km. These will be capped to 100 km.', violating_count;

    -- Update any profiles with radius > 100 to the maximum allowed value
    UPDATE profiles
    SET preferred_search_radius_km = 100
    WHERE preferred_search_radius_km > 100;

    RAISE NOTICE 'Updated % profiles to max radius of 100 km', violating_count;
  ELSE
    RAISE NOTICE 'No profiles exceed 100 km radius. Safe to proceed.';
  END IF;
END $$;

-- Drop the old constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS check_preferred_search_radius;

-- Add the new constraint with corrected range (5-100 km)
ALTER TABLE profiles
ADD CONSTRAINT check_preferred_search_radius
CHECK (preferred_search_radius_km >= 5 AND preferred_search_radius_km <= 100);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT check_preferred_search_radius ON profiles IS
'Ensures search radius is between 5 and 100 km, matching UI validation';
