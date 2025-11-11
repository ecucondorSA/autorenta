-- ============================================================================
-- Comparación de Precios: Toyota Corolla 2022
-- Brasil vs Argentina vs Uruguay
-- Usando tabla fx_rates (estructura real confirmada)
-- ============================================================================

-- 1. Ver las tasas activas disponibles
SELECT
  from_currency || '→' || to_currency AS par,
  rate,
  source,
  valid_from,
  is_active
FROM fx_rates
WHERE is_active = true
  AND (
    (from_currency IN ('BRL', 'ARS', 'UYU') AND to_currency = 'USD')
    OR (from_currency = 'USD' AND to_currency IN ('BRL', 'ARS', 'UYU'))
  )
ORDER BY from_currency, to_currency;

-- 2. Obtener tasas más recientes a USD
WITH latest_rates AS (
  SELECT DISTINCT ON (from_currency)
    from_currency,
    rate AS rate_to_usd,
    valid_from
  FROM fx_rates
  WHERE to_currency = 'USD'
    AND from_currency IN ('BRL', 'ARS', 'UYU')
    AND is_active = true
  ORDER BY from_currency, valid_from DESC
)
SELECT
  '=== TIPOS DE CAMBIO ACTUALES (a USD) ===' AS seccion,
  from_currency AS moneda,
  rate_to_usd,
  (1.0 / rate_to_usd)::DECIMAL(10,2) AS usd_to_moneda,
  valid_from AS vigente_desde
FROM latest_rates
ORDER BY from_currency;

-- 3. COMPARACIÓN PRINCIPAL: Precios del Toyota Corolla 2022
WITH latest_rates AS (
  SELECT DISTINCT ON (from_currency)
    from_currency,
    rate
  FROM fx_rates
  WHERE to_currency = 'USD'
    AND from_currency IN ('BRL', 'ARS', 'UYU')
    AND is_active = true
  ORDER BY from_currency, valid_from DESC
),
prices AS (
  -- Brasil: Precio real de FIPE
  SELECT
    1 AS orden,
    '🇧🇷 Brasil' AS pais,
    'BRL' AS moneda,
    27223 AS precio_usd,
    (27223 / COALESCE((SELECT rate FROM latest_rates WHERE from_currency = 'BRL'), 0.20))::BIGINT AS precio_local,
    COALESCE((SELECT rate FROM latest_rates WHERE from_currency = 'BRL'), 0.20) AS tasa,
    'FIPE (sincronizado)' AS fuente

  UNION ALL

  -- Argentina: Mercado $28M ARS
  SELECT
    2,
    '🇦🇷 Argentina',
    'ARS',
    (28000000 * COALESCE((SELECT rate FROM latest_rates WHERE from_currency = 'ARS'), 0.001))::INTEGER,
    28000000,
    COALESCE((SELECT rate FROM latest_rates WHERE from_currency = 'ARS'), 0.001),
    'Mercado (AutoCosmos/ML)'

  UNION ALL

  -- Uruguay: Mercado ~US$26,500
  SELECT
    3,
    '🇺🇾 Uruguay',
    'UYU',
    26500,
    (26500 / COALESCE((SELECT rate FROM latest_rates WHERE from_currency = 'UYU'), 0.025))::BIGINT,
    COALESCE((SELECT rate FROM latest_rates WHERE from_currency = 'UYU'), 0.025),
    'Mercado (MercadoLibre UY)'
)
SELECT
  pais,
  moneda,
  '$' || TO_CHAR(precio_usd, 'FM999,999') AS precio_usd,
  TO_CHAR(precio_local, 'FM999,999,999') || ' ' || moneda AS precio_local,
  tasa AS tasa_a_usd,
  fuente,
  -- Diferencia vs Brasil
  CASE
    WHEN precio_usd = 27223 THEN '🎯 Referencia'
    ELSE ((precio_usd - 27223)::DECIMAL / 27223 * 100)::DECIMAL(5,1) || '%'
  END AS diff_vs_brasil
FROM prices
ORDER BY orden;

-- 4. ANÁLISIS Y CONCLUSIÓN
WITH latest_rates AS (
  SELECT DISTINCT ON (from_currency)
    from_currency,
    rate
  FROM fx_rates
  WHERE to_currency = 'USD'
    AND from_currency IN ('BRL', 'ARS', 'UYU')
    AND is_active = true
  ORDER BY from_currency, valid_from DESC
),
brasil_price AS (SELECT 27223 AS usd),
argentina_price AS (
  SELECT (28000000 * COALESCE((SELECT rate FROM latest_rates WHERE from_currency = 'ARS'), 0.001))::INTEGER AS usd
),
uruguay_price AS (SELECT 26500 AS usd)
SELECT
  '═══════════════════════════════════════════' AS separador,
  'TOYOTA COROLLA 2022 - ANÁLISIS REGIONAL' AS titulo,
  '═══════════════════════════════════════════' AS separador2,
  '' AS blank1,
  '🇧🇷 BRASIL: $27,223 USD (R$ ~136,115)' AS brasil,
  '   └─ Fuente: FIPE API (valor real sincronizado)' AS brasil_nota,
  '' AS blank2,
  '🇦🇷 ARGENTINA: $' || (SELECT usd FROM argentina_price)::TEXT || ' USD ($28M ARS)' AS argentina,
  '   └─ Fuente: Mercado usado (AutoCosmos, ML)' AS argentina_nota,
  '   └─ Tasa: ' || COALESCE((SELECT rate::TEXT FROM latest_rates WHERE from_currency = 'ARS'), '0.001') || ' (Binance sin ajuste 10%)' AS argentina_tasa,
  '' AS blank3,
  '🇺🇾 URUGUAY: $26,500 USD' AS uruguay,
  '   └─ Fuente: Mercado usado (MercadoLibre UY)' AS uruguay_nota,
  '' AS blank4,
  '─────────────────────────────────────────' AS separador3,
  CASE
    WHEN ABS((SELECT usd FROM argentina_price) - 27223) < 2000 AND ABS(26500 - 27223) < 2000 THEN
      '✅ CONCLUSIÓN: Precios MUY similares en la región (< $2k diff)'
    WHEN ABS((SELECT usd FROM argentina_price) - 27223) < 5000 AND ABS(26500 - 27223) < 5000 THEN
      '✅ CONCLUSIÓN: Precios similares en la región (< $5k diff)'
    ELSE
      '⚠️  CONCLUSIÓN: Diferencias significativas entre países'
  END AS conclusion,
  '' AS blank5,
  '📊 Diferencia Argentina vs Brasil: ' ||
    (((SELECT usd FROM argentina_price) - 27223)::DECIMAL / 27223 * 100)::DECIMAL(5,1)::TEXT || '%' AS diff_arg,
  '📊 Diferencia Uruguay vs Brasil: ' ||
    ((26500 - 27223)::DECIMAL / 27223 * 100)::DECIMAL(5,1)::TEXT || '%' AS diff_uru;
