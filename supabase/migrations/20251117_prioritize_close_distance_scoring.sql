-- ============================================================================
-- MIGRATION: Prioritize close distance in get_available_cars scoring
-- Date: 2025-11-17
-- Purpose: Dar prioridad absoluta (dentro de lo razonable) a autos ubicados
--  muy cerca del usuario (0-5km) sin perder el aporte de rating/precio/auto-approval.
--  Cambios clave:
--    * Nuevo distance_component exponencial que cae agresivamente después de 1km
--    * Pesos dinámicos para distancia: 0-5km = 0.70, 5-15km = 0.60, >15km = 0.3 * base
--    * Tie-breaker secundario por distance_km para mantener consistencia UI/RPC
-- Notes / Assumptions:
--  - price difference is measured relative to the average price of active cars
--  - weights are renormalized to sum 1 after applying the conditional rules
--  - p_lat/p_lng are optional; when absent distance component is neutral (0.5)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_available_cars(TIMESTAMPTZ, TIMESTAMPTZ, DOUBLE PRECISION, DOUBLE PRECISION, INT, INT);

CREATE OR REPLACE FUNCTION public.get_available_cars(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  brand TEXT,
  model TEXT,
  year INT,
  plate TEXT,
  price_per_day NUMERIC,
  currency CHAR(3),
  status TEXT,
  location JSONB,
  images TEXT[],
  features JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_bookings BIGINT,
  avg_rating NUMERIC,
  score NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_avg_price NUMERIC;
BEGIN
  -- Baseline average price across active cars (used to evaluate price deviation)
  SELECT COALESCE(AVG(price_per_day), 0) INTO v_avg_price FROM cars WHERE status = 'active' AND price_per_day IS NOT NULL;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      c.*,
      COALESCE(AVG(r.rating) FILTER (WHERE r.id IS NOT NULL AND r.is_car_review = true), 0)::NUMERIC AS avg_rating_calc,
      COUNT(DISTINCT b.id) FILTER (WHERE b.id IS NOT NULL) AS total_bookings_calc
    FROM cars c
    LEFT JOIN bookings b ON b.car_id = c.id
    LEFT JOIN reviews r ON r.booking_id = b.id AND r.is_car_review = true
    WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM bookings b2
        WHERE b2.car_id = c.id
          AND b2.status IN ('pending','confirmed','in_progress')
          AND (b2.start_at, b2.end_at) OVERLAPS (p_start_date, p_end_date)
      )
    GROUP BY c.id
  )
  SELECT
    c.id,
    c.owner_id,
    c.brand_text_backup AS brand,
    c.model_text_backup AS model,
    c.year,
    c.plate,
    c.price_per_day,
    c.currency,
    c.status::TEXT,
    jsonb_build_object(
      'city', c.location_city,
      'state', c.location_state,
      'province', c.location_province,
      'country', c.location_country,
      'lat', c.location_lat,
      'lng', c.location_lng
    ) AS location,
    COALESCE(
      ARRAY(
        SELECT url FROM car_photos WHERE car_id = c.id ORDER BY sort_order LIMIT 10
      ),
      ARRAY[]::TEXT[]
    ) AS images,
    COALESCE(c.features, '{}'::jsonb) AS features,
    c.created_at,
    c.updated_at,
    c.total_bookings_calc AS total_bookings,
    c.avg_rating_calc AS avg_rating,
    -- Score calculation
    (
      -- compute raw components (0..1)
      (
        -- rating component: avg_rating / 5
        (c.avg_rating_calc::NUMERIC / 5.0) * (
          -- dynamic weight for rating computed below
          1.0
        )
      )
      * 0 -- placeholder, real composition computed in subselect below
    )::NUMERIC
  FROM candidates c
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- NOTE: The function above is a placeholder wrapper to ensure safe replacement.
-- The detailed score composition is computed below with a REPLACE of the function body
-- to allow clearer step-by-step logic (avoid overly long single expression in RETURN QUERY).

