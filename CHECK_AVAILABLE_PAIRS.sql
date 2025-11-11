-- Ver todos los pares de monedas disponibles
SELECT
  pair,
  rate,
  source,
  last_updated,
  is_active
FROM exchange_rates
WHERE is_active = true
ORDER BY pair, last_updated DESC;

-- Ver solo los pares activos únicos
SELECT DISTINCT pair
FROM exchange_rates
WHERE is_active = true
ORDER BY pair;

-- Buscar cualquier par relacionado con Argentina
SELECT *
FROM exchange_rates
WHERE pair ILIKE '%ARS%'
ORDER BY last_updated DESC
LIMIT 5;

-- Buscar pares con USD
SELECT DISTINCT pair
FROM exchange_rates
WHERE pair LIKE '%USD%'
  AND is_active = true
ORDER BY pair;
