-- Check structure of exchange_rate_sync_log
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'exchange_rate_sync_log'
ORDER BY ordinal_position;

-- Check if there are any existing rows
SELECT
  '=== EXISTING SYNC LOGS ===' AS section,
  *
FROM exchange_rate_sync_log
ORDER BY synced_at DESC
LIMIT 5;
