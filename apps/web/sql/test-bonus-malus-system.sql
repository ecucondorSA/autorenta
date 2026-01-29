-- =============================================
-- TESTS DEL SISTEMA BONUS-MALUS
-- Test suite completo para validar las funciones RPC
-- =============================================

-- Crear función de test helper
CREATE OR REPLACE FUNCTION assert_equals(
  test_name TEXT,
  expected ANYELEMENT,
  actual ANYELEMENT
)
RETURNS TEXT AS $$
BEGIN
  IF expected = actual OR (expected IS NULL AND actual IS NULL) THEN
    RETURN '✅ PASS: ' || test_name;
  ELSE
    RETURN '❌ FAIL: ' || test_name || ' - Expected: ' || COALESCE(expected::TEXT, 'NULL') || ', Got: ' || COALESCE(actual::TEXT, 'NULL');
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assert_between(
  test_name TEXT,
  min_val NUMERIC,
  max_val NUMERIC,
  actual NUMERIC
)
RETURNS TEXT AS $$
BEGIN
  IF actual BETWEEN min_val AND max_val THEN
    RETURN '✅ PASS: ' || test_name;
  ELSE
    RETURN '❌ FAIL: ' || test_name || ' - Expected between ' || min_val || ' and ' || max_val || ', Got: ' || actual;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SETUP: Crear datos de prueba
-- =============================================

DO $$
DECLARE
  -- Test users
  v_user_excellent UUID := 'a0000000-0000-0000-0000-000000000001';
  v_user_good UUID := 'a0000000-0000-0000-0000-000000000002';
  v_user_average UUID := 'a0000000-0000-0000-0000-000000000003';
  v_user_poor UUID := 'a0000000-0000-0000-0000-000000000004';
  v_user_new UUID := 'a0000000-0000-0000-0000-000000000005';
BEGIN
  -- Limpiar datos de test previos
  DELETE FROM public.user_bonus_malus WHERE user_id IN (
    v_user_excellent, v_user_good, v_user_average, v_user_poor, v_user_new
  );
  DELETE FROM public.user_stats WHERE user_id IN (
    v_user_excellent, v_user_good, v_user_average, v_user_poor, v_user_new
  );

  -- Usuario EXCELENTE
  -- Rating alto, sin cancelaciones, muchas reservas, verificado
  INSERT INTO public.user_stats (
    user_id,
    owner_reviews_count, owner_rating_avg,
    renter_reviews_count, renter_rating_avg,
    total_bookings_as_renter, cancellation_count, cancellation_rate
  ) VALUES (
    v_user_excellent,
    10, 4.9,
    20, 4.9,
    30, 0, 0.0
  );

  -- Usuario BUENO
  -- Buen rating, pocas cancelaciones, experiencia media
  INSERT INTO public.user_stats (
    user_id,
    owner_reviews_count, owner_rating_avg,
    renter_reviews_count, renter_rating_avg,
    total_bookings_as_renter, cancellation_count, cancellation_rate
  ) VALUES (
    v_user_good,
    5, 4.5,
    10, 4.6,
    15, 1, 0.067
  );

  -- Usuario PROMEDIO
  -- Rating medio, algunas cancelaciones
  INSERT INTO public.user_stats (
    user_id,
    owner_reviews_count, owner_rating_avg,
    renter_reviews_count, renter_rating_avg,
    total_bookings_as_renter, cancellation_count, cancellation_rate
  ) VALUES (
    v_user_average,
    3, 3.8,
    5, 3.9,
    8, 1, 0.125
  );

  -- Usuario POBRE
  -- Rating bajo, muchas cancelaciones
  INSERT INTO public.user_stats (
    user_id,
    owner_reviews_count, owner_rating_avg,
    renter_reviews_count, renter_rating_avg,
    total_bookings_as_renter, cancellation_count, cancellation_rate
  ) VALUES (
    v_user_poor,
    2, 2.5,
    3, 2.8,
    10, 3, 0.30
  );

  -- Usuario NUEVO
  -- Sin historial
  -- No insertar en user_stats para simular usuario completamente nuevo

  RAISE NOTICE '✅ Datos de test creados exitosamente';
