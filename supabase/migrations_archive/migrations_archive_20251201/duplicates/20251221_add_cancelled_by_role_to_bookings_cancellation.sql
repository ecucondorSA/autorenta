-- =====================================================
-- Add cancelled_by_role to bookings_cancellation
-- =====================================================

ALTER TABLE bookings_cancellation
ADD COLUMN IF NOT EXISTS cancelled_by_role booking_cancelled_by_role;

-- Backfill from bookings table when possible
UPDATE bookings_cancellation bc
SET cancelled_by_role = b.cancelled_by_role
FROM bookings b
WHERE b.id = bc.booking_id
  AND bc.cancelled_by_role IS NULL;
