-- ============================================================================
-- MIGRATION: Booking performance indexes + JSONB GIN + RLS enablement
-- Date: 2026-02-03
-- Purpose:
--   1. Add missing booking indexes for dashboards/availability
--   2. Add GIN indexes for JSONB search on bookings
--   3. Enable RLS on vehicle_categories and wallet_audit_log
-- Notes:
--   - All statements are idempotent.
--   - For large production tables, consider CREATE INDEX CONCURRENTLY
--     (cannot run inside a transaction block).
-- ============================================================================

-- --------------------------------------------------------------------------
-- BOOKINGS: Core lookup / dashboard indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_car_id
  ON public.bookings (car_id);

CREATE INDEX IF NOT EXISTS idx_bookings_renter_id
  ON public.bookings (renter_id);

CREATE INDEX IF NOT EXISTS idx_bookings_owner_id
  ON public.bookings (owner_id);

CREATE INDEX IF NOT EXISTS idx_bookings_status_created
  ON public.bookings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_renter_status
  ON public.bookings (renter_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_owner_status
  ON public.bookings (owner_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_car_dates
  ON public.bookings (car_id, start_at, end_at);

-- Partial index to speed availability lookups for blocking statuses
CREATE INDEX IF NOT EXISTS idx_bookings_active
  ON public.bookings (status, start_at, end_at, car_id)
  WHERE status IN (
    'pending',
    'confirmed',
    'in_progress',
    'pending_return'
  );

-- --------------------------------------------------------------------------
-- BOOKINGS: JSONB GIN indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_inspection_gin
  ON public.bookings USING GIN (inspection_evidence);

CREATE INDEX IF NOT EXISTS idx_bookings_coverage_gin
  ON public.bookings USING GIN (coverage_snapshot);

CREATE INDEX IF NOT EXISTS idx_bookings_dispute_gin
  ON public.bookings USING GIN (dispute_evidence);

-- --------------------------------------------------------------------------
-- RLS: Enable row level security
-- --------------------------------------------------------------------------
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;