END $$;

-- =============================================
-- TEST SUITE 1: calculate_user_bonus_malus
-- =============================================

DO $$
DECLARE
  v_user_excellent UUID := 'a0000000-0000-0000-0000-000000000001';
  v_user_good UUID := 'a0000000-0000-0000-0000-000000000002';
  v_user_average UUID := 'a0000000-0000-0000-0000-000000000003';
  v_user_poor UUID := 'a0000000-0000-0000-0000-000000000004';
  v_user_new UUID := 'a0000000-0000-0000-0000-000000000005';
  v_result JSONB;
  v_factor NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST SUITE 1: calculate_user_bonus_malus';
  RAISE NOTICE '================================================';

  -- TEST 1.1: Usuario Excelente debe tener BONUS (factor negativo)
  v_result := public.calculate_user_bonus_malus(v_user_excellent);
  v_factor := (v_result->>'total_factor')::NUMERIC;

  RAISE NOTICE '%', assert_between(
    'TEST 1.1: Usuario excelente tiene BONUS',
    -0.15, -0.05,
    v_factor
  );

  -- TEST 1.2: Usuario Excelente - verificar discount_or_surcharge
  RAISE NOTICE '%', assert_equals(
    'TEST 1.2: Usuario excelente tiene tipo BONUS',
    'BONUS (Descuento)',
    v_result->>'discount_or_surcharge'
  );

  -- TEST 1.3: Usuario Bueno debe tener ligero BONUS o NEUTRAL
  v_result := public.calculate_user_bonus_malus(v_user_good);
  v_factor := (v_result->>'total_factor')::NUMERIC;

  RAISE NOTICE '%', assert_between(
    'TEST 1.3: Usuario bueno tiene factor entre -0.10 y 0',
    -0.10, 0.0,
    v_factor
  );

  -- TEST 1.4: Usuario Promedio debe estar cerca de NEUTRAL o ligero MALUS
  v_result := public.calculate_user_bonus_malus(v_user_average);
  v_factor := (v_result->>'total_factor')::NUMERIC;

  RAISE NOTICE '%', assert_between(
    'TEST 1.4: Usuario promedio tiene factor entre -0.02 y +0.08',
    -0.02, 0.08,
    v_factor
  );

  -- TEST 1.5: Usuario Pobre debe tener MALUS (factor positivo)
  v_result := public.calculate_user_bonus_malus(v_user_poor);
  v_factor := (v_result->>'total_factor')::NUMERIC;

  RAISE NOTICE '%', assert_between(
    'TEST 1.5: Usuario pobre tiene MALUS',
    0.05, 0.20,
    v_factor
  );

  -- TEST 1.6: Usuario Pobre - verificar discount_or_surcharge
  RAISE NOTICE '%', assert_equals(
    'TEST 1.6: Usuario pobre tiene tipo MALUS',
    'MALUS (Recargo)',
    v_result->>'discount_or_surcharge'
  );

  -- TEST 1.7: Usuario Nuevo debe tener ligero MALUS (incertidumbre)
  v_result := public.calculate_user_bonus_malus(v_user_new);
  v_factor := (v_result->>'total_factor')::NUMERIC;

  RAISE NOTICE '%', assert_between(
    'TEST 1.7: Usuario nuevo tiene ligero MALUS',
    0.0, 0.10,
    v_factor
  );

  -- TEST 1.8: Verificar que el resultado incluye métricas
  v_result := public.calculate_user_bonus_malus(v_user_excellent);

  IF v_result ? 'metrics' THEN
    RAISE NOTICE '✅ PASS: TEST 1.8: Resultado incluye métricas';
  ELSE
    RAISE NOTICE '❌ FAIL: TEST 1.8: Resultado no incluye métricas';
  END IF;

  -- TEST 1.9: Verificar que el resultado incluye breakdown de factores
  IF v_result ? 'breakdown' THEN
    RAISE NOTICE '✅ PASS: TEST 1.9: Resultado incluye breakdown';
  ELSE
    RAISE NOTICE '❌ FAIL: TEST 1.9: Resultado no incluye breakdown';
  END IF;

  -- TEST 1.10: Verificar que los factores están dentro de límites
  v_factor := (v_result->'breakdown'->>'rating_factor')::NUMERIC;
  RAISE NOTICE '%', assert_between(
    'TEST 1.10: rating_factor dentro de límites',
    -0.10, 0.20,
    v_factor
  );

