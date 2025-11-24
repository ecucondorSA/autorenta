-- ============================================================================
-- SUPABASE RLS FIX - COPY AND PASTE THIS IN SUPABASE DASHBOARD
-- ============================================================================
-- Database: pisqjmoklivzpwufhscx
-- Date: 2025-11-24
-- Issues to Fix: 2 (onboarding_plan_templates, outbound_requests)
-- ============================================================================

-- Check RLS status BEFORE
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('onboarding_plan_templates', 'outbound_requests');

-- Fix onboarding_plan_templates (CRITICAL)
ALTER TABLE public.onboarding_plan_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public_read_onboarding_templates"
  ON public.onboarding_plan_templates FOR SELECT USING (true);

-- Fix outbound_requests (RECOMENDADO)
ALTER TABLE public.outbound_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public_read_outbound_requests"
  ON public.outbound_requests FOR SELECT USING (true);

-- Check RLS status AFTER
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('onboarding_plan_templates', 'outbound_requests');

-- Verify policies created
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('onboarding_plan_templates', 'outbound_requests');

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- tablename | rls_enabled
-- -----------+-----------
-- onboarding_plan_templates | t
-- outbound_requests | t
--
-- tablename | policyname
-- -----------+----------------------------------
-- onboarding_plan_templates | public_read_onboarding_templates
-- outbound_requests | public_read_outbound_requests
-- ============================================================================
