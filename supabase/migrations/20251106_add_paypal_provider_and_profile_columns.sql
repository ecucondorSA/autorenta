-- Migration: Add PayPal support to enums and profile columns
-- Description: Add 'paypal' to payment_provider enum and create PayPal OAuth columns in profiles
-- Phase: 1.3 - PayPal Integration
-- Date: 2025-11-06

-- This migration adds PayPal as a supported payment provider alongside MercadoPago

BEGIN;

-- Step 1: Add 'paypal' to payment_provider enum
-- Note: In PostgreSQL, you can't modify enums directly in a transaction-safe way
-- We need to add the new value
ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'paypal';

-- Step 2: Add 'paypal' to wallet_payment_provider enum (if it exists)
-- Check if this enum exists first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_payment_provider') THEN
    ALTER TYPE wallet_payment_provider ADD VALUE IF NOT EXISTS 'paypal';
  END IF;
END $$;

-- Step 3: Add PayPal OAuth columns to profiles table (parallel to MercadoPago columns)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS paypal_merchant_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paypal_access_token TEXT,
  ADD COLUMN IF NOT EXISTS paypal_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS paypal_access_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paypal_account_type TEXT CHECK (paypal_account_type IN ('personal', 'business')),
  ADD COLUMN IF NOT EXISTS paypal_partner_attribution_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_bn_code TEXT,
  ADD COLUMN IF NOT EXISTS paypal_primary_email TEXT,
  ADD COLUMN IF NOT EXISTS paypal_primary_email_confirmed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paypal_onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketplace_approved_paypal BOOLEAN DEFAULT FALSE;

-- Step 4: Create indexes on PayPal columns for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_merchant_id
  ON profiles(paypal_merchant_id)
  WHERE paypal_merchant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_paypal_connected
  ON profiles(paypal_connected)
  WHERE paypal_connected = TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_marketplace_approved_paypal
  ON profiles(marketplace_approved_paypal)
  WHERE marketplace_approved_paypal = TRUE;

-- Step 5: Add comments for documentation
COMMENT ON COLUMN profiles.paypal_merchant_id IS
  'PayPal Merchant ID (Partner Merchant ID) for marketplace onboarding';

COMMENT ON COLUMN profiles.paypal_connected IS
  'Whether the user has connected their PayPal account via OAuth';

COMMENT ON COLUMN profiles.paypal_access_token IS
  'OAuth access token for PayPal API calls (encrypted in application)';

COMMENT ON COLUMN profiles.paypal_refresh_token IS
  'OAuth refresh token for renewing access tokens';

COMMENT ON COLUMN profiles.paypal_account_type IS
  'Type of PayPal account: personal or business';

COMMENT ON COLUMN profiles.paypal_partner_attribution_id IS
  'PayPal Partner Attribution ID (BN code) for tracking partner integrations';

COMMENT ON COLUMN profiles.paypal_primary_email IS
  'Primary email address associated with PayPal account';

COMMENT ON COLUMN profiles.marketplace_approved_paypal IS
  'Whether this seller is approved for PayPal marketplace split payments';

-- Step 6: Create table for tracking PayPal seller onboarding
CREATE TABLE IF NOT EXISTS paypal_seller_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_url TEXT,
  merchant_id TEXT,
  merchant_id_in_paypal TEXT,
  tracking_id TEXT UNIQUE,
  partner_referral_id TEXT,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'declined', 'failed')),
  permissions_granted JSONB,
  products_enabled TEXT[],
  onboarding_started_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paypal_seller_onboarding_user_id
  ON paypal_seller_onboarding(user_id);

CREATE INDEX IF NOT EXISTS idx_paypal_seller_onboarding_tracking_id
  ON paypal_seller_onboarding(tracking_id)
  WHERE tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_paypal_seller_onboarding_status
  ON paypal_seller_onboarding(status);

COMMENT ON TABLE paypal_seller_onboarding IS
  'Tracks PayPal seller onboarding process via Partner Referrals API';

COMMENT ON COLUMN paypal_seller_onboarding.tracking_id IS
  'Unique tracking ID for this onboarding flow (used in return URLs)';

COMMENT ON COLUMN paypal_seller_onboarding.merchant_id_in_paypal IS
  'Merchant ID assigned by PayPal after onboarding completes';

-- Step 7: Add RLS policies for paypal_seller_onboarding
ALTER TABLE paypal_seller_onboarding ENABLE ROW LEVEL SECURITY;

-- Users can view their own onboarding records
CREATE POLICY "Users can view own PayPal onboarding"
  ON paypal_seller_onboarding FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update onboarding records (Edge Functions)
CREATE POLICY "Service role can manage PayPal onboarding"
  ON paypal_seller_onboarding FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 8: Update payment_splits table to support multiple providers
ALTER TABLE payment_splits
  ADD COLUMN IF NOT EXISTS provider payment_provider DEFAULT 'mercadopago';

-- Make collector_id nullable since PayPal uses different identifier format
ALTER TABLE payment_splits
  ALTER COLUMN collector_id DROP NOT NULL;

-- Add provider-agnostic payee identifier
ALTER TABLE payment_splits
  ADD COLUMN IF NOT EXISTS provider_payee_identifier TEXT;

-- Migrate existing data
UPDATE payment_splits
SET provider_payee_identifier = collector_id
WHERE collector_id IS NOT NULL AND provider_payee_identifier IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_splits_provider
  ON payment_splits(provider);

COMMENT ON COLUMN payment_splits.provider IS
  'Payment provider used for this split (mercadopago, paypal)';

COMMENT ON COLUMN payment_splits.provider_payee_identifier IS
  'Payee identifier in provider system (MP collector_id, PayPal merchant_id or email)';

COMMIT;