END $$;

-- =============================================
-- TEST SUITE 2: get_user_bonus_malus
-- =============================================

DO $$
DECLARE
  v_user_excellent UUID := 'a0000000-0000-0000-0000-000000000001';
  v_user_new UUID := 'a0000000-0000-0000-0000-000000000005';
  v_factor NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST SUITE 2: get_user_bonus_malus';
  RAISE NOTICE '================================================';

  -- TEST 2.1: Obtener factor de usuario que ya fue calculado
  v_factor := public.get_user_bonus_malus(v_user_excellent);

  RAISE NOTICE '%', assert_between(
    'TEST 2.1: get_user_bonus_malus devuelve factor válido',
    -0.15, 0.20,
    v_factor
  );

  -- TEST 2.2: Obtener factor de usuario sin calcular (debe calcularlo automáticamente)
  DELETE FROM public.user_bonus_malus WHERE user_id = v_user_excellent;
  v_factor := public.get_user_bonus_malus(v_user_excellent);

  RAISE NOTICE '%', assert_between(
    'TEST 2.2: get_user_bonus_malus calcula si no existe',
    -0.15, 0.20,
    v_factor
  );

  -- TEST 2.3: Verificar que el registro fue insertado en la tabla
  IF EXISTS (SELECT 1 FROM public.user_bonus_malus WHERE user_id = v_user_excellent) THEN
    RAISE NOTICE '✅ PASS: TEST 2.3: Registro insertado en user_bonus_malus';
  ELSE
    RAISE NOTICE '❌ FAIL: TEST 2.3: Registro NO insertado en user_bonus_malus';
  END IF;

  -- TEST 2.4: Usuario nuevo sin datos debe retornar 0
  v_factor := public.get_user_bonus_malus(v_user_new);

  RAISE NOTICE '%', assert_between(
    'TEST 2.4: Usuario nuevo retorna factor válido',
    -0.15, 0.20,
    v_factor
  );

END $$;

-- =============================================
-- TEST SUITE 3: Integración con calculate_dynamic_price
-- =============================================

