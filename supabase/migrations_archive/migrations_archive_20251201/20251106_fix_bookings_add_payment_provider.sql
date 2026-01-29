-- Migration: Add missing payment_provider column to bookings
-- Description: Simplified version - only adds missing columns without migrating from old ones
-- Phase: 1.2 - Database Refactoring (Fixed)
-- Date: 2025-11-06

BEGIN;

-- Step 1: Add payment_provider column if it doesn't exist
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_provider payment_provider DEFAULT 'mercadopago';

-- Step 2: Add other provider-agnostic columns if they don't exist
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_init_point TEXT,
  ADD COLUMN IF NOT EXISTS provider_split_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_collector_id TEXT;

-- Step 3: Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_bookings_payment_provider
  ON bookings(payment_provider);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_preference_id
  ON bookings(payment_preference_id)
  WHERE payment_preference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_provider_split_payment_id
  ON bookings(provider_split_payment_id)
  WHERE provider_split_payment_id IS NOT NULL;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN bookings.payment_provider IS
  'Payment provider used for this booking (mercadopago, paypal, etc.)';

COMMENT ON COLUMN bookings.payment_preference_id IS
  'Payment preference/order ID from the provider (MercadoPago preference_id, PayPal order_id)';

COMMENT ON COLUMN bookings.payment_init_point IS
  'Checkout URL provided by the payment provider';

COMMENT ON COLUMN bookings.provider_split_payment_id IS
  'Split payment transaction ID from the provider (for marketplace payments)';

COMMENT ON COLUMN bookings.provider_collector_id IS
  'Seller/collector ID in the payment provider system (for split payments)';

COMMIT;
