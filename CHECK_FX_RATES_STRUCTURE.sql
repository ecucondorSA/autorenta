-- Ver la estructura de fx_rates
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fx_rates'
ORDER BY ordinal_position;

-- Ver datos de ejemplo
SELECT *
FROM fx_rates
ORDER BY created_at DESC
LIMIT 10;

-- Ver qué pares de monedas hay
SELECT DISTINCT
  from_currency,
  to_currency,
  COUNT(*) AS registros
FROM fx_rates
GROUP BY from_currency, to_currency
ORDER BY from_currency, to_currency;
