-- ============================================================================
-- FIX BOOKINGS TABLE - ADD MISSING COLUMNS
-- Created: 2026-01-26
-- Purpose: Fix Sentry Issue #611 - "record 'new' has no field 'owner_id'"
-- ============================================================================
--
-- Root Cause: Multiple RPC functions (especially process_instant_booking)
-- attempt to INSERT into bookings table with columns that don't exist.
--
-- This migration adds all missing columns that are referenced in:
-- - process_instant_booking()
-- - request_booking() (extended version)
-- - Various triggers and functions
-- ============================================================================

BEGIN;

-- Add owner_id for denormalized access (can also be obtained via cars.owner_id)
-- NULL for existing records, will be populated by triggers for new bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

-- Add pricing breakdown columns
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS total_days INTEGER,
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS service_fee NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS owner_fee NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS insurance_fee NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2);

-- Add instant booking flag
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_instant_booking BOOLEAN DEFAULT FALSE;

-- Add location references (for delivery/pickup)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS pickup_location_id UUID,
ADD COLUMN IF NOT EXISTS dropoff_location_id UUID;

-- Add return tracking
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

-- Add inspection and dispute tracking
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS inspection_status TEXT,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- Add additional fields that may be used in extended booking flow
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- Create indexes for new columns that will be queried frequently
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON public.bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_is_instant ON public.bookings(is_instant_booking) WHERE is_instant_booking = true;
CREATE INDEX IF NOT EXISTS idx_bookings_returned_at ON public.bookings(returned_at) WHERE returned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_location ON public.bookings(pickup_location_id) WHERE pickup_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_dropoff_location ON public.bookings(dropoff_location_id) WHERE dropoff_location_id IS NOT NULL;

-- Backfill owner_id for existing bookings
-- This ensures all existing records have the owner_id populated
UPDATE public.bookings b
SET owner_id = c.owner_id
FROM public.cars c
WHERE b.car_id = c.id
  AND b.owner_id IS NULL;

-- Create trigger to auto-populate owner_id on INSERT
CREATE OR REPLACE FUNCTION public.populate_booking_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If owner_id is not provided, get it from the car
  IF NEW.owner_id IS NULL THEN
    SELECT owner_id INTO NEW.owner_id
    FROM public.cars
    WHERE id = NEW.car_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_populate_booking_owner_id ON public.bookings;
CREATE TRIGGER trigger_populate_booking_owner_id
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_booking_owner_id();

-- Add comment to document the fix
COMMENT ON COLUMN public.bookings.owner_id IS
  'Denormalized owner_id from cars table for faster queries. Auto-populated by trigger.';

COMMENT ON TABLE public.bookings IS
  'Bookings table - Extended with pricing breakdown and instant booking support (2026-01-26)';

COMMIT;
