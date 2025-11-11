-- ============================================================================
-- Update fx_rates with Real Binance API Rates (SAFE VERSION)
-- Date: 2025-11-11
-- Source: Binance API (USDTBRL, USDTARS)
-- Uses transaction for safety
-- ============================================================================

BEGIN;

-- 1. Check current rates BEFORE changes
SELECT
  '=== CURRENT RATES (BEFORE UPDATE) ===' AS section,
  id,
  from_currency,
  to_currency,
  rate,
  source,
  valid_from,
  is_active
FROM fx_rates
WHERE (from_currency IN ('BRL', 'ARS', 'UYU') OR to_currency IN ('BRL', 'ARS', 'UYU'))
ORDER BY from_currency, to_currency, valid_from DESC;

-- 2. Deactivate old ARS rates (CORRECTED - proper parentheses)
UPDATE fx_rates
SET is_active = false,
    valid_until = NOW()
WHERE (from_currency = 'ARS' OR to_currency = 'ARS')
  AND is_active = true;

-- Show what was updated
SELECT
  '=== DEACTIVATED RATES ===' AS section,
  id,
  from_currency || '→' || to_currency AS pair,
  rate,
  source,
  valid_until
FROM fx_rates
WHERE (from_currency = 'ARS' OR to_currency = 'ARS')
  AND is_active = false
  AND valid_until IS NOT NULL;

-- 3. Insert new rates from Binance
-- BRL→USD: 0.188541 (1 USD = 5.304 BRL)
INSERT INTO fx_rates (
  from_currency,
  to_currency,
  rate,
  source,
  valid_from,
  is_active,
  metadata
)
VALUES
  ('BRL', 'USD', 0.188541, 'binance', NOW(), true,
   '{"api":"USDTBRL","last_updated":"2025-11-11","method":"spot_price"}'::jsonb),
  ('USD', 'BRL', 5.304, 'binance', NOW(), true,
   '{"api":"USDTBRL","last_updated":"2025-11-11","method":"inverse"}'::jsonb);

-- ARS→USD: 0.000680 (1 USD = 1,471.60 ARS)
INSERT INTO fx_rates (
  from_currency,
  to_currency,
  rate,
  source,
  valid_from,
  is_active,
  metadata
)
VALUES
  ('ARS', 'USD', 0.000680, 'binance', NOW(), true,
   '{"api":"USDTARS","last_updated":"2025-11-11","method":"spot_price"}'::jsonb),
  ('USD', 'ARS', 1471.60, 'binance', NOW(), true,
   '{"api":"USDTARS","last_updated":"2025-11-11","method":"inverse"}'::jsonb);

-- 4. Verify new rates
SELECT
  '=== NEW RATES FROM BINANCE ===' AS section,
  id,
  from_currency || '→' || to_currency AS pair,
  rate,
  source,
  valid_from,
  is_active,
  metadata
FROM fx_rates
WHERE source = 'binance'
  AND is_active = true
ORDER BY from_currency, to_currency;

-- 5. Summary of all active rates
SELECT
  '=== ALL ACTIVE RATES (AFTER UPDATE) ===' AS section,
  from_currency || '→' || to_currency AS pair,
  rate,
  source,
  valid_from
FROM fx_rates
WHERE is_active = true
ORDER BY from_currency, to_currency;

-- 6. Calculate impact on Toyota Corolla pricing
WITH latest_rates AS (
  SELECT DISTINCT ON (from_currency)
    from_currency,
    rate
  FROM fx_rates
  WHERE to_currency = 'USD'
    AND from_currency IN ('BRL', 'ARS')
    AND is_active = true
  ORDER BY from_currency, valid_from DESC
)
SELECT
  '═══════════════════════════════════════════' AS separator,
  'IMPACT ON COROLLA 2022 PRICING' AS title,
  '═══════════════════════════════════════════' AS separator2,
  '' AS blank1,
  '🇧🇷 Brasil: $27,223 USD → ' ||
    (27223 / (SELECT rate FROM latest_rates WHERE from_currency = 'BRL'))::INTEGER ||
    ' BRL' AS brasil,
  '   Tasa: ' || (SELECT rate FROM latest_rates WHERE from_currency = 'BRL') ||
    ' (Binance)' AS brasil_rate,
  '' AS blank2,
  '🇦🇷 Argentina (OLD: $28M ARS): $' ||
    (28000000 * (SELECT rate FROM latest_rates WHERE from_currency = 'ARS'))::INTEGER ||
    ' USD' AS argentina_old,
  '🇦🇷 Argentina (REAL: $25k USD): ' ||
    (25000 / (SELECT rate FROM latest_rates WHERE from_currency = 'ARS'))::INTEGER ||
    ' millones ARS' AS argentina_correct,
  '   Tasa: ' || (SELECT rate FROM latest_rates WHERE from_currency = 'ARS') ||
    ' (Binance)' AS argentina_rate,
  '' AS blank3,
  '✅ Tasas actualizadas correctamente' AS success;

-- If everything looks good, COMMIT
-- If something is wrong, you can ROLLBACK
COMMIT;

-- 7. Log the sync (optional - for tracking)
INSERT INTO exchange_rate_sync_log (
  source,
  sync_status,
  records_synced,
  metadata
)
VALUES (
  'binance',
  'success',
  4,
  jsonb_build_object(
    'pairs', ARRAY['BRL/USD', 'USD/BRL', 'ARS/USD', 'USD/ARS'],
    'method', 'manual_update',
    'timestamp', NOW()
  )
);

SELECT '=== SYNC LOGGED ===' AS section, *
FROM exchange_rate_sync_log
ORDER BY synced_at DESC
LIMIT 1;
