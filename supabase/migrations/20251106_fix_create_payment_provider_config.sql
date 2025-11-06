-- Migration: Create payment_provider_config table (FIXED)
-- Description: Store provider-specific credentials, webhooks, and feature flags
-- Phase: 1.5 - Payment Provider Configuration
-- Date: 2025-11-06
-- Fixed: Changed UNIQUE constraint with WHERE to partial unique index

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
  created_by UUID REFERENCES profiles(id)
);

-- Step 2: Create partial unique index (ensures only one active config per provider + environment)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_provider_config_unique_active
  ON payment_provider_config(provider, environment)
  WHERE is_active = TRUE;

-- Step 3: Create other indexes
CREATE INDEX IF NOT EXISTS idx_payment_provider_config_provider
  ON payment_provider_config(provider)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_payment_provider_config_environment
  ON payment_provider_config(environment)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_payment_provider_config_created_by
  ON payment_provider_config(created_by);

-- Step 4: Add comments
COMMENT ON TABLE payment_provider_config IS
  'Provider-specific configuration for payment gateways';

COMMENT ON COLUMN payment_provider_config.provider IS
  'Payment provider: mercadopago, paypal, stripe, etc.';

COMMENT ON COLUMN payment_provider_config.environment IS
  'Environment: sandbox or production';

COMMENT ON COLUMN payment_provider_config.is_active IS
  'Only one config per provider+environment can be active';

-- Step 5: Enable RLS
ALTER TABLE payment_provider_config ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies (only admins can access)
CREATE POLICY "Only admins can view provider config"
  ON payment_provider_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can insert provider config"
  ON payment_provider_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update provider config"
  ON payment_provider_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete provider config"
  ON payment_provider_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can access all"
  ON payment_provider_config FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

COMMIT;