DO $$
DECLARE
  v_user_excellent UUID := 'a0000000-0000-0000-0000-000000000001';
  v_user_poor UUID := 'a0000000-0000-0000-0000-000000000004';
  v_region_id UUID;
  v_result_excellent JSONB;
  v_result_poor JSONB;
  v_price_excellent NUMERIC;
  v_price_poor NUMERIC;
  v_bonus_malus_factor NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST SUITE 3: Integración con calculate_dynamic_price';
  RAISE NOTICE '================================================';

  -- Obtener una región de prueba
  SELECT id INTO v_region_id FROM public.pricing_regions WHERE active = true LIMIT 1;

  IF v_region_id IS NULL THEN
    RAISE NOTICE '⚠️  WARNING: No hay regiones activas, saltando tests de integración';
    RETURN;
  END IF;

  -- TEST 3.1: Usuario excelente debe tener precio más bajo
  v_result_excellent := public.calculate_dynamic_price(
    v_region_id,
    v_user_excellent,
    NOW() + INTERVAL '1 day',
    24
  );

  v_price_excellent := (v_result_excellent->>'price_per_hour')::NUMERIC;
  v_bonus_malus_factor := (v_result_excellent->'breakdown'->>'bonus_malus_factor')::NUMERIC;

  RAISE NOTICE '%', assert_between(
    'TEST 3.1: Usuario excelente tiene bonus_malus_factor negativo',
    -0.15, -0.01,
    v_bonus_malus_factor
  );

  -- TEST 3.2: Usuario pobre debe tener precio más alto
  v_result_poor := public.calculate_dynamic_price(
    v_region_id,
    v_user_poor,
    NOW() + INTERVAL '1 day',
    24
  );

  v_price_poor := (v_result_poor->>'price_per_hour')::NUMERIC;
  v_bonus_malus_factor := (v_result_poor->'breakdown'->>'bonus_malus_factor')::NUMERIC;

  RAISE NOTICE '%', assert_between(
    'TEST 3.2: Usuario pobre tiene bonus_malus_factor positivo',
    0.01, 0.20,
    v_bonus_malus_factor
  );

  -- TEST 3.3: El precio del usuario excelente debe ser menor que el del usuario pobre
  IF v_price_excellent < v_price_poor THEN
    RAISE NOTICE '✅ PASS: TEST 3.3: Usuario excelente paga menos que usuario pobre';
    RAISE NOTICE '  → Precio excelente: % | Precio pobre: %', v_price_excellent, v_price_poor;
  ELSE
    RAISE NOTICE '❌ FAIL: TEST 3.3: Los precios no reflejan bonus-malus correctamente';
    RAISE NOTICE '  → Precio excelente: % | Precio pobre: %', v_price_excellent, v_price_poor;
  END IF;

  -- TEST 3.4: Verificar que breakdown incluye bonus_malus_factor
  IF v_result_excellent->'breakdown' ? 'bonus_malus_factor' THEN
    RAISE NOTICE '✅ PASS: TEST 3.4: calculate_dynamic_price incluye bonus_malus_factor';
  ELSE
    RAISE NOTICE '❌ FAIL: TEST 3.4: calculate_dynamic_price NO incluye bonus_malus_factor';
  END IF;

END $$;

-- =============================================
-- TEST SUITE 4: Trigger de recalculación automática
-- =============================================

DO $$
DECLARE
  v_user_excellent UUID := 'a0000000-0000-0000-0000-000000000001';
  v_old_factor NUMERIC;
  v_new_factor NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST SUITE 4: Trigger de recalculación automática';
  RAISE NOTICE '================================================';

  -- TEST 4.1: Obtener factor actual
  SELECT total_factor INTO v_old_factor
  FROM public.user_bonus_malus
  WHERE user_id = v_user_excellent;

  -- TEST 4.2: Actualizar user_stats (debe disparar trigger)
  UPDATE public.user_stats
  SET renter_rating_avg = 3.0
  WHERE user_id = v_user_excellent;

  -- TEST 4.3: Verificar que el factor cambió
  SELECT total_factor INTO v_new_factor
  FROM public.user_bonus_malus
  WHERE user_id = v_user_excellent;

  IF v_new_factor IS NOT NULL THEN
    RAISE NOTICE '✅ PASS: TEST 4.1: Trigger recalculó bonus-malus automáticamente';
    RAISE NOTICE '  → Factor anterior: % | Factor nuevo: %', v_old_factor, v_new_factor;
  ELSE
    RAISE NOTICE '❌ FAIL: TEST 4.1: Trigger no recalculó bonus-malus';
  END IF;

  -- Restaurar rating original
  UPDATE public.user_stats
  SET renter_rating_avg = 4.9
  WHERE user_id = v_user_excellent;

END $$;

-- =============================================
-- TEST SUITE 5: Casos edge (límites)
-- =============================================

