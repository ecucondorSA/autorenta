-- Fix RLS on critical tables: payments, vehicle_telemetry, wallet_transaction_backups
-- Audit finding: these tables have NO RLS — any authenticated user can read/write all rows via PostgREST
--
-- Strategy:
--   payments              → users see payments for their own bookings (renter or car owner)
--   vehicle_telemetry     → car owner or active booking renter can see telemetry
--   wallet_transaction_backups → admin/service-role only (enable RLS, no policies = blocked via PostgREST)

BEGIN;

-- ============================================================
-- 1. PAYMENTS — Enable RLS + user-scoped policies
-- ============================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view payments for bookings where they are the renter
CREATE POLICY "Users can view own booking payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payments.booking_id
        AND b.renter_id = (select auth.uid())
    )
  );

-- Car owners can view payments for bookings on their cars
CREATE POLICY "Owners can view payments for their car bookings"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.cars c ON c.id = b.car_id
      WHERE b.id = payments.booking_id
        AND c.owner_id = (select auth.uid())
    )
  );

-- Only service_role can INSERT/UPDATE/DELETE (edge functions handle payment writes)
-- No INSERT/UPDATE/DELETE policies = blocked for regular users via PostgREST

-- ============================================================
-- 2. VEHICLE_TELEMETRY — Enable RLS + scoped policies
-- ============================================================

ALTER TABLE public.vehicle_telemetry ENABLE ROW LEVEL SECURITY;

-- Car owners can see telemetry for their vehicles
CREATE POLICY "Owners can view telemetry for their cars"
  ON public.vehicle_telemetry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cars c
      WHERE c.id = vehicle_telemetry.car_id
        AND c.owner_id = (select auth.uid())
    )
  );

-- Active booking renters can see telemetry during their rental period
CREATE POLICY "Renters can view telemetry during active booking"
  ON public.vehicle_telemetry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.car_id = vehicle_telemetry.car_id
        AND b.renter_id = (select auth.uid())
        AND b.status IN ('in_progress', 'confirmed')
    )
  );

-- ============================================================
-- 3. WALLET_TRANSACTION_BACKUPS — Enable RLS, no policies (admin-only)
-- ============================================================

-- Enabling RLS with zero policies means PostgREST returns empty for all users.
-- Only service_role (edge functions, admin) can access this table.
ALTER TABLE public.wallet_transaction_backups ENABLE ROW LEVEL SECURITY;

COMMIT;
