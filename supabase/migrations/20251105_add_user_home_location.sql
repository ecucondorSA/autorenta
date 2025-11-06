-- Migration: Add home location fields to profiles table
-- Date: 2025-11-05
-- Purpose: Enable distance-based pricing and guarantees by storing user's home location

-- Add home location columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS home_latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS home_longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS location_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS preferred_search_radius_km INTEGER DEFAULT 50;

-- Add comments for documentation
COMMENT ON COLUMN profiles.home_latitude IS 'User home location latitude (optional, for distance-based pricing)';
COMMENT ON COLUMN profiles.home_longitude IS 'User home location longitude (optional, for distance-based pricing)';
COMMENT ON COLUMN profiles.location_verified_at IS 'Timestamp when user verified their home location';
COMMENT ON COLUMN profiles.preferred_search_radius_km IS 'User preferred search radius for car listings (km)';

-- Create spatial index for efficient distance queries
CREATE INDEX IF NOT EXISTS idx_profiles_home_location
ON profiles(home_latitude, home_longitude)
WHERE home_latitude IS NOT NULL AND home_longitude IS NOT NULL;

-- Add constraint to ensure both lat/lng are set together or both NULL
ALTER TABLE profiles
ADD CONSTRAINT check_home_location_complete
CHECK (
  (home_latitude IS NULL AND home_longitude IS NULL) OR
  (home_latitude IS NOT NULL AND home_longitude IS NOT NULL)
);

-- Add constraint for valid latitude range
ALTER TABLE profiles
ADD CONSTRAINT check_home_latitude_range
CHECK (home_latitude IS NULL OR (home_latitude >= -90 AND home_latitude <= 90));

-- Add constraint for valid longitude range
ALTER TABLE profiles
ADD CONSTRAINT check_home_longitude_range
CHECK (home_longitude IS NULL OR (home_longitude >= -180 AND home_longitude <= 180));

-- Add constraint for valid search radius
ALTER TABLE profiles
ADD CONSTRAINT check_preferred_search_radius
CHECK (preferred_search_radius_km IS NULL OR (preferred_search_radius_km >= 5 AND preferred_search_radius_km <= 200));

-- Grant appropriate permissions (RLS policies already exist for profiles)
-- Users can read/update their own profile including home location
-- No additional RLS policies needed as existing policies cover all columns
