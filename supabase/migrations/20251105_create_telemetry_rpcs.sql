-- ============================================================================
-- AUTORENTA - RPC FUNCTIONS: TELEMETRY SYSTEM
-- ============================================================================
-- Created: 2025-11-05
-- Purpose: Funciones RPC para sistema telemático de conducción
-- ============================================================================
--
-- SISTEMA TELEMÁTICO:
-- - Recolecta datos de conducción (GPS, acelerómetro, velocidad)
-- - Calcula score de conducción (0-100)
-- - Influye en ajuste de fee (±5%)
-- - Se actualiza después de cada viaje
--
-- MÉTRICAS EVALUADAS:
-- - Frenadas bruscas (hard_brakes)
-- - Excesos de velocidad (speed_violations)
-- - Conducción nocturna (night_driving_hours)
-- - Zonas de riesgo visitadas (risk_zones_visited)
--
-- SCORE CALCULATION:
-- - Base: 100 puntos
-- - Penalización por frenadas bruscas: -2 pts cada una
-- - Penalización por excesos de velocidad: -3 pts cada uno
-- - Penalización por hora nocturna: -1 pt por hora
-- - Penalización por zona de riesgo: -5 pts por zona
-- - Mínimo: 0, Máximo: 100
--
-- FUNCIONES INCLUIDAS:
-- 1. record_telemetry(booking_id, telemetry_data) - Registra datos telemáticos
-- 2. calculate_telemetry_score(user_id, booking_id) - Calcula score del viaje
-- 3. get_driver_telemetry_average(user_id, months) - Obtiene promedio de últimos N meses
-- 4. recalculate_all_driver_scores() - Job mensual: recalcula todos los scores
-- 5. get_telemetry_history(user_id, limit) - Obtiene historial de viajes
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. RECORD_TELEMETRY
-- ============================================================================
-- Registra datos telemáticos de un viaje

