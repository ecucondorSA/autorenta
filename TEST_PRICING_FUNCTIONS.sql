-- ============================================================================
-- TEST DE FUNCIONES DE PRICING - Vehicle-Aware Pricing
-- Prueba las funciones con vehículos reales de tu base de datos
-- ============================================================================

-- ============================================================================
-- TEST 1: Estimar valor de vehículos conocidos
-- ============================================================================

SELECT '=== TEST 1: Estimación de Valores ===' AS test;

-- Probar con modelos conocidos
SELECT
  'Toyota Corolla 2020' AS vehiculo,
  *
FROM estimate_vehicle_value_usd('Toyota', 'Corolla', 2020);

SELECT
  'Fiat Uno 2018' AS vehiculo,
  *
FROM estimate_vehicle_value_usd('Fiat', 'Uno', 2018);

SELECT
  'Mercedes-Benz C-Class 2022' AS vehiculo,
  *
FROM estimate_vehicle_value_usd('Mercedes-Benz', 'C-Class', 2022);

-- ============================================================================
-- TEST 2: Calcular precio base para autos reales de tu base de datos
-- ============================================================================

SELECT '=== TEST 2: Precio Base por Vehículo ===' AS test;

-- Obtener un auto de cada categoría para probar
WITH sample_cars AS (
  SELECT DISTINCT ON (vc.code)
    c.id AS car_id,
    c.brand_text_backup || ' ' || c.model_text_backup || ' ' || c.year AS vehiculo,
    vc.name_es AS categoria,
    COALESCE(c.value_usd, c.estimated_value_usd) AS valor_usd,
    c.region_id
  FROM cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  WHERE c.region_id IS NOT NULL
  ORDER BY vc.code, c.id
  LIMIT 4
)
SELECT
  sc.vehiculo,
  sc.categoria,
  sc.valor_usd,
  calculate_vehicle_base_price(sc.car_id, sc.region_id) AS precio_detallado
FROM sample_cars sc;

-- ============================================================================
-- TEST 3: Precio base simplificado - Comparar Economic vs Luxury
-- ============================================================================

SELECT '=== TEST 3: Comparación Precio Base (Economy vs Luxury) ===' AS test;

WITH comparison AS (
  SELECT DISTINCT ON (vc.code)
    c.id AS car_id,
    c.brand_text_backup || ' ' || c.model_text_backup || ' ' || c.year AS vehiculo,
    vc.name_es AS categoria,
    vc.code AS categoria_code,
    COALESCE(c.value_usd, c.estimated_value_usd) AS valor_usd,
    c.region_id
  FROM cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  WHERE c.region_id IS NOT NULL
    AND vc.code IN ('economy', 'luxury')
  ORDER BY vc.code, c.id
)
SELECT
  vehiculo,
  categoria,
  valor_usd,
  get_vehicle_base_price_simple(car_id, region_id) AS precio_base_por_hora,
  (get_vehicle_base_price_simple(car_id, region_id) * 24)::DECIMAL(10,2) AS precio_base_por_dia
FROM comparison
ORDER BY categoria_code;

-- ============================================================================
-- TEST 4: Pricing Dinámico CON car_id (Vehicle-Aware)
-- ============================================================================

SELECT '=== TEST 4: Pricing Dinámico Vehicle-Aware ===' AS test;

-- Obtener un auto para probar
WITH test_car AS (
  SELECT
    c.id AS car_id,
    c.brand_text_backup || ' ' || c.model_text_backup AS vehiculo,
    c.region_id,
    (SELECT id FROM profiles WHERE role IN ('locatario', 'ambos') LIMIT 1) AS user_id
  FROM cars c
  WHERE c.region_id IS NOT NULL
    AND c.uses_dynamic_pricing = true
  LIMIT 1
)
SELECT
  tc.vehiculo,
  calculate_dynamic_price(
    tc.region_id,
    tc.user_id,
    NOW() + INTERVAL '2 days',  -- Alquiler en 2 días
    24,                          -- 24 horas (1 día)
    tc.car_id                    -- NEW: Vehicle-aware pricing
  ) AS pricing_dinamico
