-- Migration: Create platform_config table for centralized configuration
-- Description: Consolidate platform fee and other config values (fix 10% vs 15% inconsistency)
-- Phase: 1.4 - Configuration Management
-- Date: 2025-11-06

-- This migration creates a centralized configuration table to avoid hardcoded values
-- scattered across functions and Edge Functions

BEGIN;

-- Step 1: Create platform_config table for key-value configuration
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value_text TEXT,
  value_numeric NUMERIC(10, 4),
  value_boolean BOOLEAN,
  value_json JSONB,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Step 2: Create index for fast lookups by category
CREATE INDEX IF NOT EXISTS idx_platform_config_category
  ON platform_config(category)
  WHERE is_active = TRUE;

-- Step 3: Add RLS policies (only admins can modify, everyone can read active configs)
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read active configs
CREATE POLICY "Anyone can view active platform config"
  ON platform_config FOR SELECT
  USING (is_active = TRUE);

-- Only service role and admins can modify
CREATE POLICY "Service role can manage platform config"
  ON platform_config FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 4: Insert default platform fee configuration (15% as decided)
INSERT INTO platform_config (key, value_numeric, description, category)
VALUES
  ('platform_fee_percent', 0.15, 'Default platform fee percentage for marketplace split payments (15%)', 'payments'),
  ('platform_fee_mercadopago', 0.15, 'Platform fee for MercadoPago split payments', 'payments'),
  ('platform_fee_paypal', 0.15, 'Platform fee for PayPal split payments', 'payments')
ON CONFLICT (key) DO UPDATE
  SET value_numeric = EXCLUDED.value_numeric,
      description = EXCLUDED.description,
      updated_at = NOW();

-- Step 5: Insert other payment-related configs
INSERT INTO platform_config (key, value_boolean, description, category)
VALUES
  ('enable_split_payments_mercadopago', TRUE, 'Enable MercadoPago marketplace split payments', 'payments'),
  ('enable_split_payments_paypal', FALSE, 'Enable PayPal marketplace split payments (requires Partner approval)', 'payments'),
  ('require_seller_verification_for_split', TRUE, 'Require seller verification before enabling split payments', 'payments')
ON CONFLICT (key) DO UPDATE
  SET value_boolean = EXCLUDED.value_boolean,
      description = EXCLUDED.description,
      updated_at = NOW();

-- Step 6: Insert currency and FX configs
INSERT INTO platform_config (key, value_numeric, value_text, description, category)
VALUES
  ('fx_margin_percent', 0.20, 'ARS', 'FX rate margin for USD/ARS conversions (20% over Binance rate)', 'currency'),
  ('default_currency', NULL, 'ARS', 'Default platform currency', 'currency'),
  ('supported_currencies', NULL, NULL, 'List of supported currencies', 'currency')
ON CONFLICT (key) DO UPDATE
  SET value_numeric = EXCLUDED.value_numeric,
      value_text = EXCLUDED.value_text,
      description = EXCLUDED.description,
      updated_at = NOW();

UPDATE platform_config
SET value_json = '["ARS", "USD"]'::jsonb
WHERE key = 'supported_currencies';

-- Step 7: Insert PayPal-specific configs
INSERT INTO platform_config (key, value_text, description, category)
VALUES
  ('paypal_environment', 'sandbox', 'PayPal environment: sandbox or live', 'paypal'),
  ('paypal_disbursement_mode', 'INSTANT', 'PayPal disbursement mode for split payments: INSTANT or DELAYED', 'paypal'),
  ('paypal_partner_attribution_id', '', 'PayPal BN code for partner attribution', 'paypal')
ON CONFLICT (key) DO UPDATE
  SET value_text = EXCLUDED.value_text,
      description = EXCLUDED.description,
      updated_at = NOW();

-- Step 8: Create helper function to get config value
CREATE OR REPLACE FUNCTION get_platform_config(
  p_key TEXT,
  p_default_numeric NUMERIC DEFAULT NULL,
  p_default_text TEXT DEFAULT NULL,
  p_default_boolean BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  value_text TEXT,
  value_numeric NUMERIC,
  value_boolean BOOLEAN,
  value_json JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.value_text,
    pc.value_numeric,
    pc.value_boolean,
    pc.value_json
  FROM platform_config pc
  WHERE pc.key = p_key AND pc.is_active = TRUE
  LIMIT 1;

  -- If not found, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_default_text, p_default_numeric, p_default_boolean, NULL::jsonb;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_platform_config IS
  'Get platform configuration value by key with optional defaults';

-- Step 9: Create function to get platform fee (used by split payment functions)
CREATE OR REPLACE FUNCTION get_platform_fee_percent(
  p_provider TEXT DEFAULT 'mercadopago'
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_fee_percent NUMERIC;
  v_config_key TEXT;
BEGIN
  -- Build config key based on provider
  v_config_key := 'platform_fee_' || p_provider;

  -- Try to get provider-specific fee first
  SELECT value_numeric INTO v_fee_percent
  FROM platform_config
  WHERE key = v_config_key AND is_active = TRUE
  LIMIT 1;

  -- If not found, use default platform fee
  IF v_fee_percent IS NULL THEN
    SELECT value_numeric INTO v_fee_percent
    FROM platform_config
    WHERE key = 'platform_fee_percent' AND is_active = TRUE
    LIMIT 1;
  END IF;

  -- Final fallback to 15%
  RETURN COALESCE(v_fee_percent, 0.15);
END;
$$;

COMMENT ON FUNCTION get_platform_fee_percent IS
  'Get platform fee percentage for a specific provider (defaults to 15%)';

-- Step 10: Add comment to table
COMMENT ON TABLE platform_config IS
  'Centralized platform configuration for fees, features, and settings';

COMMIT;
