-- ============================================================================
-- Comparación de Precios: Toyota Corolla 2022
-- Brasil vs Argentina vs Uruguay
-- ============================================================================

-- 1. Ver los tipos de cambio actuales en la plataforma
SELECT
  from_currency,
  to_currency,
  platform_rate AS tasa,
  created_at AS fecha
FROM exchange_rates
WHERE to_currency = 'USD'
  AND from_currency IN ('BRL', 'ARS', 'UYU')
ORDER BY from_currency, created_at DESC;

-- 2. Obtener la tasa más reciente de cada moneda
WITH latest_rates AS (
  SELECT DISTINCT ON (from_currency)
    from_currency,
    platform_rate,
    created_at
  FROM exchange_rates
  WHERE to_currency = 'USD'
    AND from_currency IN ('BRL', 'ARS', 'UYU')
  ORDER BY from_currency, created_at DESC
)
SELECT
  '=== TIPOS DE CAMBIO ACTUALES ===' AS seccion,
  from_currency AS moneda,
  platform_rate AS tasa_a_usd,
  (1.0 / platform_rate)::DECIMAL(10,2) AS usd_a_moneda,
  created_at AS fecha_actualizacion
FROM latest_rates;

-- 3. Comparación de precios del Toyota Corolla 2022
WITH latest_rates AS (
  SELECT DISTINCT ON (from_currency)
    from_currency,
    platform_rate
  FROM exchange_rates
  WHERE to_currency = 'USD'
    AND from_currency IN ('BRL', 'ARS', 'UYU')
  ORDER BY from_currency, created_at DESC
),
prices AS (
  -- Precio obtenido de FIPE (Brasil)
  SELECT
    'Brasil (FIPE Real)' AS pais,
    'BRL' AS moneda,
    27223 AS precio_usd,
    (SELECT platform_rate FROM latest_rates WHERE from_currency = 'BRL') AS tasa

  UNION ALL

  -- Precio Argentina (promedio de mercado)
  SELECT
    'Argentina (Mercado)',
    'ARS',
    28000000 / (SELECT 1.0 / platform_rate FROM latest_rates WHERE from_currency = 'ARS'),
    (SELECT platform_rate FROM latest_rates WHERE from_currency = 'ARS')

  UNION ALL

  -- Precio Uruguay (estimado basado en mercado ~US$26,500)
  SELECT
    'Uruguay (Mercado)',
    'UYU',
    26500,
    (SELECT platform_rate FROM latest_rates WHERE from_currency = 'UYU')
)
SELECT
  pais,
  moneda,
  precio_usd::INTEGER AS precio_usd,
  (precio_usd / tasa)::BIGINT AS precio_moneda_local,
  tasa AS tipo_cambio,
  -- Diferencia vs Brasil
  ((precio_usd - 27223) / 27223.0 * 100)::DECIMAL(5,1) AS diferencia_vs_brasil_pct
FROM prices
ORDER BY precio_usd DESC;

-- 4. Resumen con interpretación
WITH latest_rates AS (
  SELECT DISTINCT ON (from_currency)
    from_currency,
    platform_rate
  FROM exchange_rates
  WHERE to_currency = 'USD'
    AND from_currency IN ('BRL', 'ARS', 'UYU')
  ORDER BY from_currency, created_at DESC
)
SELECT
  '=== ANÁLISIS DE PRECIOS ===' AS analisis,
  'Toyota Corolla 2022 - Comparación Regional' AS vehiculo,
  '' AS linea1,
  'Brasil: $27,223 USD (valor FIPE sincronizado)' AS brasil,
  'Argentina: ~$28M ARS ≈ $' || (28000000 * (SELECT platform_rate FROM latest_rates WHERE from_currency = 'ARS'))::INTEGER || ' USD' AS argentina,
  'Uruguay: ~$26,500 USD (mercado usado)' AS uruguay,
  '' AS linea2,
  'Conclusión: Precios similares en la región (+/- 5%)' AS conclusion;
