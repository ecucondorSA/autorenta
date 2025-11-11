-- Inspect the sync_method constraint
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'exchange_rate_sync_log'::regclass
  AND conname LIKE '%sync_method%';

-- Also check if it's an enum type
SELECT
  t.typname AS enum_name,
  e.enumlabel AS allowed_value,
  e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%sync%'
ORDER BY e.enumsortorder;
