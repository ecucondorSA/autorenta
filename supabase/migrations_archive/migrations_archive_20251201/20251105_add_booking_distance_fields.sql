-- Migration: Add distance-related fields to bookings and risk snapshots
-- Date: 2025-11-05
-- Purpose: Track pickup/dropoff locations and distance-based pricing/guarantees

-- ============================================================================
-- PART 1: Extend bookings table with distance fields
-- ============================================================================

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS pickup_location_lat NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS pickup_location_lng NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS dropoff_location_lat NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS dropoff_location_lng NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS delivery_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(8, 2),
ADD COLUMN IF NOT EXISTS delivery_fee_cents BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS distance_risk_tier TEXT;

-- Add comments
COMMENT ON COLUMN bookings.pickup_location_lat IS 'Pickup location latitude (may differ from car location if delivery)';
COMMENT ON COLUMN bookings.pickup_location_lng IS 'Pickup location longitude';
COMMENT ON COLUMN bookings.dropoff_location_lat IS 'Drop-off location latitude (may differ from pickup if one-way)';
COMMENT ON COLUMN bookings.dropoff_location_lng IS 'Drop-off location longitude';
COMMENT ON COLUMN bookings.delivery_required IS 'Whether the car needs to be delivered to renter';
COMMENT ON COLUMN bookings.delivery_distance_km IS 'Distance from car location to pickup location (km)';
COMMENT ON COLUMN bookings.delivery_fee_cents IS 'Delivery fee in cents (ARS)';
COMMENT ON COLUMN bookings.distance_risk_tier IS 'Risk tier based on distance: local, regional, long_distance';

-- Add constraint for valid distance tier
ALTER TABLE bookings
ADD CONSTRAINT check_distance_risk_tier
CHECK (distance_risk_tier IS NULL OR distance_risk_tier IN ('local', 'regional', 'long_distance'));

-- Add constraint for valid delivery distance
ALTER TABLE bookings
ADD CONSTRAINT check_delivery_distance
CHECK (delivery_distance_km IS NULL OR delivery_distance_km >= 0);

-- Add constraint for valid delivery fee
ALTER TABLE bookings
ADD CONSTRAINT check_delivery_fee
CHECK (delivery_fee_cents >= 0);

-- Create index for pickup location queries
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_location
ON bookings(pickup_location_lat, pickup_location_lng)
WHERE pickup_location_lat IS NOT NULL AND pickup_location_lng IS NOT NULL;

-- Create index for distance tier analytics
CREATE INDEX IF NOT EXISTS idx_bookings_distance_risk_tier
ON bookings(distance_risk_tier)
WHERE distance_risk_tier IS NOT NULL;

-- ============================================================================
-- PART 2: Extend booking_risk_snapshot table with distance fields
-- ============================================================================

ALTER TABLE booking_risk_snapshot
ADD COLUMN IF NOT EXISTS renter_location_lat NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS renter_location_lng NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS car_location_lat NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS car_location_lng NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8, 2),
ADD COLUMN IF NOT EXISTS distance_risk_multiplier NUMERIC(4, 2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS distance_risk_tier TEXT;

-- Add comments
COMMENT ON COLUMN booking_risk_snapshot.renter_location_lat IS 'Snapshot of renter location at booking time';
COMMENT ON COLUMN booking_risk_snapshot.renter_location_lng IS 'Snapshot of renter location longitude';
COMMENT ON COLUMN booking_risk_snapshot.car_location_lat IS 'Snapshot of car location at booking time';
COMMENT ON COLUMN booking_risk_snapshot.car_location_lng IS 'Snapshot of car location longitude';
COMMENT ON COLUMN booking_risk_snapshot.distance_km IS 'Calculated distance between renter and car (km)';
COMMENT ON COLUMN booking_risk_snapshot.distance_risk_multiplier IS 'Guarantee multiplier based on distance (1.0 - 1.5)';
COMMENT ON COLUMN booking_risk_snapshot.distance_risk_tier IS 'Risk tier: local, regional, long_distance';

-- Add constraint for valid distance tier
ALTER TABLE booking_risk_snapshot
ADD CONSTRAINT check_risk_distance_tier
CHECK (distance_risk_tier IS NULL OR distance_risk_tier IN ('local', 'regional', 'long_distance'));

-- Add constraint for valid distance
ALTER TABLE booking_risk_snapshot
ADD CONSTRAINT check_risk_distance
CHECK (distance_km IS NULL OR distance_km >= 0);

-- Add constraint for valid multiplier (1.0 to 2.0)
ALTER TABLE booking_risk_snapshot
ADD CONSTRAINT check_distance_risk_multiplier
CHECK (distance_risk_multiplier >= 1.0 AND distance_risk_multiplier <= 2.0);

-- ============================================================================
-- PART 3: Update existing RPC functions to support distance fields
-- ============================================================================

-- Note: The existing pricing_recalculate() and quote_booking() functions
-- will need to be updated separately to incorporate distance-based pricing.
-- This migration only adds the database schema support.

-- Grant appropriate permissions
-- RLS policies for bookings and booking_risk_snapshot already exist
-- No additional grants needed as existing policies cover all columns
