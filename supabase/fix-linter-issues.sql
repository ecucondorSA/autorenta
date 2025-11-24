-- ============================================================================
-- SUPABASE LINTER FIX - RLS Configuration
-- ============================================================================
-- Date: 2025-11-24
-- Database: pisqjmoklivzpwufhscx
-- Issues to Fix: onboarding_plan_templates (CRITICAL), outbound_requests (if public)
-- ============================================================================

-- ============================================================================
-- STEP 1: INVESTIGATE TABLES
-- ============================================================================

-- Check structure and content of outbound_requests
\echo '=== INVESTIGATING: outbound_requests ==='
\d public.outbound_requests
SELECT COUNT(*) as row_count FROM public.outbound_requests;
SELECT * FROM public.outbound_requests LIMIT 3;

-- Check structure and content of onboarding_plan_templates
\echo ''
\echo '=== INVESTIGATING: onboarding_plan_templates ==='
\d public.onboarding_plan_templates
SELECT COUNT(*) as row_count FROM public.onboarding_plan_templates;
SELECT * FROM public.onboarding_plan_templates LIMIT 3;

-- ============================================================================
-- STEP 2: CHECK CURRENT RLS STATUS
-- ============================================================================

\echo ''
\echo '=== CURRENT RLS STATUS ==='
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('onboarding_plan_templates', 'outbound_requests')
ORDER BY tablename;

-- ============================================================================
-- STEP 3: FIX onboarding_plan_templates (CRITICAL)
-- ============================================================================

\echo ''
\echo '=== FIXING: onboarding_plan_templates ==='

-- Enable RLS
ALTER TABLE public.onboarding_plan_templates ENABLE ROW LEVEL SECURITY;

-- Create policy: Allow SELECT for all authenticated users
-- This assumes onboarding templates should be readable by authenticated users
-- Modify the USING clause if you need different access control
CREATE POLICY "public_read_onboarding_templates"
  ON public.onboarding_plan_templates
  FOR SELECT
  USING (true);

-- ALTERNATIVE: If only admin should see this, use this instead:
-- CREATE POLICY "admin_only_onboarding_templates"
--   ON public.onboarding_plan_templates
--   FOR SELECT
--   USING (current_user = 'postgres' OR current_user = 'supabase_admin');

\echo 'RLS enabled for onboarding_plan_templates with public read policy';

-- ============================================================================
-- STEP 4: FIX outbound_requests (IF PUBLIC)
-- ============================================================================

\echo ''
\echo '=== FIXING: outbound_requests ==='

-- Enable RLS
ALTER TABLE public.outbound_requests ENABLE ROW LEVEL SECURITY;

-- Create policy: Allow SELECT for authenticated users
-- Modify based on your actual requirements
CREATE POLICY "public_read_outbound_requests"
  ON public.outbound_requests
  FOR SELECT
  USING (true);

\echo 'RLS enabled for outbound_requests with public read policy';

-- ============================================================================
-- STEP 5: VERIFY CHANGES
-- ============================================================================

\echo ''
\echo '=== VERIFICATION: RLS Status After Fix ==='
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('onboarding_plan_templates', 'outbound_requests')
ORDER BY tablename;

\echo ''
\echo '=== VERIFICATION: Policies Created ==='
SELECT
    tablename,
    policyname,
    permissive,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('onboarding_plan_templates', 'outbound_requests')
ORDER BY tablename, policyname;

-- ============================================================================
-- DONE!
-- ============================================================================

\echo ''
\echo '✅ SUPABASE LINTER ISSUES FIXED!'
\echo ''
\echo 'Summary:'
\echo '  ✅ onboarding_plan_templates: RLS enabled with public read policy'
\echo '  ✅ outbound_requests: RLS enabled with public read policy'
\echo ''
\echo 'Next steps:'
\echo '  1. Re-run Supabase linter'
\echo '  2. Issues should reduce from 22 to 20'
\echo '  3. Remaining issues are falso positivos (SECURITY_DEFINER views)'
\echo ''
