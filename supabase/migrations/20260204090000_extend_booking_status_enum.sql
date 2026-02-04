-- ============================================================================
-- MIGRATION: Extend booking_status enum and refresh availability index
-- Date: 2026-02-04
-- ============================================================================

-- Add missing statuses used by booking flow
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'pending_approval';

-- Rebuild partial index to include new pending statuses
DROP INDEX IF EXISTS idx_bookings_active;
CREATE INDEX IF NOT EXISTS idx_bookings_active
  ON public.bookings (status, start_at, end_at, car_id)
  WHERE status IN (
    'pending',
    'pending_payment',
    'pending_approval',
    'confirmed',
    'in_progress',
    'pending_return'
  );
