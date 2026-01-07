-- =====================================================
-- Add cancelled_by_role to bookings for explicit attribution
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_cancelled_by_role') THEN
    CREATE TYPE booking_cancelled_by_role AS ENUM ('renter', 'owner', 'system', 'admin');
  END IF;
END$$;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS cancelled_by_role booking_cancelled_by_role;

-- Best-effort backfill based on existing cancellation_reason
UPDATE bookings
SET cancelled_by_role = (
  CASE
  WHEN cancellation_reason ILIKE 'owner_rejected:%'
    OR cancellation_reason ILIKE '%propietario%'
    OR cancellation_reason ILIKE '%owner%'
    THEN 'owner'
  WHEN cancellation_reason ILIKE 'approval_window_expired%'
    OR cancellation_reason ILIKE 'system_%'
    OR cancellation_reason ILIKE 'no_show%'
    THEN 'system'
  WHEN cancellation_reason ILIKE '%user%'
    OR cancellation_reason ILIKE '%renter%'
    OR cancellation_reason ILIKE '%locatario%'
    OR cancellation_reason ILIKE '%cancelled by user%'
    OR cancellation_reason ILIKE '%cancelled by renter%'
    THEN 'renter'
  ELSE NULL
  END
)::booking_cancelled_by_role
WHERE cancelled_by_role IS NULL
  AND status IN ('cancelled', 'cancelled_owner', 'expired');
