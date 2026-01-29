-- Migration: Convert platform to USD base currency
-- All prices stored in USD, conversion to ARS only at payment time
-- Rate: Obtained from exchange_rates table (Binance real-time)
-- IMPORTANT: Ensure exchange_rates.USDARS is current before running!
-- As of 2025-12-03: Binance USDTARS = 1511.80

-- ============================================
-- 1. CONVERT CAR PRICES FROM ARS TO USD
-- ============================================

-- Update cars: convert price_per_day from ARS to USD using current rate
UPDATE cars
SET
  -- Convert ARS to USD using rate from exchange_rates table
  price_per_day = ROUND(price_per_day / (
    SELECT rate FROM exchange_rates WHERE pair = 'USDARS' ORDER BY updated_at DESC LIMIT 1
  ), 2),
  -- Set currency to USD
  currency = 'USD',
  -- Update value_usd to match
  value_usd = ROUND(price_per_day / (
    SELECT rate FROM exchange_rates WHERE pair = 'USDARS' ORDER BY updated_at DESC LIMIT 1
  ), 2),
  updated_at = NOW()
WHERE currency = 'ARS' OR currency IS NULL;

-- Also update any cars that might have been in other currencies
UPDATE cars
SET
  price_per_day = COALESCE(value_usd, price_per_day),
  currency = 'USD',
  updated_at = NOW()
WHERE currency IS NOT NULL AND currency != 'USD' AND currency != 'ARS';

-- ============================================
-- 2. UPDATE WALLET BALANCES TO USD
-- ============================================

-- Convert wallet balances from ARS cents to USD cents using current rate
UPDATE user_wallets
SET
  balance_cents = ROUND(balance_cents / (
    SELECT rate FROM exchange_rates WHERE pair = 'USDARS' ORDER BY updated_at DESC LIMIT 1
  )),
  available_balance_cents = ROUND(available_balance_cents / (
    SELECT rate FROM exchange_rates WHERE pair = 'USDARS' ORDER BY updated_at DESC LIMIT 1
  )),
  locked_balance_cents = ROUND(locked_balance_cents / (
    SELECT rate FROM exchange_rates WHERE pair = 'USDARS' ORDER BY updated_at DESC LIMIT 1
  )),
  autorentar_credit_balance_cents = ROUND(autorentar_credit_balance_cents / (
    SELECT rate FROM exchange_rates WHERE pair = 'USDARS' ORDER BY updated_at DESC LIMIT 1
  )),
  cash_deposit_balance_cents = ROUND(cash_deposit_balance_cents / (
    SELECT rate FROM exchange_rates WHERE pair = 'USDARS' ORDER BY updated_at DESC LIMIT 1
  )),
  currency = 'USD',
  updated_at = NOW()
WHERE currency = 'ARS' OR currency IS NULL;

-- ============================================
-- 3. UPDATE DEFAULT COLUMN VALUES
-- ============================================

-- Change default currency for cars table
ALTER TABLE cars
  ALTER COLUMN currency SET DEFAULT 'USD';

-- Change default currency for user_wallets table
ALTER TABLE user_wallets
  ALTER COLUMN currency SET DEFAULT 'USD';

-- Change default currency for bookings table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'bookings' AND column_name = 'currency') THEN
    ALTER TABLE bookings ALTER COLUMN currency SET DEFAULT 'USD';
  END IF;
END $$;

-- ============================================
-- 4. ADD METADATA COMMENT
-- ============================================

COMMENT ON TABLE cars IS 'Vehicle listings. All prices in USD. Conversion to ARS at payment time using Binance rate.';
COMMENT ON TABLE user_wallets IS 'User wallet balances in USD. Platform base currency.';

-- ============================================
-- 5. LOG THE MIGRATION
-- ============================================

-- Store the rate used for this migration for audit purposes
INSERT INTO exchange_rates (pair, rate, source, updated_at)
VALUES (
  'MIGRATION_USD_BASE',
  (SELECT rate FROM exchange_rates WHERE pair = 'USDARS' ORDER BY updated_at DESC LIMIT 1),
  'Migration 20251203 - Converted platform to USD base using live Binance rate',
  NOW()
)
ON CONFLICT (pair) DO UPDATE
SET rate = (SELECT rate FROM exchange_rates WHERE pair = 'USDARS' ORDER BY updated_at DESC LIMIT 1),
    source = 'Migration 20251203 - Converted platform to USD base using live Binance rate',
    updated_at = NOW();

-- Success message with actual rate used
DO $$
DECLARE
  used_rate NUMERIC;
BEGIN
  SELECT rate INTO used_rate FROM exchange_rates WHERE pair = 'USDARS' ORDER BY updated_at DESC LIMIT 1;
  RAISE NOTICE 'Migration complete: Platform converted to USD base currency';
  RAISE NOTICE 'Rate used from exchange_rates: % ARS/USD', used_rate;
  RAISE NOTICE 'All car prices and wallet balances now in USD';
END $$;
