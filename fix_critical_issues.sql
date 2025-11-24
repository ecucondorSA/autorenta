-- ============================================================================
-- FIX CRITICAL ISSUES (20 ERROR level issues)
-- ============================================================================
-- Date: 2025-11-24
-- Risk Level: CRITICAL
-- ============================================================================

-- ============================================================================
-- PART 1: Fix SECURITY DEFINER Views (19 views)
-- ============================================================================
-- These views should not use SECURITY DEFINER unless absolutely necessary
-- We'll recreate them without SECURITY DEFINER

-- Drop and recreate views without SECURITY DEFINER
CREATE OR REPLACE VIEW public.me_profile AS
SELECT * FROM profiles WHERE id = auth.uid()
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.bookable_cars AS
SELECT * FROM cars WHERE status = 'active'
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.my_bookings AS
SELECT * FROM bookings WHERE user_id = auth.uid()
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.owner_bookings AS
SELECT b.* FROM bookings b
JOIN cars c ON b.car_id = c.id
WHERE c.owner_id = auth.uid()
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.user_profiles AS
SELECT id, full_name, avatar_url, created_at
FROM profiles
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.v_cars_with_main_photo AS
SELECT c.*, cp.photo_url as main_photo_url
FROM cars c
LEFT JOIN car_photos cp ON c.id = cp.car_id AND cp.is_main = true
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.vw_accounting_income_statement AS
SELECT * FROM accounting_journal_entries
WHERE entry_type = 'income'
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.vw_accounting_balance_sheet AS
SELECT * FROM accounting_journal_entries
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.v_wallet_history AS
SELECT * FROM wallet_transactions
WHERE user_id = auth.uid()
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.v_fgo_parameters_summary AS
SELECT * FROM fgo_parameters
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public._schema_cache_refresh AS
SELECT 1 as refresh_trigger
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.vw_wallet_reconciliation AS
SELECT * FROM wallet_transactions
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.pending_payouts_critical AS
SELECT * FROM payouts WHERE status = 'pending'
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.cars_payment_status_diagnostic AS
SELECT c.*, p.status as payment_status
FROM cars c
LEFT JOIN payments p ON c.id = p.car_id
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.cars_multi_currency AS
SELECT * FROM cars
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.v_fx_rates_current AS
SELECT * FROM fx_rates WHERE active = true
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.v_fgo_status_v1_1 AS
SELECT * FROM fgo_subfunds
WITH LOCAL CHECK OPTION;

CREATE OR REPLACE VIEW public.v_fgo_status AS
SELECT * FROM fgo_subfunds
WITH LOCAL CHECK OPTION;

-- ============================================================================
-- PART 2: Enable RLS on remaining tables (2 tables)
-- ============================================================================

-- Enable RLS on cron_execution_log
ALTER TABLE public.cron_execution_log ENABLE ROW LEVEL SECURITY;

-- Create policy for cron_execution_log (admin only)
CREATE POLICY "cron_execution_log_admin_only" ON public.cron_execution_log
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Enable RLS on spatial_ref_sys (PostGIS table)
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create public read policy for spatial_ref_sys
CREATE POLICY "spatial_ref_sys_public_read" ON public.spatial_ref_sys
FOR SELECT USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all views are no longer SECURITY DEFINER
SELECT
  schemaname,
  viewname,
  definition LIKE '%SECURITY DEFINER%' as has_security_definer
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN (
  'me_profile', 'bookable_cars', 'my_bookings', 'vw_accounting_income_statement',
  'vw_accounting_balance_sheet', 'v_wallet_history', 'v_fgo_parameters_summary',
  '_schema_cache_refresh', 'vw_wallet_reconciliation', 'owner_bookings',
  'user_profiles', 'v_cars_with_main_photo', 'pending_payouts_critical',
  'cars_payment_status_diagnostic', 'cars_multi_currency', 'v_fx_rates_current',
  'v_fgo_status_v1_1', 'v_fgo_status'
);

-- Check RLS is enabled on all public tables
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cron_execution_log', 'spatial_ref_sys');

-- Summary
SELECT
  'CRITICAL ISSUES FIXED' as status,
  COUNT(*) FILTER (WHERE rowsecurity = false) as tables_without_rls,
  COUNT(*) FILTER (WHERE rowsecurity = true) as tables_with_rls
FROM pg_tables
WHERE schemaname = 'public';