-- Ver la estructura de la tabla exchange_rates
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'exchange_rates'
ORDER BY ordinal_position;

-- Ver algunos datos de ejemplo
SELECT *
FROM exchange_rates
WHERE to_currency = 'USD'
  AND from_currency IN ('BRL', 'ARS', 'UYU')
ORDER BY from_currency, created_at DESC
LIMIT 10;
