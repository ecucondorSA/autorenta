-- Migration: Create payment_provider_config table
-- Description: Store provider-specific credentials, webhooks, and feature flags
-- Phase: 1.5 - Payment Provider Configuration
-- Date: 2025-11-06

-- This migration creates a structured way to manage provider-specific configuration
-- avoiding environment variable sprawl

BEGIN;

-- Step 1: Create payment_provider_config table
CREATE TABLE IF NOT EXISTS payment_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider payment_provider NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  is_active BOOLEAN DEFAULT TRUE,

  -- API Credentials (will be encrypted in Edge Functions)
  client_id TEXT,
  client_secret TEXT,
  api_key TEXT,

  -- Webhook Configuration
  webhook_url TEXT,
  webhook_id TEXT,
  webhook_secret TEXT,

  -- Provider-specific settings (flexible JSON for provider-specific fields)
  settings JSONB DEFAULT '{}'::jsonb,

  -- Feature flags
  features JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  -- Ensure only one active config per provider + environment combination
  UNIQUE(provider, environment, is_active) WHERE is_active = TRUE
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_provider_config_provider
  ON payment_provider_config(provider)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_payment_provider_config_environment
  ON payment_provider_config(environment)
  WHERE is_active = TRUE;

-- Step 3: Add RLS policies (highly restricted - only service role)
ALTER TABLE payment_provider_config ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (contains sensitive credentials)
CREATE POLICY "Only service role can access provider config"
  ON payment_provider_config FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 4: Insert MercadoPago sandbox configuration template
-- Note: Actual credentials should be added via Supabase secrets or environment variables
INSERT INTO payment_provider_config (
  provider,
  environment,
  is_active,
  webhook_url,
  settings,
  features,
  description
)
VALUES (
  'mercadopago',
  'sandbox',
  FALSE,  -- Will be activated when credentials are added
  NULL,   -- Will be set to actual webhook URL
  jsonb_build_object(
    'marketplace_id', NULL,
    'access_token', NULL,
    'public_key', NULL,
    'notification_url', NULL,
    'max_installments', 12,
    'statement_descriptor', 'AutoRenta'
  ),
  jsonb_build_object(
    'split_payments_enabled', TRUE,
    'preauthorization_enabled', TRUE,
    'wallet_deposits_enabled', TRUE,
    'installments_enabled', TRUE,
    'cash_payments_enabled', TRUE
  ),
  'MercadoPago sandbox configuration'
),
(
  'mercadopago',
  'production',
  FALSE,
  NULL,
  jsonb_build_object(
    'marketplace_id', NULL,
    'access_token', NULL,
    'public_key', NULL,
    'notification_url', NULL,
    'max_installments', 12,
    'statement_descriptor', 'AutoRenta'
  ),
  jsonb_build_object(
    'split_payments_enabled', TRUE,
    'preauthorization_enabled', TRUE,
    'wallet_deposits_enabled', TRUE,
    'installments_enabled', TRUE,
    'cash_payments_enabled', TRUE
  ),
  'MercadoPago production configuration'
)
ON CONFLICT (provider, environment, is_active) WHERE is_active = TRUE DO NOTHING;

-- Step 5: Insert PayPal configuration templates
INSERT INTO payment_provider_config (
  provider,
  environment,
  is_active,
  webhook_url,
  settings,
  features,
  description
)
VALUES (
  'paypal',
  'sandbox',
  FALSE,
  NULL,
  jsonb_build_object(
    'client_id', NULL,
    'client_secret', NULL,
    'partner_attribution_id', NULL,
    'bn_code', NULL,
    'webhook_id', NULL,
    'disbursement_mode', 'INSTANT',
    'intent', 'CAPTURE',
    'landing_page', 'LOGIN',
    'user_action', 'PAY_NOW'
  ),
  jsonb_build_object(
    'split_payments_enabled', FALSE,  -- Requires Partner approval
    'wallet_deposits_enabled', TRUE,
    'booking_payments_enabled', TRUE,
    'advanced_card_payments', FALSE,
    'venmo_enabled', FALSE
  ),
  'PayPal sandbox configuration'
),
(
  'paypal',
  'production',
  FALSE,
  NULL,
  jsonb_build_object(
    'client_id', NULL,
    'client_secret', NULL,
    'partner_attribution_id', NULL,
    'bn_code', NULL,
    'webhook_id', NULL,
    'disbursement_mode', 'INSTANT',
    'intent', 'CAPTURE',
    'landing_page', 'LOGIN',
    'user_action', 'PAY_NOW'
  ),
  jsonb_build_object(
    'split_payments_enabled', FALSE,
    'wallet_deposits_enabled', TRUE,
    'booking_payments_enabled', TRUE,
    'advanced_card_payments', FALSE,
    'venmo_enabled', FALSE
  ),
  'PayPal production configuration'
)
ON CONFLICT (provider, environment, is_active) WHERE is_active = TRUE DO NOTHING;

-- Step 6: Create helper function to get provider config
CREATE OR REPLACE FUNCTION get_payment_provider_config(
  p_provider payment_provider,
  p_environment TEXT DEFAULT 'production'
)
RETURNS TABLE (
  id UUID,
  provider payment_provider,
  environment TEXT,
  webhook_url TEXT,
  settings JSONB,
  features JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ppc.id,
    ppc.provider,
    ppc.environment,
    ppc.webhook_url,
    ppc.settings,
    ppc.features
  FROM payment_provider_config ppc
  WHERE ppc.provider = p_provider
    AND ppc.environment = p_environment
    AND ppc.is_active = TRUE
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_payment_provider_config IS
  'Get active configuration for a payment provider and environment';

-- Step 7: Create function to check if provider feature is enabled
CREATE OR REPLACE FUNCTION is_provider_feature_enabled(
  p_provider payment_provider,
  p_feature_key TEXT,
  p_environment TEXT DEFAULT 'production'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT (features ->> p_feature_key)::boolean INTO v_enabled
  FROM payment_provider_config
  WHERE provider = p_provider
    AND environment = p_environment
    AND is_active = TRUE
  LIMIT 1;

  RETURN COALESCE(v_enabled, FALSE);
END;
$$;

COMMENT ON FUNCTION is_provider_feature_enabled IS
  'Check if a specific feature is enabled for a payment provider';

-- Step 8: Add comments
COMMENT ON TABLE payment_provider_config IS
  'Provider-specific configuration including credentials, webhooks, and feature flags';

COMMENT ON COLUMN payment_provider_config.settings IS
  'Provider-specific settings (API endpoints, display preferences, etc.)';

COMMENT ON COLUMN payment_provider_config.features IS
  'Feature flags for this provider (split_payments_enabled, preauth_enabled, etc.)';

-- Step 9: Create audit trigger for updates
CREATE OR REPLACE FUNCTION update_payment_provider_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_payment_provider_config_updated_at
  BEFORE UPDATE ON payment_provider_config
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_provider_config_updated_at();

COMMIT;
