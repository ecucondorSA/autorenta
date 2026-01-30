-- ============================================================================
-- P0 CRÍTICO: Restringir WRITE policies a service_role
-- Date: 2026-01-31
-- Issue: Policies de escritura usaban {public} en lugar de {service_role}
-- ============================================================================
-- NOTE: This migration documents changes already applied via MCP.
-- ============================================================================

BEGIN;

-- 1. booking_claims - UPDATE solo service_role
DROP POLICY IF EXISTS "Admins can update claims" ON public.booking_claims;
CREATE POLICY "Service can update claims"
ON public.booking_claims FOR UPDATE
TO service_role
USING (true);

-- 2. bookings_payment - ALL solo service_role
DROP POLICY IF EXISTS "System can manage payments" ON public.bookings_payment;
CREATE POLICY "Service can manage payments"
ON public.bookings_payment FOR ALL
TO service_role
USING (true);

-- 3. driver_risk_profile - UPDATE solo service_role
DROP POLICY IF EXISTS "Service can update risk profiles" ON public.driver_risk_profile;
CREATE POLICY "Service can update risk profiles"
ON public.driver_risk_profile FOR UPDATE
TO service_role
USING (true);

-- 4. driver_class_history - INSERT solo service_role
DROP POLICY IF EXISTS "Service can insert class history" ON public.driver_class_history;
CREATE POLICY "Service can insert class history"
ON public.driver_class_history FOR INSERT
TO service_role
WITH CHECK (true);

-- 5. driver_telemetry - INSERT solo service_role
DROP POLICY IF EXISTS "Service can insert telemetry" ON public.driver_telemetry;
CREATE POLICY "Service can insert telemetry"
ON public.driver_telemetry FOR INSERT
TO service_role
WITH CHECK (true);

COMMIT;

-- ============================================================================
-- VERIFICATION:
-- SELECT tablename, policyname, roles::text, cmd
-- FROM pg_policies
-- WHERE tablename IN ('booking_claims', 'bookings_payment', 'driver_risk_profile',
--                     'driver_class_history', 'driver_telemetry')
-- AND cmd IN ('INSERT', 'UPDATE', 'ALL');
-- Expected: All should show {service_role}
-- ============================================================================