FROM test_car tc;

-- ============================================================================
-- TEST 5: Comparar Pricing Dinámico vs Precio Base Regional
-- ============================================================================

SELECT '=== TEST 5: Vehicle-Aware vs Region-Wide Pricing ===' AS test;

WITH test_data AS (
  SELECT
    c.id AS car_id,
    c.brand_text_backup || ' ' || c.model_text_backup || ' ' || c.year AS vehiculo,
    vc.name_es AS categoria,
    c.region_id,
    pr.base_price_per_hour AS precio_regional_antiguo,
    (SELECT id FROM profiles WHERE role IN ('locatario', 'ambos') LIMIT 1) AS user_id
  FROM cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  JOIN pricing_regions pr ON c.region_id = pr.id
  WHERE c.region_id IS NOT NULL
    AND c.uses_dynamic_pricing = true
  LIMIT 3
)
SELECT
  vehiculo,
  categoria,
  precio_regional_antiguo AS precio_antiguo_por_hora,
  get_vehicle_base_price_simple(car_id, region_id) AS precio_nuevo_base_por_hora,
  (
    calculate_dynamic_price(
      region_id,
      user_id,
      NOW() + INTERVAL '2 days',
      24,
      car_id
    )->>'price_per_hour'
  )::DECIMAL(10,2) AS precio_dinamico_final,
  ROUND(
    (
      (get_vehicle_base_price_simple(car_id, region_id) - precio_regional_antiguo) /
      NULLIF(precio_regional_antiguo, 0) * 100
    )::NUMERIC,
    1
  ) AS cambio_porcentual
FROM test_data;

-- ============================================================================
-- TEST 6: Lock Price for Booking (Vehicle-Aware)
-- ============================================================================

SELECT '=== TEST 6: Lock Price for Booking ===' AS test;

WITH test_car AS (
  SELECT
    c.id AS car_id,
    c.brand_text_backup || ' ' || c.model_text_backup AS vehiculo,
    (SELECT id FROM profiles WHERE role IN ('locatario', 'ambos') LIMIT 1) AS user_id
  FROM cars c
  WHERE c.region_id IS NOT NULL
    AND c.uses_dynamic_pricing = true
  LIMIT 1
)
SELECT
  tc.vehiculo,
  lock_price_for_booking(
    tc.car_id,
    tc.user_id,
    NOW() + INTERVAL '3 days',
    48  -- 48 horas (2 días)
  ) AS price_lock_data
FROM test_car tc;

-- ============================================================================
-- TEST 7: Resumen de Impacto - Antes vs Después
-- ============================================================================

SELECT '=== TEST 7: Resumen de Impacto por Categoría ===' AS test;

SELECT
  vc.name_es AS categoria,
  COUNT(c.id) AS cantidad_autos,
  AVG(COALESCE(c.value_usd, c.estimated_value_usd))::INTEGER AS valor_promedio_usd,
  AVG(pr.base_price_per_hour)::DECIMAL(10,2) AS precio_antiguo_promedio,
  AVG(get_vehicle_base_price_simple(c.id, c.region_id))::DECIMAL(10,2) AS precio_nuevo_promedio,
  ROUND(
    AVG(
      (get_vehicle_base_price_simple(c.id, c.region_id) - pr.base_price_per_hour) /
      NULLIF(pr.base_price_per_hour, 0) * 100
    )::NUMERIC,
    1
  ) AS cambio_promedio_pct
FROM cars c
JOIN vehicle_categories vc ON c.category_id = vc.id
JOIN pricing_regions pr ON c.region_id = pr.id
WHERE c.region_id IS NOT NULL
GROUP BY vc.name_es, vc.display_order
ORDER BY vc.display_order;

-- ============================================================================
-- RESULTADO ESPERADO:
--
-- Economy:   Precio menor que antes (más justo para autos baratos)
-- Standard:  Precio similar al anterior (baseline)
-- Premium:   Precio mayor que antes (corrige subvaluación)
-- Luxury:    Precio mucho mayor que antes (gran corrección)
-- ============================================================================
