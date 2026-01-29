-- Migration: Add indexes and comments to payment_intents (columns already exist)
-- Description: Simplified version - columns already exist, just add indexes/comments
-- Phase: 1.1 - Database Refactoring (Fixed)
-- Date: 2025-11-06

BEGIN;

-- Columns already exist from previous migration:
-- - provider_payment_id
-- - provider_status
-- - provider_status_detail
-- - paypal_order_id
-- - paypal_capture_id

-- Just ensure indexes exist (they might already exist too)
CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_payment_id
  ON payment_intents(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_status
  ON payment_intents(provider_status)
  WHERE provider_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intents_paypal_order_id
  ON payment_intents(paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN payment_intents.provider_payment_id IS
  'Payment ID from the payment provider (e.g., MercadoPago payment_id, PayPal order_id)';

COMMENT ON COLUMN payment_intents.provider_status IS
  'Payment status from the provider (e.g., approved, pending, rejected)';

COMMENT ON COLUMN payment_intents.provider_status_detail IS
  'Detailed status information from the provider';

COMMENT ON COLUMN payment_intents.paypal_order_id IS
  'PayPal order ID for tracking the order lifecycle';

COMMENT ON COLUMN payment_intents.paypal_capture_id IS
  'PayPal capture ID after the order is captured';

COMMIT;
