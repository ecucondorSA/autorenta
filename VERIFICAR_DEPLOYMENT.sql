-- ============================================================================
-- VERIFICACIÓN DEL DEPLOYMENT - Vehicle-Aware Pricing
-- Ejecuta esto en SQL Editor para verificar que todo está OK
-- ============================================================================

-- 1. Verificar que las tablas existen
SELECT
  'vehicle_categories' AS tabla,
  COUNT(*) AS cantidad
FROM vehicle_categories
UNION ALL
SELECT
  'vehicle_pricing_models' AS tabla,
  COUNT(*) AS cantidad
FROM vehicle_pricing_models
UNION ALL
SELECT
  'cars_con_categoria' AS tabla,
  COUNT(*) AS cantidad
FROM cars
WHERE category_id IS NOT NULL;

-- 2. Ver las 4 categorías
SELECT
  code AS codigo,
  name_es AS nombre,
  base_daily_rate_pct * 100 AS porcentaje_diario,
  depreciation_rate_annual * 100 AS depreciacion_anual,
  surge_sensitivity AS sensibilidad_surge
FROM vehicle_categories
ORDER BY display_order;

-- 3. Ver distribución de autos por categoría
SELECT
  vc.name_es AS categoria,
  COUNT(c.id) AS cantidad_autos,
  MIN(COALESCE(c.value_usd, c.estimated_value_usd)) AS valor_minimo,
  AVG(COALESCE(c.value_usd, c.estimated_value_usd))::INTEGER AS valor_promedio,
  MAX(COALESCE(c.value_usd, c.estimated_value_usd)) AS valor_maximo
FROM cars c
JOIN vehicle_categories vc ON c.category_id = vc.id
GROUP BY vc.name_es, vc.display_order
ORDER BY vc.display_order;

-- 4. Ver algunos modelos de referencia por categoría
SELECT
  vc.name_es AS categoria,
  vpm.brand AS marca,
  vpm.model AS modelo,
  vpm.year_from AS año_desde,
  vpm.base_value_usd AS valor_base
FROM vehicle_pricing_models vpm
JOIN vehicle_categories vc ON vpm.category_id = vc.id
WHERE vpm.brand IN ('Toyota', 'Fiat', 'Mercedes-Benz', 'Chevrolet')
ORDER BY vc.display_order, vpm.base_value_usd DESC
LIMIT 20;

-- 5. Verificar que las funciones existen
SELECT
  routine_name AS funcion,
  routine_type AS tipo
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'estimate_vehicle_value_usd',
    'calculate_vehicle_base_price',
    'get_vehicle_base_price_simple',
    'calculate_dynamic_price',
    'lock_price_for_booking'
  )
ORDER BY routine_name;

-- 6. Ver ejemplo de 5 autos con su categoría y valor estimado
SELECT
  c.brand_text_backup AS marca,
  c.model_text_backup AS modelo,
  c.year AS año,
  vc.name_es AS categoria,
  COALESCE(c.value_usd, c.estimated_value_usd) AS valor_efectivo,
  c.value_usd_source AS fuente_valor
FROM cars c
JOIN vehicle_categories vc ON c.category_id = vc.id
ORDER BY RANDOM()
LIMIT 5;