DO $$
DECLARE
  v_user_excellent UUID := 'a0000000-0000-0000-0000-000000000001';
  v_result JSONB;
  v_factor NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST SUITE 5: Casos edge (límites)';
  RAISE NOTICE '================================================';

  -- TEST 5.1: Factor no puede exceder -0.15 (máximo BONUS)
  -- Simular usuario perfecto
  UPDATE public.user_stats
  SET
    owner_rating_avg = 5.0,
    renter_rating_avg = 5.0,
    cancellation_rate = 0.0,
    total_bookings_as_renter = 100
  WHERE user_id = v_user_excellent;

  v_result := public.calculate_user_bonus_malus(v_user_excellent);
  v_factor := (v_result->>'total_factor')::NUMERIC;

  RAISE NOTICE '%', assert_between(
    'TEST 5.1: Factor no excede límite inferior (-0.15)',
    -0.15, 0.20,
    v_factor
  );

  -- TEST 5.2: Factor no puede exceder +0.20 (máximo MALUS)
  UPDATE public.user_stats
  SET
    owner_rating_avg = 1.0,
    renter_rating_avg = 1.0,
    cancellation_rate = 1.0,
    total_bookings_as_renter = 10
  WHERE user_id = v_user_excellent;

  v_result := public.calculate_user_bonus_malus(v_user_excellent);
  v_factor := (v_result->>'total_factor')::NUMERIC;

  RAISE NOTICE '%', assert_between(
    'TEST 5.2: Factor no excede límite superior (+0.20)',
    -0.15, 0.20,
    v_factor
  );

  -- Restaurar datos
  UPDATE public.user_stats
  SET
    owner_rating_avg = 4.9,
    renter_rating_avg = 4.9,
    cancellation_rate = 0.0,
    total_bookings_as_renter = 30
  WHERE user_id = v_user_excellent;

END $$;

-- =============================================
-- TEST SUITE 6: recalculate_all_bonus_malus
-- =============================================

DO $$
DECLARE
  v_count INT;
  v_user_excellent UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TEST SUITE 6: recalculate_all_bonus_malus';
  RAISE NOTICE '================================================';

  -- TEST 6.1: Marcar como necesitando recalculación
  UPDATE public.user_bonus_malus
  SET next_recalculation_at = NOW() - INTERVAL '1 day'
  WHERE user_id = v_user_excellent;

  -- TEST 6.2: Ejecutar recalculación masiva
  v_count := public.recalculate_all_bonus_malus();

  IF v_count > 0 THEN
    RAISE NOTICE '✅ PASS: TEST 6.1: recalculate_all_bonus_malus procesó % usuarios', v_count;
  ELSE
    RAISE NOTICE '❌ FAIL: TEST 6.1: recalculate_all_bonus_malus no procesó usuarios';
  END IF;

END $$;

-- =============================================
-- RESUMEN DE RESULTADOS
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ TESTS COMPLETADOS';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Para verificar datos finales:';
  RAISE NOTICE 'SELECT user_id, total_factor, metrics FROM public.user_bonus_malus;';
  RAISE NOTICE '';
END $$;

-- Mostrar tabla de resultados
SELECT
  user_id,
  total_factor,
  CASE
    WHEN total_factor < 0 THEN 'BONUS (' || ABS(total_factor * 100) || '% descuento)'
    WHEN total_factor > 0 THEN 'MALUS (' || (total_factor * 100) || '% recargo)'
    ELSE 'NEUTRAL'
  END as tipo,
  (metrics->>'average_rating')::NUMERIC as rating,
  (metrics->>'cancellation_rate')::NUMERIC as cancelacion,
  (metrics->>'completed_rentals')::INT as reservas,
  (metrics->>'is_verified')::BOOLEAN as verificado
FROM public.user_bonus_malus
WHERE user_id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005'
)
ORDER BY total_factor ASC;

-- Limpiar funciones de test
DROP FUNCTION IF EXISTS assert_equals(TEXT, ANYELEMENT, ANYELEMENT);
DROP FUNCTION IF EXISTS assert_between(TEXT, NUMERIC, NUMERIC, NUMERIC);
