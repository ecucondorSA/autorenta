-- ============================================================================
-- Migration: Security Helper Functions & RLS Refactor
-- Date: 2026-02-08
-- Description: Adds helper functions to simplify RLS policies and improves security.
-- ============================================================================

-- 1. Helper Function: app_is_admin() (Renamed from is_admin to avoid conflicts)
-- Returns true if the current user is an admin.
CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (must be superuser/admin) to access profiles securely
SET search_path = public
STABLE -- Result is stable for the same input (no side effects)
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
END;
$$;

-- 2. Helper Function: is_verified_owner()
-- Returns true if the current user has KYC approved.
CREATE OR REPLACE FUNCTION public.is_verified_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND kyc = 'approved'
  );
END;
$$;

-- Restrict default access, then grant execute permissions to authenticated users.
REVOKE ALL ON FUNCTION public.app_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_verified_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_owner() TO authenticated;

-- ============================================================================
-- REFACTOR RLS POLICIES (Example: Reward Pool System)
-- Replacing verbose EXISTS(...) with simple function calls.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.daily_car_points') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access daily_car_points" ON public.daily_car_points';
    EXECUTE 'CREATE POLICY "Admins full access daily_car_points" ON public.daily_car_points FOR ALL USING (public.app_is_admin())';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.owner_monthly_summary') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access owner_monthly_summary" ON public.owner_monthly_summary';
    EXECUTE 'CREATE POLICY "Admins full access owner_monthly_summary" ON public.owner_monthly_summary FOR ALL USING (public.app_is_admin())';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.reward_pool_payouts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access reward_pool_payouts" ON public.reward_pool_payouts';
    EXECUTE 'CREATE POLICY "Admins full access reward_pool_payouts" ON public.reward_pool_payouts FOR ALL USING (public.app_is_admin())';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.owner_gaming_signals') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access owner_gaming_signals" ON public.owner_gaming_signals';
    EXECUTE 'CREATE POLICY "Admins full access owner_gaming_signals" ON public.owner_gaming_signals FOR ALL USING (public.app_is_admin())';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.owner_cooldowns') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access owner_cooldowns" ON public.owner_cooldowns';
    EXECUTE 'CREATE POLICY "Admins full access owner_cooldowns" ON public.owner_cooldowns FOR ALL USING (public.app_is_admin())';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.reward_pool_config') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins full access reward_pool_config" ON public.reward_pool_config';
    EXECUTE 'CREATE POLICY "Admins full access reward_pool_config" ON public.reward_pool_config FOR ALL USING (public.app_is_admin())';
  END IF;
END;
$$;
