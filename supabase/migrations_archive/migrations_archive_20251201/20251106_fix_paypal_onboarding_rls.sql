-- Migration: Fix PayPal onboarding RLS policies (handle existing policies)
-- Description: Drop and recreate RLS policies to handle "already exists" errors
-- Phase: 1.3 - Database Refactoring (Fixed)
-- Date: 2025-11-06

BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own PayPal onboarding" ON paypal_seller_onboarding;
DROP POLICY IF EXISTS "Users can insert own PayPal onboarding" ON paypal_seller_onboarding;
DROP POLICY IF EXISTS "Users can update own PayPal onboarding" ON paypal_seller_onboarding;
DROP POLICY IF EXISTS "Admins can view all onboarding" ON paypal_seller_onboarding;
DROP POLICY IF EXISTS "Service role can manage all onboarding" ON paypal_seller_onboarding;

-- Recreate policies
CREATE POLICY "Users can view own PayPal onboarding"
  ON paypal_seller_onboarding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own PayPal onboarding"
  ON paypal_seller_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PayPal onboarding"
  ON paypal_seller_onboarding FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding"
  ON paypal_seller_onboarding FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can manage all onboarding"
  ON paypal_seller_onboarding FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add comments
COMMENT ON TABLE paypal_seller_onboarding IS
  'Tracks PayPal seller onboarding status for marketplace sellers';

COMMENT ON COLUMN paypal_seller_onboarding.tracking_id IS
  'Unique tracking ID from PayPal partner onboarding API';

COMMENT ON COLUMN paypal_seller_onboarding.status IS
  'Onboarding status: pending, in_progress, completed, failed';

COMMIT;
