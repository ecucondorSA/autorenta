-- Migration: Refactor bookings table to be provider-agnostic
-- Description: Rename MercadoPago-specific columns and add payment_provider tracking
-- Phase: 1.2 - Database Refactoring
-- Date: 2025-11-06

-- This migration makes bookings table work with multiple payment providers
-- by replacing MercadoPago-specific column names with generic provider_* columns

BEGIN;

-- Step 1: Add payment_provider column to track which provider was used for this booking
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_provider payment_provider DEFAULT 'mercadopago';

-- Step 2: Add new provider-agnostic columns
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_init_point TEXT,
  ADD COLUMN IF NOT EXISTS provider_split_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_collector_id TEXT;

-- Step 3: Migrate data from old MercadoPago-specific columns to new columns
UPDATE bookings
SET
  payment_preference_id = mercadopago_preference_id,
  payment_init_point = mercadopago_init_point,
  provider_split_payment_id = mp_split_payment_id,
  provider_collector_id = mp_collector_id
WHERE mercadopago_preference_id IS NOT NULL
   OR mercadopago_init_point IS NOT NULL
   OR mp_split_payment_id IS NOT NULL
   OR mp_collector_id IS NOT NULL;

-- Step 4: Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_bookings_payment_provider
  ON bookings(payment_provider);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_preference_id
  ON bookings(payment_preference_id)
  WHERE payment_preference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_provider_split_payment_id
  ON bookings(provider_split_payment_id)
  WHERE provider_split_payment_id IS NOT NULL;

-- Step 5: Drop old MercadoPago-specific columns
ALTER TABLE bookings
  DROP COLUMN IF EXISTS mercadopago_preference_id,
  DROP COLUMN IF EXISTS mercadopago_init_point,
  DROP COLUMN IF EXISTS mp_split_payment_id,
  DROP COLUMN IF EXISTS mp_collector_id;

-- Step 6: Add comments for documentation
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

-- Step 7: Update RLS policies if they reference old column names
-- (Most RLS policies are on user_id, booking_id, not payment columns, so likely no changes needed)

COMMIT;
