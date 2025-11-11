-- ============================================================================
-- Alter fx_rates table constraints to support BRL and UYU
-- Required before inserting Binance rates
-- ============================================================================

BEGIN;

-- 1. Check current constraints
SELECT
  '=== CURRENT CONSTRAINTS ===' AS section,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'fx_rates'::regclass
  AND contype = 'c'  -- check constraints
ORDER BY conname;

-- 2. Drop old constraints
ALTER TABLE fx_rates
  DROP CONSTRAINT IF EXISTS fx_rates_from_currency_check;

ALTER TABLE fx_rates
  DROP CONSTRAINT IF EXISTS fx_rates_to_currency_check;

-- 3. Add new constraints with BRL and UYU support
ALTER TABLE fx_rates
  ADD CONSTRAINT fx_rates_from_currency_check
  CHECK (from_currency = ANY (ARRAY['USD', 'ARS', 'COP', 'MXN', 'BRL', 'UYU']));

ALTER TABLE fx_rates
  ADD CONSTRAINT fx_rates_to_currency_check
  CHECK (to_currency = ANY (ARRAY['USD', 'ARS', 'COP', 'MXN', 'BRL', 'UYU']));

-- 4. Verify new constraints
SELECT
  '=== NEW CONSTRAINTS ===' AS section,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'fx_rates'::regclass
  AND contype = 'c'
ORDER BY conname;

-- 5. Summary
SELECT
  '═══════════════════════════════════════════' AS separator,
  'fx_rates CONSTRAINTS UPDATED' AS title,
  '═══════════════════════════════════════════' AS separator2,
  '' AS blank1,
  '✅ Removed old constraints' AS step1,
  '✅ Added BRL and UYU to from_currency' AS step2,
  '✅ Added BRL and UYU to to_currency' AS step3,
  '' AS blank2,
  '📋 Supported currencies now:' AS supported_title,
  '   USD, ARS, COP, MXN, BRL, UYU' AS currencies,
  '' AS blank3,
  '➡️  Ready to insert Binance rates' AS next_step;

COMMIT;
