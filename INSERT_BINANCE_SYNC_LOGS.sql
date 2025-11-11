-- ============================================================================
-- Insert sync logs for Binance rates update
-- Matches actual exchange_rate_sync_log table structure
-- ============================================================================

BEGIN;

-- Insert 4 log rows (one per pair inserted)
INSERT INTO exchange_rate_sync_log (
  sync_method,
  pair,
  binance_rate,
  platform_rate,
  success,
  error_message,
  execution_time_ms
)
VALUES
  ('manual_update', 'BRL/USD', 0.188541, NULL, true, NULL, NULL),
  ('manual_update', 'USD/BRL', 5.304, NULL, true, NULL, NULL),
  ('manual_update', 'ARS/USD', 0.000680, NULL, true, NULL, NULL),
  ('manual_update', 'USD/ARS', 1471.60, NULL, true, NULL, NULL);

-- Verify inserted logs
SELECT
  '=== BINANCE SYNC LOGS (JUST INSERTED) ===' AS section,
  id,
  sync_method,
  pair,
  binance_rate,
  success,
  synced_at
FROM exchange_rate_sync_log
WHERE sync_method = 'manual_update'
ORDER BY synced_at DESC
LIMIT 4;

-- Show all logs
SELECT
  '=== ALL SYNC LOGS ===' AS section,
  sync_method,
  pair,
  binance_rate,
  platform_rate,
  success,
  error_message,
  synced_at
FROM exchange_rate_sync_log
ORDER BY synced_at DESC;

COMMIT;

-- Final summary
SELECT
  '═══════════════════════════════════════════' AS separator,
  'BINANCE RATES UPDATE - COMPLETE' AS title,
  '═══════════════════════════════════════════' AS separator2,
  '' AS blank1,
  '✅ Constraints updated (BRL, UYU added)' AS step1,
  '✅ 4 Binance rates inserted into fx_rates' AS step2,
  '✅ 4 sync logs recorded' AS step3,
  '' AS blank2,
  '📊 Active rates now:' AS rates_title,
  '   BRL→USD: 0.188541 (Binance)' AS brl_usd,
  '   USD→BRL: 5.304 (Binance)' AS usd_brl,
  '   ARS→USD: 0.000680 (Binance)' AS ars_usd,
  '   USD→ARS: 1471.60 (Binance)' AS usd_ars;
