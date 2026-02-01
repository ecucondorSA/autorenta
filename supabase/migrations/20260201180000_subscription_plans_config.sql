-- ============================================================================
-- MIGRATION: AutoRenta Club Configuration (Subscription Plans)
-- Date: 2026-02-01
-- Purpose: Move subscription plans to DB configuration and add automation.
-- ============================================================================

BEGIN;

-- 1. CREATE SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- 'standard', 'black', 'luxury'
  name TEXT NOT NULL,
  description TEXT,
  price_cents BIGINT NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_interval TEXT DEFAULT 'month', -- 'month', 'year'
  
  -- The Core: Configuration of benefits
  features JSONB NOT NULL DEFAULT '{
    "zero_deposit": false,
    "commission_discount": 0,
    "priority_support": false,
    "coverage_cents": 0
  }'::jsonb,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SEED INITIAL PLANS (Synced with existing logic)
INSERT INTO public.subscription_plans (slug, name, price_cents, features)
VALUES 
  ('club_standard', 'AutoRenta Club Standard', 30000, '{
    "zero_deposit": true,
    "commission_discount": 0.10,
    "priority_support": false,
    "coverage_cents": 80000
  }'::jsonb),
  ('club_black', 'AutoRenta Club Black', 60000, '{
    "zero_deposit": true,
    "commission_discount": 0.25,
    "priority_support": true,
    "coverage_cents": 120000
  }'::jsonb),
  ('club_luxury', 'AutoRenta Club Luxury', 150000, '{
    "zero_deposit": true,
    "commission_discount": 0.50,
    "priority_support": true,
    "coverage_cents": 200000
  }'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features;

-- 3. LINK SUBSCRIPTIONS TO PLANS (Adding FK)
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id);

-- Migration of existing data based on slug if possible (Skipped for safety in this script)

-- 4. RPC: check_user_benefits
-- Centralized way to get active features for a user
CREATE OR REPLACE FUNCTION public.get_user_club_benefits(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_features JSONB;
BEGIN
  SELECT p.features INTO v_features
  FROM public.subscriptions s
  JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.user_id = p_user_id 
    AND s.status = 'active' 
    AND s.expires_at > NOW()
  LIMIT 1;

  RETURN COALESCE(v_features, '{
    "zero_deposit": false, 
    "commission_discount": 0, 
    "is_member": false
  }'::jsonb);
END;
$$;

-- 5. CRON: Process Expired Subscriptions
CREATE OR REPLACE FUNCTION public.process_subscription_expirations()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark as expired anything past their date
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expires_at < NOW();
END;
$$;

-- Schedule daily check
SELECT cron.schedule(
    'process-subscription-expirations',
    '0 0 * * *', -- Every midnight
    $$ SELECT public.process_subscription_expirations(); $$
);

-- 6. GRANTS
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_club_benefits(UUID) TO authenticated;

COMMIT;