-- Replace with an implementation that computes dynamic weights and final score.
CREATE OR REPLACE FUNCTION public.get_available_cars(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  brand TEXT,
  model TEXT,
  year INT,
  plate TEXT,
  price_per_day NUMERIC,
  currency CHAR(3),
  status TEXT,
  location JSONB,
  images TEXT[],
  features JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_bookings BIGINT,
  avg_rating NUMERIC,
  score NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_avg_price NUMERIC;
BEGIN
  -- Baseline average price across active cars
  SELECT COALESCE(AVG(c.price_per_day), 0) INTO v_avg_price FROM cars c WHERE c.status = 'active' AND c.price_per_day IS NOT NULL;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      c.*,
      COALESCE(AVG(r.rating) FILTER (WHERE r.id IS NOT NULL AND r.is_car_review = true), 0)::NUMERIC AS avg_rating_calc,
      COUNT(DISTINCT b.id) FILTER (WHERE b.id IS NOT NULL) AS total_bookings_calc
    FROM cars c
    LEFT JOIN bookings b ON b.car_id = c.id
    LEFT JOIN reviews r ON r.booking_id = b.id AND r.is_car_review = true
    WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM bookings b2
        WHERE b2.car_id = c.id
          AND b2.status IN ('pending','confirmed','in_progress')
          AND (b2.start_at, b2.end_at) OVERLAPS (p_start_date, p_end_date)
      )
    GROUP BY c.id
  ),
  scored AS (
    SELECT
      c.*,
      -- components
      (COALESCE(c.avg_rating_calc, 0)::NUMERIC / 5.0) AS rating_component,
      -- distance in km (nullable)
      CASE
        WHEN p_lat IS NULL OR p_lng IS NULL OR c.location_lat IS NULL OR c.location_lng IS NULL THEN NULL
        ELSE ST_DistanceSphere(ST_MakePoint(p_lng, p_lat), ST_MakePoint(c.location_lng, c.location_lat)) / 1000.0
      END AS distance_km,
      -- distance component normalized [0..1] con caída exponencial agresiva:
      -- 0km = 1.0, 0.5km ≈ 0.87, 1km ≈ 0.82, 5km ≈ 0.59, 15km ≈ 0.29, 30km+ = 0.05
      CASE
        WHEN p_lat IS NULL OR p_lng IS NULL OR c.location_lat IS NULL OR c.location_lng IS NULL THEN 0.5
        ELSE GREATEST(
          0.05,
          1.0 - POWER(
            LEAST((ST_DistanceSphere(ST_MakePoint(p_lng, p_lat), ST_MakePoint(c.location_lng, c.location_lat)) / 1000.0) / 30.0, 1.0),
            0.5
          )
        )
      END AS distance_component,
      -- price component: 1 if price <= avg_price, decreases if price > avg_price (capped)
      CASE
        WHEN v_avg_price <= 0 OR c.price_per_day IS NULL THEN 0.5
        WHEN c.price_per_day <= v_avg_price THEN 1.0
        ELSE GREATEST(0.0, 1.0 - ((c.price_per_day - v_avg_price) / v_avg_price))
      END AS price_component,
      CASE WHEN c.auto_approval = TRUE THEN 1.0 ELSE 0.0 END AS auto_component,
      -- price deviation pct relative to average (abs)
      CASE WHEN v_avg_price > 0 THEN ABS(c.price_per_day - v_avg_price) / v_avg_price ELSE 0 END AS price_dev_pct
    FROM candidates c
  ),
  weighted AS (
    SELECT
      s.*,
      -- base weights (rating prioritized)
      0.40::NUMERIC AS w_rating_base,
      0.35::NUMERIC AS w_distance_base,
      0.15::NUMERIC AS w_price_base,
      0.10::NUMERIC AS w_auto_base
    FROM scored s
  ),
  final AS (
    SELECT
      w.id,
      w.owner_id,
      w.brand_text_backup AS brand,
      w.model_text_backup AS model,
      w.year,
      w.plate,
      w.price_per_day,
      w.currency::CHAR(3),
      w.status::TEXT AS status,
      jsonb_build_object(
        'city', w.location_city,
        'state', w.location_state,
        'province', w.location_province,
        'country', w.location_country,
        'lat', w.location_lat,
        'lng', w.location_lng
      ) AS location,
      COALESCE(
        ARRAY(
          SELECT url FROM car_photos WHERE car_id = w.id ORDER BY sort_order LIMIT 10
        ),
        ARRAY[]::TEXT[]
      ) AS images,
      COALESCE(w.features, '{}'::jsonb) AS features,
      w.created_at,
      w.updated_at,
      w.total_bookings_calc AS total_bookings,
      w.avg_rating_calc AS avg_rating,
      w.distance_km,
      w.distance_component,
      w.price_component,
      w.rating_component,
      w.auto_component,
      w.price_dev_pct,
      -- dynamic weights adjustments
      -- FIX: Aumentar aún más el peso para distancias MUY cercanas (0-1km) para prioridad absoluta
      (CASE
         WHEN w.distance_km IS NULL THEN w_distance_base
         WHEN w.distance_km <= 1 THEN 0.90 -- PRIORIDAD ABSOLUTA MÁXIMA para 0-1km (casi al lado)
         WHEN w.distance_km <= 5 THEN 0.70 -- prioridad máxima absoluta para 1-5km
         WHEN w.distance_km <= 15 THEN 0.60 -- cercanos mantienen peso alto
         WHEN w.distance_km > 15 THEN GREATEST(w_distance_base * 0.3, 0.10) -- distancias lejanas pierden peso
         ELSE w_distance_base
       END) AS w_distance_adj,
      -- FIX: Reducir peso de precio cuando distancia es muy cercana (0-1km) para priorizar cercanía
      (CASE
         WHEN w.distance_km IS NOT NULL AND w.distance_km <= 1 THEN
           -- Para autos muy cercanos, reducir peso de precio a casi cero
           w_price_base * 0.1
         WHEN w.price_dev_pct > 0.15 THEN w_price_base + 0.05
         ELSE w_price_base
       END) AS w_price_adj,
      w_rating_base AS w_rating_adj_pre,
      -- FIX: Reducir peso de auto_approval cuando distancia es muy cercana (0-1km)
      (CASE
         WHEN w.distance_km IS NOT NULL AND w.distance_km <= 1 THEN
           -- Para autos muy cercanos, reducir peso de auto_approval a casi cero
           w_auto_base * 0.1
         ELSE w_auto_base
       END) AS w_auto_adj
    FROM weighted w
  ),
  normalized AS (
    SELECT
      f.*,
      -- compute rating weight (unchanged base)
      f.w_rating_adj_pre AS w_rating_adj_raw,
      -- distance weight already ajusted en el paso anterior
      f.w_distance_adj AS w_distance_raw,
      f.w_price_adj AS w_price_raw,
      f.w_auto_adj AS w_auto_raw
    FROM final f
  ),
  normalized2 AS (
    SELECT
      n.*,
      -- normalize so sum = 1
      (n.w_rating_adj_raw + n.w_distance_raw + n.w_price_raw + n.w_auto_raw) AS sum_w_raw
    FROM normalized n
  )
  SELECT
    n2.id,
    n2.owner_id,
    n2.brand,
    n2.model,
    n2.year,
    n2.plate,
    n2.price_per_day,
    n2.currency,
    n2.status,
    n2.location,
    n2.images,
    n2.features,
    n2.created_at,
    n2.updated_at,
    n2.total_bookings,
    n2.avg_rating,
    -- final score: weighted sum of components with normalized weights
    (
      ((n2.w_rating_adj_raw / NULLIF(n2.sum_w_raw, 0)) * n2.rating_component)
      + ((n2.w_distance_raw / NULLIF(n2.sum_w_raw, 0)) * n2.distance_component)
      + ((n2.w_price_raw / NULLIF(n2.sum_w_raw, 0)) * n2.price_component)
      + ((n2.w_auto_raw / NULLIF(n2.sum_w_raw, 0)) * n2.auto_component)
    )::NUMERIC AS score
  FROM normalized2 n2
  ORDER BY score DESC, n2.distance_km ASC NULLS LAST, n2.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

END;
$$;

COMMENT ON FUNCTION public.get_available_cars IS
  'Get available cars for dates with dynamic scoring.
   Scoring rules (2025-11-17):
   - rating stays the base quality signal (weight 0.40) but can be overtaken by proximity
   - distance component uses an exponential decay (0-5km nearly full score, 30km+ floored at 0.05)
   - distance weights: <=5km=0.70, <=15km=0.60, >15km=base*0.3; null distances keep base weight
   - if price deviation > 15% => price weight increases by +0.05
   - ORDER BY includes distance_km asc as tiebreaker to keep RPC/UI consistent
   Weights are renormalized per-row to sum 1. Distance and price components default to 0.5 when data is missing.';
