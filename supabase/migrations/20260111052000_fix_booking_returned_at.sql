-- ============================================================================
-- FIX: Set returned_at for booking b25f2723
-- Date: 2026-01-11
-- Problem: The booking is in_progress but returned_at is NULL,
--          so owner cannot submit inspection (RPC requires returned_at IS NOT NULL)
-- ============================================================================

-- Set returned_at to allow owner inspection
UPDATE bookings
SET
    returned_at = NOW(),
    updated_at = NOW()
WHERE id::text LIKE 'b25f2723%'
  AND returned_at IS NULL;

-- ============================================================================
DO $$ BEGIN RAISE NOTICE '✅ Booking b25f2723 returned_at set'; END $$;