CREATE OR REPLACE FUNCTION record_telemetry(
  p_booking_id UUID,
  p_telemetry_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_telemetry_id UUID;
  v_total_km DECIMAL(10,2);
  v_hard_brakes INT;
  v_speed_violations INT;
  v_night_driving_hours DECIMAL(5,2);
  v_risk_zones_visited INT;
  v_calculated_score INT;
BEGIN
  -- Obtener información del booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking no encontrado: %', p_booking_id;
  END IF;

  -- Validar que el booking esté completado
  IF v_booking.status != 'completed' THEN
    RAISE EXCEPTION 'Solo se pueden registrar datos telemáticos de bookings completados';
  END IF;

  -- Extraer datos del JSON (con valores por defecto)
  v_total_km := COALESCE((p_telemetry_data->>'total_km')::DECIMAL, 0);
  v_hard_brakes := COALESCE((p_telemetry_data->>'hard_brakes')::INT, 0);
  v_speed_violations := COALESCE((p_telemetry_data->>'speed_violations')::INT, 0);
  v_night_driving_hours := COALESCE((p_telemetry_data->>'night_driving_hours')::DECIMAL, 0);
  v_risk_zones_visited := COALESCE((p_telemetry_data->>'risk_zones_visited')::INT, 0);

  -- Validar que no exista ya telemetría para este booking
  IF EXISTS (SELECT 1 FROM driver_telemetry WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'Ya existe telemetría registrada para este booking';
  END IF;

  -- Calcular score del viaje
  v_calculated_score := calculate_trip_score(
    v_total_km,
    v_hard_brakes,
    v_speed_violations,
    v_night_driving_hours,
    v_risk_zones_visited
  );

  -- Insertar datos telemáticos
  INSERT INTO driver_telemetry (
    id,
    user_id,
    booking_id,
    trip_date,
    total_km,
    hard_brakes,
    speed_violations,
    night_driving_hours,
    risk_zones_visited,
    driver_score,
    raw_data,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_booking.renter_id,
    p_booking_id,
    NOW(),
    v_total_km,
    v_hard_brakes,
    v_speed_violations,
    v_night_driving_hours,
    v_risk_zones_visited,
    v_calculated_score,
    p_telemetry_data,
    NOW()
  ) RETURNING id INTO v_telemetry_id;

  -- Actualizar driver_score en el perfil (promedio de últimos 3 meses)
  UPDATE driver_risk_profile
  SET
    driver_score = (
      SELECT ROUND(AVG(driver_score))::INT
      FROM driver_telemetry
      WHERE user_id = v_booking.renter_id
      AND trip_date >= NOW() - INTERVAL '3 months'
    ),
    updated_at = NOW()
  WHERE user_id = v_booking.renter_id;

  RAISE NOTICE 'Telemetría registrada para booking %. Score: %', p_booking_id, v_calculated_score;
  RETURN v_telemetry_id;
END;
$$;

COMMENT ON FUNCTION record_telemetry IS
  'Registra datos telemáticos de un viaje completado y actualiza driver_score promedio';

-- ============================================================================
-- 2. CALCULATE_TRIP_SCORE (Helper Function)
-- ============================================================================
-- Calcula el score de un viaje basado en métricas

CREATE OR REPLACE FUNCTION calculate_trip_score(
  p_total_km DECIMAL,
  p_hard_brakes INT,
  p_speed_violations INT,
  p_night_driving_hours DECIMAL,
  p_risk_zones_visited INT
)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_score INT;
  v_normalized_hard_brakes INT;
  v_normalized_speed_violations INT;
BEGIN
  -- Comenzar con score perfecto
  v_score := 100;

  -- Normalizar métricas por cada 100km (si el viaje es muy corto, penalizar menos)
  IF p_total_km > 0 THEN
    v_normalized_hard_brakes := ROUND((p_hard_brakes::DECIMAL / p_total_km) * 100)::INT;
    v_normalized_speed_violations := ROUND((p_speed_violations::DECIMAL / p_total_km) * 100)::INT;
  ELSE
    v_normalized_hard_brakes := p_hard_brakes;
    v_normalized_speed_violations := p_speed_violations;
  END IF;

  -- Penalizaciones:
  -- 1. Frenadas bruscas: -2 puntos por cada una (normalizado por 100km)
  v_score := v_score - (v_normalized_hard_brakes * 2);

  -- 2. Excesos de velocidad: -3 puntos por cada uno (normalizado por 100km)
  v_score := v_score - (v_normalized_speed_violations * 3);

  -- 3. Conducción nocturna: -1 punto por hora
  v_score := v_score - ROUND(p_night_driving_hours)::INT;

  -- 4. Zonas de riesgo: -5 puntos por zona
  v_score := v_score - (p_risk_zones_visited * 5);

  -- Asegurar rango 0-100
  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN v_score;
END;
$$;

COMMENT ON FUNCTION calculate_trip_score IS
  'Calcula score de conducción (0-100) basado en métricas del viaje';

-- ============================================================================
-- 3. GET_DRIVER_TELEMETRY_AVERAGE
-- ============================================================================
-- Obtiene promedio de score telemático de últimos N meses

CREATE OR REPLACE FUNCTION get_driver_telemetry_average(
  p_user_id UUID,
  p_months INT DEFAULT 3
)
RETURNS TABLE (
  avg_score NUMERIC,
  total_trips INT,
  total_km NUMERIC,
  total_hard_brakes BIGINT,
  total_speed_violations BIGINT,
  total_night_hours NUMERIC,
  total_risk_zones BIGINT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
BEGIN
  v_period_start := NOW() - (p_months || ' months')::INTERVAL;

  RETURN QUERY
  SELECT
    ROUND(AVG(dt.driver_score), 1) AS avg_score,
    COUNT(*)::INT AS total_trips,
    SUM(dt.total_km) AS total_km,
    SUM(dt.hard_brakes) AS total_hard_brakes,
    SUM(dt.speed_violations) AS total_speed_violations,
    SUM(dt.night_driving_hours) AS total_night_hours,
    SUM(dt.risk_zones_visited) AS total_risk_zones,
    v_period_start,
    NOW()
  FROM driver_telemetry dt
  WHERE dt.user_id = p_user_id
  AND dt.trip_date >= v_period_start;
END;
$$;

COMMENT ON FUNCTION get_driver_telemetry_average IS
  'Obtiene estadísticas telemáticas promedio de últimos N meses';

-- ============================================================================
-- 4. CALCULATE_TELEMETRY_SCORE (Alias for backward compatibility)
-- ============================================================================
-- Calcula score telemático para un booking específico

CREATE OR REPLACE FUNCTION calculate_telemetry_score(
  p_user_id UUID,
  p_booking_id UUID
)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INT;
BEGIN
  -- Obtener score del viaje
  SELECT driver_score INTO v_score
  FROM driver_telemetry
  WHERE user_id = p_user_id
  AND booking_id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró telemetría para booking %', p_booking_id;
  END IF;

  RETURN v_score;
END;
$$;

COMMENT ON FUNCTION calculate_telemetry_score IS
  'Obtiene score telemático de un booking específico';

-- ============================================================================
-- 5. RECALCULATE_ALL_DRIVER_SCORES
-- ============================================================================
-- Job mensual: recalcula driver_score promedio de todos los conductores

CREATE OR REPLACE FUNCTION recalculate_all_driver_scores()
RETURNS TABLE (
  users_updated INT,
  avg_score_change NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users_updated INT := 0;
  v_total_change NUMERIC := 0;
  rec RECORD;
BEGIN
  -- Iterar sobre todos los conductores con datos telemáticos
  FOR rec IN
    SELECT DISTINCT user_id
    FROM driver_telemetry
    WHERE trip_date >= NOW() - INTERVAL '3 months'
  LOOP
    -- Calcular nuevo promedio
    UPDATE driver_risk_profile drp
    SET
      driver_score = (
        SELECT ROUND(AVG(driver_score))::INT
        FROM driver_telemetry dt
        WHERE dt.user_id = rec.user_id
        AND dt.trip_date >= NOW() - INTERVAL '3 months'
      ),
      updated_at = NOW()
    WHERE drp.user_id = rec.user_id;

    v_users_updated := v_users_updated + 1;
  END LOOP;

  RAISE NOTICE 'Scores telemáticos recalculados para % usuarios', v_users_updated;

  RETURN QUERY SELECT v_users_updated, 0::NUMERIC;
END;
$$;

COMMENT ON FUNCTION recalculate_all_driver_scores IS
  'Job mensual: recalcula driver_score promedio de todos los conductores (últimos 3 meses)';

-- ============================================================================
-- 6. GET_TELEMETRY_HISTORY
-- ============================================================================
-- Obtiene historial de telemetría de un conductor

CREATE OR REPLACE FUNCTION get_telemetry_history(
  p_user_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  telemetry_id UUID,
  booking_id UUID,
  trip_date TIMESTAMPTZ,
  total_km DECIMAL(10,2),
  driver_score INT,
  hard_brakes INT,
  speed_violations INT,
  night_driving_hours DECIMAL(5,2),
  risk_zones_visited INT,
  car_title TEXT,
  car_brand TEXT,
  car_model TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dt.id,
    dt.booking_id,
    dt.trip_date,
    dt.total_km,
    dt.driver_score,
    dt.hard_brakes,
    dt.speed_violations,
    dt.night_driving_hours,
    dt.risk_zones_visited,
    c.title,
    c.brand,
    c.model
  FROM driver_telemetry dt
  LEFT JOIN bookings b ON dt.booking_id = b.id
  LEFT JOIN cars c ON b.car_id = c.id
  WHERE dt.user_id = p_user_id
  ORDER BY dt.trip_date DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_telemetry_history IS
  'Obtiene historial de viajes con datos telemáticos y score';

-- ============================================================================
-- 7. GET_TELEMETRY_INSIGHTS
-- ============================================================================
-- Genera insights y recomendaciones basadas en telemetría

CREATE OR REPLACE FUNCTION get_telemetry_insights(
  p_user_id UUID
)
RETURNS TABLE (
  current_score INT,
  score_trend TEXT,
  main_issue TEXT,
  recommendation TEXT,
  trips_analyzed INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_recent_avg NUMERIC;
  v_older_avg NUMERIC;
  v_score_trend TEXT;
  v_main_issue TEXT;
  v_recommendation TEXT;
  v_trips_count INT;
  v_avg_hard_brakes NUMERIC;
  v_avg_speed_violations NUMERIC;
  v_avg_night_hours NUMERIC;
  v_avg_risk_zones NUMERIC;
BEGIN
  -- Obtener perfil actual
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado para usuario %', p_user_id;
  END IF;

  -- Contar viajes analizados
  SELECT COUNT(*) INTO v_trips_count
  FROM driver_telemetry
  WHERE user_id = p_user_id
  AND trip_date >= NOW() - INTERVAL '3 months';

  IF v_trips_count = 0 THEN
    RETURN QUERY SELECT
      v_profile.driver_score,
      'Sin datos'::TEXT,
      'Sin datos suficientes'::TEXT,
      'Completa más viajes para obtener análisis'::TEXT,
      0;
    RETURN;
  END IF;

  -- Calcular promedios recientes (último mes)
  SELECT
    AVG(driver_score),
    AVG(hard_brakes),
    AVG(speed_violations),
    AVG(night_driving_hours),
    AVG(risk_zones_visited)
  INTO
    v_recent_avg,
    v_avg_hard_brakes,
    v_avg_speed_violations,
    v_avg_night_hours,
    v_avg_risk_zones
  FROM driver_telemetry
  WHERE user_id = p_user_id
  AND trip_date >= NOW() - INTERVAL '1 month';

  -- Calcular promedio anterior (mes anterior)
  SELECT AVG(driver_score) INTO v_older_avg
  FROM driver_telemetry
  WHERE user_id = p_user_id
  AND trip_date >= NOW() - INTERVAL '2 months'
  AND trip_date < NOW() - INTERVAL '1 month';

  -- Determinar tendencia
  IF v_older_avg IS NULL THEN
    v_score_trend := 'Sin histórico';
  ELSIF v_recent_avg > v_older_avg + 5 THEN
    v_score_trend := 'Mejorando ↗';
  ELSIF v_recent_avg < v_older_avg - 5 THEN
    v_score_trend := 'Empeorando ↘';
  ELSE
    v_score_trend := 'Estable →';
  END IF;

  -- Identificar problema principal
  IF v_avg_speed_violations > 2 THEN
    v_main_issue := 'Excesos de velocidad frecuentes';
    v_recommendation := 'Respeta los límites de velocidad para mejorar tu score';
  ELSIF v_avg_hard_brakes > 3 THEN
    v_main_issue := 'Frenadas bruscas frecuentes';
    v_recommendation := 'Mantén distancia de seguridad y anticipa las frenadas';
  ELSIF v_avg_night_hours > 4 THEN
    v_main_issue := 'Mucha conducción nocturna';
    v_recommendation := 'Evita conducir de noche cuando sea posible';
  ELSIF v_avg_risk_zones > 1 THEN
    v_main_issue := 'Visitas a zonas de riesgo';
    v_recommendation := 'Planifica rutas más seguras';
  ELSE
    v_main_issue := 'Conducción adecuada';
    v_recommendation := '¡Sigue así! Tu conducción es excelente';
  END IF;

  RETURN QUERY SELECT
    v_profile.driver_score,
    v_score_trend,
    v_main_issue,
    v_recommendation,
    v_trips_count;
END;
$$;

COMMENT ON FUNCTION get_telemetry_insights IS
  'Genera insights y recomendaciones personalizadas basadas en telemetría';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Authenticated users can record and view their own telemetry
GRANT EXECUTE ON FUNCTION record_telemetry(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_telemetry_score(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_driver_telemetry_average(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_telemetry_history(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_telemetry_insights(UUID) TO authenticated;

-- Service role can recalculate all scores (monthly job)
GRANT EXECUTE ON FUNCTION recalculate_all_driver_scores() TO service_role;

-- Helper function is internal only
GRANT EXECUTE ON FUNCTION calculate_trip_score(DECIMAL, INT, INT, DECIMAL, INT) TO authenticated, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Telemetry RPCs creadas correctamente';
  RAISE NOTICE '   - record_telemetry(booking_id, telemetry_data)';
  RAISE NOTICE '   - calculate_trip_score(total_km, hard_brakes, ...)';
  RAISE NOTICE '   - calculate_telemetry_score(user_id, booking_id)';
  RAISE NOTICE '   - get_driver_telemetry_average(user_id, months)';
  RAISE NOTICE '   - recalculate_all_driver_scores()';
  RAISE NOTICE '   - get_telemetry_history(user_id, limit)';
  RAISE NOTICE '   - get_telemetry_insights(user_id)';
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
