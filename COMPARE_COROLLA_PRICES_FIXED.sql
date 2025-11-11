-- ============================================================================
-- Comparación de Precios: Toyota Corolla 2022
-- Brasil vs Argentina vs Uruguay
-- Versión adaptada para usar: pair, rate (estructura real)
-- ============================================================================

-- 1. Ver los tipos de cambio actuales en la plataforma
SELECT
  pair AS par_monedas,
  rate AS tasa,
  source AS fuente,
  last_updated AS ultima_actualizacion,
  is_active AS activo
FROM exchange_rates
WHERE pair IN ('BRL/USD', 'ARS/USD', 'UYU/USD')
  AND is_active = true
ORDER BY pair, last_updated DESC;

-- 2. Obtener la tasa más reciente de cada moneda
WITH latest_rates AS (
  SELECT DISTINCT ON (pair)
    pair,
    rate,
    last_updated
  FROM exchange_rates
  WHERE pair IN ('BRL/USD', 'ARS/USD', 'UYU/USD')
    AND is_active = true
  ORDER BY pair, last_updated DESC
)
SELECT
  '=== TIPOS DE CAMBIO ACTUALES ===' AS seccion,
  pair AS par,
  rate AS tasa_a_usd,
  (1.0 / rate)::DECIMAL(10,2) AS usd_a_moneda_local,
  last_updated AS fecha_actualizacion
FROM latest_rates
ORDER BY pair;

-- 3. Comparación de precios del Toyota Corolla 2022
WITH latest_rates AS (
  SELECT DISTINCT ON (pair)
    pair,
    rate
  FROM exchange_rates
  WHERE pair IN ('BRL/USD', 'ARS/USD', 'UYU/USD')
    AND is_active = true
  ORDER BY pair, last_updated DESC
),
prices AS (
  -- Precio obtenido de FIPE (Brasil)
  SELECT
    'Brasil (FIPE Real)' AS pais,
    'BRL' AS moneda,
    27223 AS precio_usd,
    (SELECT rate FROM latest_rates WHERE pair = 'BRL/USD') AS tasa,
    136115 AS precio_moneda_local -- R$ aproximado según FIPE

  UNION ALL

  -- Precio Argentina (promedio de mercado: $28,000,000 ARS)
  SELECT
    'Argentina (Mercado)',
    'ARS',
    NULL, -- Calcularemos desde ARS
    (SELECT rate FROM latest_rates WHERE pair = 'ARS/USD'),
    28000000

  UNION ALL

  -- Precio Uruguay (estimado basado en mercado ~US$26,500)
  SELECT
    'Uruguay (Mercado)',
    'UYU',
    26500,
    (SELECT rate FROM latest_rates WHERE pair = 'UYU/USD'),
    NULL -- Calcularemos si es necesario
)
SELECT
  pais,
  moneda,
  COALESCE(precio_usd, (precio_moneda_local * tasa)::INTEGER) AS precio_usd,
  COALESCE(precio_moneda_local, (precio_usd / tasa)::BIGINT) AS precio_moneda_local,
  tasa AS tipo_cambio_a_usd,
  -- Diferencia vs Brasil (27,223 USD)
  ((COALESCE(precio_usd, (precio_moneda_local * tasa)) - 27223) / 27223.0 * 100)::DECIMAL(5,1) AS diferencia_vs_brasil_pct
FROM prices
ORDER BY COALESCE(precio_usd, (precio_moneda_local * tasa)) DESC;

-- 4. Resumen ejecutivo con interpretación
WITH latest_rates AS (
  SELECT DISTINCT ON (pair)
    pair,
    rate
  FROM exchange_rates
  WHERE pair IN ('BRL/USD', 'ARS/USD', 'UYU/USD')
    AND is_active = true
  ORDER BY pair, last_updated DESC
),
arg_rate AS (
  SELECT rate FROM latest_rates WHERE pair = 'ARS/USD'
)
SELECT
  'Toyota Corolla 2022 - Comparación Regional' AS titulo,
  '' AS separador1,
  '🇧🇷 Brasil: $27,223 USD (FIPE)' AS brasil,
  '🇦🇷 Argentina: $28M ARS ≈ $' || (28000000 * (SELECT rate FROM arg_rate))::INTEGER || ' USD' AS argentina,
  '🇺🇾 Uruguay: $26,500 USD (mercado)' AS uruguay,
  '' AS separador2,
  CASE
    WHEN ABS((28000000 * (SELECT rate FROM arg_rate)) - 27223) < 2000 THEN
      '✅ Precios muy similares en la región (diferencia < $2k USD)'
    WHEN ABS((28000000 * (SELECT rate FROM arg_rate)) - 27223) < 5000 THEN
      '✅ Precios similares en la región (diferencia < $5k USD)'
    ELSE
      '⚠️ Diferencias significativas entre países'
  END AS conclusion;
