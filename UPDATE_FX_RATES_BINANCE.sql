-- ============================================================================
-- Update fx_rates with Real Binance API Rates
-- Date: 2025-11-11
-- Source: Binance API (USDTBRL, USDTARS)
-- ============================================================================

-- 1. Check current rates
SELECT
  '=== CURRENT RATES IN fx_rates ===' AS section,
  from_currency,
  to_currency,
  rate,
  source,
  valid_from,
  is_active
FROM fx_rates
WHERE from_currency IN ('BRL', 'ARS', 'UYU')
   OR to_currency IN ('BRL', 'ARS', 'UYU')
ORDER BY from_currency, to_currency;

-- 2. Deactivate old ARS rates
UPDATE fx_rates
SET is_active = false,
    valid_until = NOW()
WHERE from_currency = 'ARS'
   OR to_currency = 'ARS'
   AND is_active = true;

-- 3. Insert new rates from Binance
-- BRL→USD: 0.188541 (1 USD = 5.304 BRL)
INSERT INTO fx_rates (from_currency, to_currency, rate, source, valid_from, is_active)
VALUES
  ('BRL', 'USD', 0.188541, 'binance', NOW(), true),
  ('USD', 'BRL', 5.304, 'binance', NOW(), true);

-- ARS→USD: 0.000680 (1 USD = 1,471.60 ARS)
INSERT INTO fx_rates (from_currency, to_currency, rate, source, valid_from, is_active)
VALUES
  ('ARS', 'USD', 0.000680, 'binance', NOW(), true),
  ('USD', 'ARS', 1471.60, 'binance', NOW(), true);

-- 4. Verify new rates
SELECT
  '=== NEW RATES FROM BINANCE ===' AS section,
  from_currency || '→' || to_currency AS pair,
  rate,
  source,
  valid_from,
  is_active
FROM fx_rates
WHERE source = 'binance'
  AND is_active = true
ORDER BY from_currency, to_currency;

-- 5. Calculate impact on Toyota Corolla pricing
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
  '=== IMPACT ON COROLLA 2022 PRICING ===' AS section,
  '' AS blank1,
  '🇧🇷 Brasil: $27,223 USD → ' ||
    (27223 / (SELECT rate FROM latest_rates WHERE from_currency = 'BRL'))::INTEGER ||
    ' BRL (tasa: ' || (SELECT rate FROM latest_rates WHERE from_currency = 'BRL') || ')' AS brasil,
  '' AS blank2,
  '🇦🇷 Argentina (si fuera $28M ARS): ' ||
    '$' || (28000000 * (SELECT rate FROM latest_rates WHERE from_currency = 'ARS'))::INTEGER ||
    ' USD (tasa: ' || (SELECT rate FROM latest_rates WHERE from_currency = 'ARS') || ')' AS argentina_old,
  '' AS blank3,
  '🇦🇷 Argentina (para igualar Brasil $27,223): ' ||
    (27223 / (SELECT rate FROM latest_rates WHERE from_currency = 'ARS'))::INTEGER ||
    ' ARS necesarios' AS argentina_correct;

-- 6. Summary
SELECT
  '═══════════════════════════════════════════' AS separator,
  'TASAS ACTUALIZADAS - BINANCE API' AS title,
  '═══════════════════════════════════════════' AS separator2,
  '' AS blank1,
  '✅ BRL→USD: 0.188541 (1 USD = 5.304 BRL)' AS brl_rate,
  '✅ ARS→USD: 0.000680 (1 USD = 1,471.60 ARS)' AS ars_rate,
  '' AS blank2,
  '⚠️  Precio argentino $28M ARS ahora = $19,040 USD' AS warning,
  '💡 Para igualar Brasil ($27,223) necesitas ~$40M ARS' AS suggestion;
