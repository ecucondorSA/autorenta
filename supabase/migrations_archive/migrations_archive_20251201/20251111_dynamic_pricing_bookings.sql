-- ============================================================================
-- MIGRATION: Add Dynamic Pricing Support to Bookings
-- Date: 2025-11-11
-- Purpose: Enable dynamic pricing integration with booking system
-- Impact: Allows bookings to use calculated prices instead of fixed prices
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add dynamic pricing fields to bookings table
-- ============================================================================

-- Indicates if this booking uses dynamic pricing
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS has_dynamic_pricing BOOLEAN DEFAULT false;

-- Stores the complete pricing calculation snapshot
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS dynamic_price_snapshot JSONB;

-- Timestamp until which the price is locked
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS price_locked_until TIMESTAMPTZ;

-- Lock token to prevent race conditions
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS price_lock_token UUID;

-- ============================================================================
-- 2. Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_has_dynamic_pricing
ON public.bookings(has_dynamic_pricing)
WHERE has_dynamic_pricing = true;

CREATE INDEX IF NOT EXISTS idx_bookings_price_locked
ON public.bookings(price_locked_until)
WHERE price_locked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_lock_token
ON public.bookings(price_lock_token)
WHERE price_lock_token IS NOT NULL;

-- ============================================================================
-- 3. Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.bookings.has_dynamic_pricing IS
  'True if booking uses dynamic pricing instead of fixed car.price_per_day';

COMMENT ON COLUMN public.bookings.dynamic_price_snapshot IS
  'Snapshot of dynamic price calculation including all factors and breakdown';

COMMENT ON COLUMN public.bookings.price_locked_until IS
  'Timestamp until which the calculated price is guaranteed (typically 15 minutes)';

COMMENT ON COLUMN public.bookings.price_lock_token IS
  'Unique token to validate price lock authenticity and prevent tampering';

-- ============================================================================
-- 4. Add validation constraint
-- ============================================================================

-- If has_dynamic_pricing is true, dynamic_price_snapshot must exist
ALTER TABLE public.bookings
ADD CONSTRAINT check_dynamic_pricing_snapshot
CHECK (
  has_dynamic_pricing = false OR
  (has_dynamic_pricing = true AND dynamic_price_snapshot IS NOT NULL)
);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Verify columns were added
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'bookings'
--   AND column_name IN ('has_dynamic_pricing', 'dynamic_price_snapshot', 'price_locked_until', 'price_lock_token');

-- Test constraint
-- INSERT INTO bookings (id, car_id, renter_id, start_at, end_at, status, has_dynamic_pricing)
-- VALUES (gen_random_uuid(), 'some-car-id', 'some-user-id', NOW(), NOW() + INTERVAL '1 day', 'pending', true);
-- Expected: ERROR - violates check constraint "check_dynamic_pricing_snapshot"
