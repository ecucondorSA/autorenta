-- Migration: Add GPS location fields to profiles table
-- Date: 2025-11-11
-- Purpose: Enable location-based features (dynamic pricing by distance, nearby car search)
--          These fields exist in TypeScript types but not in database schema

-- Add home location coordinates (latitude/longitude)
ALTER TABLE profiles
ADD COLUMN home_latitude DOUBLE PRECISION,
ADD COLUMN home_longitude DOUBLE PRECISION;

-- Add location verification timestamp
ALTER TABLE profiles
ADD COLUMN location_verified_at TIMESTAMPTZ;

-- Add preferred search radius (in kilometers)
ALTER TABLE profiles
ADD COLUMN preferred_search_radius_km INTEGER DEFAULT 25;

-- Add constraints for valid GPS coordinates
ALTER TABLE profiles
ADD CONSTRAINT check_valid_latitude
CHECK (
  home_latitude IS NULL OR
  (home_latitude >= -90 AND home_latitude <= 90)
);

ALTER TABLE profiles
ADD CONSTRAINT check_valid_longitude
CHECK (
  home_longitude IS NULL OR
  (home_longitude >= -180 AND home_longitude <= 180)
);

-- Add constraint for valid search radius (5-100 km)
ALTER TABLE profiles
ADD CONSTRAINT check_valid_search_radius
CHECK (
  preferred_search_radius_km IS NULL OR
  (preferred_search_radius_km >= 5 AND preferred_search_radius_km <= 100)
);

-- Add check: if coordinates exist, both must be present (can't have only lat or only lng)
ALTER TABLE profiles
ADD CONSTRAINT check_complete_coordinates
CHECK (
  (home_latitude IS NULL AND home_longitude IS NULL) OR
  (home_latitude IS NOT NULL AND home_longitude IS NOT NULL)
);

-- Add comments for documentation
COMMENT ON COLUMN profiles.home_latitude IS
  'User home location latitude (decimal degrees). Range: -90 to 90. Used for distance-based pricing.';

COMMENT ON COLUMN profiles.home_longitude IS
  'User home location longitude (decimal degrees). Range: -180 to 180. Used for distance-based pricing.';

COMMENT ON COLUMN profiles.location_verified_at IS
  'Timestamp when location was last verified by the user. NULL if never verified.';

COMMENT ON COLUMN profiles.preferred_search_radius_km IS
  'Preferred search radius in kilometers for finding nearby cars. Default: 25 km. Range: 5-100 km.';

-- Create spatial index for location-based queries
-- This enables fast nearby searches using PostGIS functions (if available)
-- Note: Basic index on lat/lng is sufficient for simple distance calculations
CREATE INDEX idx_profiles_home_location ON profiles(home_latitude, home_longitude)
WHERE home_latitude IS NOT NULL AND home_longitude IS NOT NULL;

-- Create index on location_verified_at for filtering verified locations
CREATE INDEX idx_profiles_location_verified ON profiles(location_verified_at)
WHERE location_verified_at IS NOT NULL;

-- Grant permissions (RLS policies will automatically apply)

-- Audit: Log this migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added GPS location fields to profiles table';
  RAISE NOTICE 'Columns added: home_latitude, home_longitude, location_verified_at, preferred_search_radius_km';
  RAISE NOTICE 'Constraints: Valid GPS coordinates (-90/90, -180/180), search radius (5-100 km)';
  RAISE NOTICE 'Indexes: idx_profiles_home_location, idx_profiles_location_verified';
END $$;
