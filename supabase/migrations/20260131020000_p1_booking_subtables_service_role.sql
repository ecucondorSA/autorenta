-- ============================================================================
-- P1 ALTO: Restringir booking sub-tables a service_role
-- Date: 2026-01-31
-- Issue: Policies de escritura usaban {public} en lugar de {service_role}
-- ============================================================================
-- NOTE: This migration documents changes already applied via MCP.
-- ============================================================================

BEGIN;

-- 1. bookings_confirmation - INSERT solo service_role
DROP POLICY IF EXISTS "System can insert confirmation" ON public.bookings_confirmation;
CREATE POLICY "Service can insert confirmation"
ON public.bookings_confirmation FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. bookings_confirmation - UPDATE solo service_role
DROP POLICY IF EXISTS "Users can update confirmation for their bookings" ON public.bookings_confirmation;
CREATE POLICY "Service can update confirmation"
ON public.bookings_confirmation FOR UPDATE
TO service_role
USING (true);

-- 3. bookings_insurance - INSERT solo service_role
DROP POLICY IF EXISTS "System can insert insurance" ON public.bookings_insurance;
CREATE POLICY "Service can insert insurance"
ON public.bookings_insurance FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. bookings_pricing - INSERT solo service_role
DROP POLICY IF EXISTS "System can insert pricing" ON public.bookings_pricing;
CREATE POLICY "Service can insert pricing"
ON public.bookings_pricing FOR INSERT
TO service_role
WITH CHECK (true);

-- 5. bookings_pricing - UPDATE solo service_role
DROP POLICY IF EXISTS "System can update pricing" ON public.bookings_pricing;
CREATE POLICY "Service can update pricing"
ON public.bookings_pricing FOR UPDATE
TO service_role
USING (true);

-- 6. driver_protection_addons - UPDATE solo service_role
DROP POLICY IF EXISTS "Service can update protection addons" ON public.driver_protection_addons;
CREATE POLICY "Service can update protection addons"
ON public.driver_protection_addons FOR UPDATE
TO service_role
USING (true);

COMMIT;

-- ============================================================================
-- VERIFICATION:
-- SELECT tablename, policyname, roles::text, cmd
-- FROM pg_policies
-- WHERE tablename IN ('bookings_pricing', 'bookings_insurance',
--                     'bookings_confirmation', 'driver_protection_addons')
-- AND cmd IN ('INSERT', 'UPDATE', 'ALL');
-- Expected: All system policies should show {service_role}
-- ============================================================================
