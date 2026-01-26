-- ============================================================================
-- MIGRATION: Telemetry RPCs
-- Date: 2025-11-06
-- Purpose: Record and calculate driver telemetry scores from GPS/accelerometer
-- ============================================================================

BEGIN;

-- ============================================================================
-- RPC 1: record_telemetry
-- Record telemetry data from a trip (GPS, accelerometer, speed)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_telemetry(
  p_user_id UUID,
  p_booking_id UUID,
  p_telemetry_data JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  telemetry_id UUID,
  driver_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_telemetry_id UUID;
  v_total_km DECIMAL;
  v_hard_brakes INTEGER;
  v_speed_violations INTEGER;
  v_night_driving_hours DECIMAL;
  v_risk_zones_visited INTEGER;
  v_driver_score INTEGER;
BEGIN
  -- Extract data from JSONB
  v_total_km := COALESCE((p_telemetry_data->>'total_km')::DECIMAL, 0);
  v_hard_brakes := COALESCE((p_telemetry_data->>'hard_brakes')::INTEGER, 0);
  v_speed_violations := COALESCE((p_telemetry_data->>'speed_violations')::INTEGER, 0);
  v_night_driving_hours := COALESCE((p_telemetry_data->>'night_driving_hours')::DECIMAL, 0);
  v_risk_zones_visited := COALESCE((p_telemetry_data->>'risk_zones_visited')::INTEGER, 0);

  -- Calculate driver score (0-100)
  v_driver_score := calculate_telemetry_score(
    v_total_km,
    v_hard_brakes,
    v_speed_violations,
    v_night_driving_hours,
    v_risk_zones_visited
  );

  -- Insert telemetry record
  INSERT INTO driver_telemetry (
    user_id,
    booking_id,
    trip_date,
    total_km,
    hard_brakes,
    speed_violations,
    night_driving_hours,
    risk_zones_visited,
    driver_score,
    telemetry_data
  ) VALUES (
    p_user_id,
    p_booking_id,
    NOW(),
    v_total_km,
    v_hard_brakes,
    v_speed_violations,
    v_night_driving_hours,
    v_risk_zones_visited,
    v_driver_score,
    p_telemetry_data
  )
  RETURNING id INTO v_telemetry_id;

  -- Update driver profile with new average score
  UPDATE driver_risk_profile
  SET
    driver_score = (
      SELECT ROUND(AVG(driver_score))
      FROM driver_telemetry
      WHERE user_id = p_user_id
        AND trip_date > NOW() - INTERVAL '3 months'
    ),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RAISE NOTICE 'Recorded telemetry for user %: score %', p_user_id, v_driver_score;

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Telemetry recorded. Driver score: %s/100', v_driver_score) AS message,
    v_telemetry_id,
    v_driver_score;
END;
$function$;

COMMENT ON FUNCTION public.record_telemetry IS
'Record telemetry data from trip. Calculates and updates driver score. Updates profile with 3-month average.';

-- ============================================================================
-- RPC 2: calculate_telemetry_score (helper function)
-- Calculate driver score based on telemetry metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_telemetry_score(
  p_total_km DECIMAL,
  p_hard_brakes INTEGER,
  p_speed_violations INTEGER,
  p_night_driving_hours DECIMAL,
  p_risk_zones_visited INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_score INTEGER := 100;
  v_hard_brakes_per_100km DECIMAL;
  v_speed_violations_per_100km DECIMAL;
BEGIN
  -- Avoid division by zero
  IF p_total_km <= 0 THEN
    RETURN 50; -- Neutral score if no distance
  END IF;

  -- Calculate rates per 100km
  v_hard_brakes_per_100km := (p_hard_brakes::DECIMAL / p_total_km) * 100;
  v_speed_violations_per_100km := (p_speed_violations::DECIMAL / p_total_km) * 100;

  -- Deduct points for hard braking (max -20 points)
  -- More than 5 hard brakes per 100km = full penalty
  v_score := v_score - LEAST(20, ROUND(v_hard_brakes_per_100km * 4));

  -- Deduct points for speeding (max -30 points)
  -- More than 3 violations per 100km = full penalty
  v_score := v_score - LEAST(30, ROUND(v_speed_violations_per_100km * 10));

  -- Deduct points for night driving (max -10 points)
  -- More than 4 hours = full penalty
  v_score := v_score - LEAST(10, ROUND((p_night_driving_hours / 4) * 10));

  -- Deduct points for risk zones (max -10 points)
  -- More than 5 zones = full penalty
  v_score := v_score - LEAST(10, ROUND((p_risk_zones_visited / 5.0) * 10));

  -- Ensure score is within bounds
  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN v_score;
END;
$function$;

COMMENT ON FUNCTION public.calculate_telemetry_score IS
'Calculate driver score (0-100) from telemetry metrics. Lower is worse, 100 is perfect.';

-- ============================================================================
-- RPC 3: get_user_telemetry_summary
-- Get summary of user telemetry for display
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_telemetry_summary(
  p_user_id UUID DEFAULT NULL,
  p_months_back INTEGER DEFAULT 3
)
RETURNS TABLE(
  total_trips INTEGER,
  total_km DECIMAL,
  avg_driver_score INTEGER,
  current_driver_score INTEGER,
  hard_brakes_total INTEGER,
  speed_violations_total INTEGER,
  night_driving_hours_total DECIMAL,
  risk_zones_visited_total INTEGER,
  best_score INTEGER,
  worst_score INTEGER,
  score_trend TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_current_score INTEGER;
  v_previous_score INTEGER;
  v_trend TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get current score from profile
  SELECT driver_score INTO v_current_score
  FROM driver_risk_profile
  WHERE user_id = v_user_id;

  -- Get previous period score for trend
  SELECT ROUND(AVG(driver_score)) INTO v_previous_score
  FROM driver_telemetry
  WHERE user_id = v_user_id
    AND trip_date BETWEEN NOW() - INTERVAL '6 months' AND NOW() - INTERVAL '3 months';

  -- Calculate trend
  IF v_previous_score IS NOT NULL AND v_current_score IS NOT NULL THEN
    IF v_current_score > v_previous_score + 5 THEN
      v_trend := 'improving';
    ELSIF v_current_score < v_previous_score - 5 THEN
      v_trend := 'declining';
    ELSE
      v_trend := 'stable';
    END IF;
  ELSE
    v_trend := 'insufficient_data';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_trips,
    COALESCE(SUM(t.total_km), 0) AS total_km,
    COALESCE(ROUND(AVG(t.driver_score))::INTEGER, 50) AS avg_driver_score,
    v_current_score AS current_driver_score,
    COALESCE(SUM(t.hard_brakes)::INTEGER, 0) AS hard_brakes_total,
    COALESCE(SUM(t.speed_violations)::INTEGER, 0) AS speed_violations_total,
    COALESCE(SUM(t.night_driving_hours), 0) AS night_driving_hours_total,
    COALESCE(SUM(t.risk_zones_visited)::INTEGER, 0) AS risk_zones_visited_total,
    COALESCE(MAX(t.driver_score), 0) AS best_score,
    COALESCE(MIN(t.driver_score), 0) AS worst_score,
    v_trend AS score_trend
  FROM driver_telemetry t
  WHERE t.user_id = v_user_id
    AND t.trip_date > NOW() - (p_months_back || ' months')::INTERVAL;
END;
$function$;

COMMENT ON FUNCTION public.get_user_telemetry_summary IS
'Get telemetry summary for user (last N months). Used for dashboard display.';

-- ============================================================================
-- RPC 4: get_user_telemetry_history
-- Get detailed telemetry history for charts
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_telemetry_history(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  booking_id UUID,
  trip_date TIMESTAMPTZ,
  total_km DECIMAL,
  driver_score INTEGER,
  hard_brakes INTEGER,
  speed_violations INTEGER,
  night_driving_hours DECIMAL,
  risk_zones_visited INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.booking_id,
    t.trip_date,
    t.total_km,
    t.driver_score,
    t.hard_brakes,
    t.speed_violations,
    t.night_driving_hours,
    t.risk_zones_visited
  FROM driver_telemetry t
  WHERE t.user_id = v_user_id
  ORDER BY t.trip_date DESC
  LIMIT p_limit;
END;
$function$;

COMMENT ON FUNCTION public.get_user_telemetry_history IS
'Get detailed telemetry history for user. Used for charts/graphs in UI.';

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration creates telemetry RPCs:
--
-- 1. record_telemetry: Record trip data (GPS, accelerometer, speed)
-- 2. calculate_telemetry_score: Calculate 0-100 score from metrics
-- 3. get_user_telemetry_summary: Summary stats for dashboard
-- 4. get_user_telemetry_history: Detailed history for charts
--
-- Score calculation:
-- - Start with 100 points
-- - Hard brakes: -4 points per brake per 100km (max -20)
-- - Speed violations: -10 points per violation per 100km (max -30)
-- - Night driving: -2.5 points per hour (max -10)
-- - Risk zones: -2 points per zone (max -10)
--
-- Integration:
-- - TelemetryService (Angular) will call record_telemetry after trip
-- - Driver score updates automatically (3-month rolling average)
-- - Score is used in compute_fee_with_class() for pricing
--
-- Data sources:
-- - GPS: Track route, calculate distance, detect risk zones
-- - Accelerometer: Detect hard braking events
-- - Speed: Compare with speed limits (requires map data)
-- - Time: Track night driving hours (10pm-6am)
--
-- Next: FASE 8 - Angular Services (DriverProfile, AutorentarCredit, etc.)
-- ============================================================================

COMMIT;
