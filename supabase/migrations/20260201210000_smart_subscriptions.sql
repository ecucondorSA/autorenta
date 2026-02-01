-- Migration: Smart Subscriptions & Dynamic Risk Engine
-- Date: 2026-02-01
-- Description: Adds telemetry tracking to cars and dynamic policy configuration for subscriptions.

-- 1. CAR TELEMETRY STATUS
-- We need to know if a car is "Smart" enough to be eligible for low-deposit rentals.
ALTER TABLE public.cars 
ADD COLUMN IF NOT EXISTS has_telemetry BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telemetry_provider TEXT, -- 'navixy', 'traccar', 'manual_verified'
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ, -- To check if GPS is online
ADD COLUMN IF NOT EXISTS kill_switch_enabled BOOLEAN DEFAULT FALSE;

-- Index for fast filtering of "Smart Cars"
CREATE INDEX IF NOT EXISTS idx_cars_telemetry ON public.cars(has_telemetry, last_heartbeat);


-- 2. DYNAMIC SUBSCRIPTION POLICIES
-- Instead of hardcoding $14.99 or $300 in frontend, we store it here.
-- This allows adjusting risk parameters without app updates.
CREATE TABLE IF NOT EXISTS public.subscription_policies (
    tier_id TEXT PRIMARY KEY, -- 'club_standard', 'club_black', 'club_luxury'
    
    -- Pricing
    price_monthly_usd NUMERIC(10,2) NOT NULL,
    
    -- Guarantee Rules
    base_guarantee_usd NUMERIC(10,2) NOT NULL, -- Non-subscribers
    reduced_guarantee_usd NUMERIC(10,2) NOT NULL, -- Subscribers (if conditions met)
    
    -- Eligibility Gates (Underwriting)
    telemetry_required BOOLEAN DEFAULT TRUE, -- Is GPS mandatory for reduced guarantee?
    min_clean_trips_required INTEGER DEFAULT 0, -- Anti-fraud: new subs might need 1 clean trip
    waiting_period_hours INTEGER DEFAULT 24, -- Anti-fraud: prevent roadside subscription
    
    -- Limits (Aggregate Deductible)
    max_gap_coverage_annual_usd NUMERIC(10,2) DEFAULT 1000.00, -- Max amount AR pays per year per user
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Data (The "Financially Viable" Model)
INSERT INTO public.subscription_policies 
(tier_id, price_monthly_usd, base_guarantee_usd, reduced_guarantee_usd, telemetry_required, max_gap_coverage_annual_usd)
VALUES 
('club_standard', 14.99, 600.00, 300.00, TRUE, 600.00), -- Covers ~2 gap events
('club_black', 29.99, 1200.00, 500.00, TRUE, 1400.00),
('club_luxury', 59.99, 2500.00, 1200.00, TRUE, 2600.00)
ON CONFLICT (tier_id) DO UPDATE SET
price_monthly_usd = EXCLUDED.price_monthly_usd,
base_guarantee_usd = EXCLUDED.base_guarantee_usd,
reduced_guarantee_usd = EXCLUDED.reduced_guarantee_usd;


-- 3. USER RISK STATS (The "Underwriting" Memory)
-- Tracks usage of the "Gap Coverage" to enforce aggregate limits.
CREATE TABLE IF NOT EXISTS public.user_risk_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    
    -- Reputation
    clean_trips_count INTEGER DEFAULT 0,
    strikes_count INTEGER DEFAULT 0, -- "Strike One" policy
    
    -- Financials (Rolling 12 months ideally, simplified here)
    gap_coverage_used_usd NUMERIC(10,2) DEFAULT 0.00, -- How much AR paid for this user's damages
    last_claim_date TIMESTAMPTZ,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.subscription_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_risk_stats ENABLE ROW LEVEL SECURITY;

-- Public read for policies (pricing is public)
CREATE POLICY "Public read policies" ON public.subscription_policies FOR SELECT USING (true);

-- Users read their own risk stats
CREATE POLICY "Users read own stats" ON public.user_risk_stats FOR SELECT USING (auth.uid() = user_id);

-- System/Admin manages risk stats
-- (Assuming service_role is used for updates via RPC/Edge Functions)
