-- Migration: Refactor payment_intents table to be provider-agnostic
-- Description: Rename MercadoPago-specific columns (mp_*) to generic provider_* columns
-- Phase: 1.1 - Database Refactoring
-- Date: 2025-11-06

-- This migration makes payment_intents table work with multiple payment providers
-- by replacing MercadoPago-specific column names with provider-agnostic ones

BEGIN;

-- Step 1: Add new provider-agnostic columns
ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_status_detail TEXT;

-- Step 2: Migrate data from old columns to new columns
UPDATE payment_intents
SET
  provider_payment_id = mp_payment_id,
  provider_status = mp_status,
  provider_status_detail = mp_status_detail
WHERE mp_payment_id IS NOT NULL OR mp_status IS NOT NULL OR mp_status_detail IS NOT NULL;

-- Step 3: Create indexes on new columns (before dropping old ones)
CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_payment_id
  ON payment_intents(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_status
  ON payment_intents(provider_status)
  WHERE provider_status IS NOT NULL;

-- Step 4: Update any existing functions that reference old column names
-- Note: Functions will be updated in subsequent migrations (Phase 2)

-- Step 5: Drop old MercadoPago-specific columns
-- WARNING: This is destructive. Ensure data migration completed successfully.
ALTER TABLE payment_intents
  DROP COLUMN IF EXISTS mp_payment_id,
  DROP COLUMN IF EXISTS mp_status,
  DROP COLUMN IF EXISTS mp_status_detail;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN payment_intents.provider_payment_id IS
  'Payment ID from the payment provider (e.g., MercadoPago payment_id, PayPal order_id)';

COMMENT ON COLUMN payment_intents.provider_status IS
  'Payment status from the provider (e.g., approved, pending, rejected)';

COMMENT ON COLUMN payment_intents.provider_status_detail IS
  'Detailed status information from the provider';

-- Step 7: Add PayPal-specific columns for future use
ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_capture_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_intents_paypal_order_id
  ON payment_intents(paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

COMMENT ON COLUMN payment_intents.paypal_order_id IS
  'PayPal order ID for tracking the order lifecycle';

COMMENT ON COLUMN payment_intents.paypal_capture_id IS
  'PayPal capture ID after the order is captured';

COMMIT;
