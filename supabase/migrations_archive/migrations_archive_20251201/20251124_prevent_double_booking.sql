-- ✅ P0-023 FIX: Prevent Double Booking (Race Condition)
--
-- Problem: Two users can book the same car for overlapping dates due to race condition
-- Solution: Add database-level constraint + check in checkout
--
-- Created: 2025-11-24
-- Migration: 20251124_prevent_double_booking.sql

-- ========================================
-- APPROACH 1: Exclusion Constraint (PostgreSQL 12+)
-- ========================================
-- This prevents overlapping bookings at the database level
-- More robust than application-level checks
--
-- Note: Requires btree_gist extension for range operators

-- Enable btree_gist extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to prevent overlapping bookings
-- Only applies to confirmed/in_progress bookings (not pending/cancelled)
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS prevent_double_booking;

ALTER TABLE bookings
ADD CONSTRAINT prevent_double_booking
EXCLUDE USING gist (
  car_id WITH =,
  daterange(start_at::date, end_at::date, '[]') WITH &&
)
WHERE (status IN ('confirmed', 'in_progress'));

-- ========================================
-- APPROACH 2: Database Function Check (Fallback)
-- ========================================
-- Additional safety check in request_booking RPC function
-- This provides clearer error messages

CREATE OR REPLACE FUNCTION check_booking_overlap(
  p_car_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_overlap_count INTEGER;
BEGIN
  -- Count overlapping confirmed/in_progress bookings
  SELECT COUNT(*)
  INTO v_overlap_count
  FROM bookings
  WHERE car_id = p_car_id
    AND status IN ('confirmed', 'in_progress')
    AND daterange(start_at::date, end_at::date, '[]') &&
        daterange(p_start_date::date, p_end_date::date, '[]');

  RETURN v_overlap_count = 0;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_booking_overlap TO authenticated;

-- ========================================
-- APPROACH 3: Update request_booking Function
-- ========================================
-- Modify request_booking to check availability before inserting

-- This is a placeholder comment - the actual function update should be done
-- in the existing request_booking migration or create a new version

-- Example check to add in request_booking:
--
-- IF NOT check_booking_overlap(p_car_id, p_start, p_end) THEN
--   RAISE EXCEPTION 'Car is no longer available for these dates'
--     USING ERRCODE = 'P0001'; -- unique_violation
-- END IF;

-- ========================================
-- TESTING
-- ========================================
-- To test the constraint:
--
-- INSERT INTO bookings (id, car_id, user_id, start_at, end_at, status, ...)
-- VALUES (uuid_generate_v4(), 'CAR_ID', 'USER_1', '2025-12-01', '2025-12-05', 'confirmed', ...);
--
-- -- This should FAIL with exclusion constraint violation:
-- INSERT INTO bookings (id, car_id, user_id, start_at, end_at, status, ...)
-- VALUES (uuid_generate_v4(), 'CAR_ID', 'USER_2', '2025-12-03', '2025-12-07', 'confirmed', ...);

COMMENT ON CONSTRAINT prevent_double_booking ON bookings IS
'✅ P0-023: Prevents double booking by blocking overlapping confirmed/in_progress bookings for the same car';

COMMENT ON FUNCTION check_booking_overlap IS
'✅ P0-023: Helper function to check if a booking would overlap with existing confirmed bookings';
