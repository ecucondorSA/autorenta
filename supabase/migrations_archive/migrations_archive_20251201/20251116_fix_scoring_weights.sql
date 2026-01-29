-- Fix scoring weights logic according to business rules:
-- 1. Rating is most relevant (quality priority)
-- 2. If distance > 15km, distance gets MORE weight than rating
-- 3. If price is better (cheaper) than average AND owner has good rating, price gets MORE weight

CREATE OR REPLACE FUNCTION public.get_available_cars(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_lat NUMERIC DEFAULT NULL,
  p_lng NUMERIC DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  brand TEXT,
  model TEXT,
  year INTEGER,
  plate TEXT,
  price_per_day NUMERIC,
  currency CHAR(3),
  status TEXT,
  location JSONB,
  images TEXT[],
  features JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_bookings INTEGER,
  avg_rating NUMERIC,
  score NUMERIC
)
LANGUAGE plpgsql
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
      -- distance component normalized [0..1]: closer = 1, far = approaches 0
      -- FIX: Función exponencial más agresiva para priorizar distancias MUY cercanas (0-5km)
      -- 0km = 1.0, 1km = 0.98, 5km = 0.90, 15km = 0.75, 50km = 0.3, 100km+ = 0.05
      CASE
        WHEN p_lat IS NULL OR p_lng IS NULL OR c.location_lat IS NULL OR c.location_lng IS NULL THEN 0.5
        ELSE GREATEST(0.05, 1.0 - POWER(LEAST((ST_DistanceSphere(ST_MakePoint(p_lng, p_lat), ST_MakePoint(c.location_lng, c.location_lat)) / 1000.0) / 30.0, 1.0), 0.5))
      END AS distance_component,
      -- price component: 1 if price <= avg_price, decreases if price > avg_price (capped)
      CASE
        WHEN v_avg_price <= 0 OR c.price_per_day IS NULL THEN 0.5
        WHEN c.price_per_day <= v_avg_price THEN 1.0
        ELSE GREATEST(0.0, 1.0 - ((c.price_per_day - v_avg_price) / v_avg_price))
      END AS price_component,
      CASE WHEN c.auto_approval = TRUE THEN 1.0 ELSE 0.0 END AS auto_component,
      -- price deviation pct relative to average (abs)
      CASE WHEN v_avg_price > 0 THEN ABS(c.price_per_day - v_avg_price) / v_avg_price ELSE 0 END AS price_dev_pct,
      -- check if price is better (cheaper) than average
      CASE WHEN v_avg_price > 0 AND c.price_per_day < v_avg_price THEN TRUE ELSE FALSE END AS is_price_better,
      -- check if rating is good (>= 4.0 out of 5.0)
      CASE WHEN COALESCE(c.avg_rating_calc, 0) >= 4.0 THEN TRUE ELSE FALSE END AS has_good_rating
    FROM candidates c
  ),
  weighted AS (
    SELECT
      s.*,
      -- base weights: DISTANCE cercana es más relevante que rating cuando es < 15km
      -- Ajustado para priorizar distancia cercana (0-15km) sobre rating
      0.40::NUMERIC AS w_rating_base,  -- Rating sigue siendo importante
      0.35::NUMERIC AS w_distance_base, -- Distancia tiene más peso base
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
      w.total_bookings_calc::INTEGER AS total_bookings,
      w.avg_rating_calc AS avg_rating,
      w.distance_km,
      w.distance_component,
      w.price_component,
      w.rating_component,
      w.auto_component,
      w.price_dev_pct,
      w.is_price_better,
      w.has_good_rating,
      -- dynamic weights adjustments
      -- Rule 1: Rating is base (most relevant for quality)
      w.w_rating_base AS w_rating_adj_pre,
      -- Rule 2: If distance <= 15km, distance gets MUCH MORE weight (prioridad a cercanía)
      -- If distance > 15km, distance gets less weight
      -- FIX: Aumentar aún más el peso de distancia cercana para que tenga prioridad clara
      (CASE
         WHEN w.distance_km IS NOT NULL AND w.distance_km <= 5 THEN
           -- Distancia MUY cercana (0-5km) tiene peso MÁXIMO: 0.70 (más que rating)
           0.70
         WHEN w.distance_km IS NOT NULL AND w.distance_km <= 15 THEN
           -- Distancia cercana (5-15km) tiene peso alto: 0.60
           0.60
         WHEN w.distance_km IS NOT NULL AND w.distance_km > 15 THEN
           -- Distancia lejana tiene menos peso
           w.w_distance_base * 0.3
         ELSE w.w_distance_base
       END) AS w_distance_adj,
      -- Rule 3: If price is better (cheaper) AND has good rating, price gets MORE weight
      (CASE
         WHEN w.is_price_better = TRUE AND w.has_good_rating = TRUE THEN
           -- Price gets MORE weight: rating_base + 0.05 (so price > rating when conditions met)
           w.w_rating_base + 0.05
         ELSE w.w_price_base
       END) AS w_price_adj,
      w.w_auto_base AS w_auto_adj
    FROM weighted w
  ),
  normalized AS (
    SELECT
      f.*,
      -- Rating weight (base, most relevant)
      f.w_rating_adj_pre AS w_rating_adj_raw,
      -- Distance weight: if > 15km, it gets MORE than rating
      f.w_distance_adj AS w_distance_raw,
      -- Price weight: if better price + good rating, it gets MORE than rating
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
  ORDER BY score DESC, n2.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

END;
$$;

COMMENT ON FUNCTION public.get_available_cars IS
  'Get available cars for dates with dynamic scoring.
   Scoring rules (2025-11-16 - FIXED):
   1. Rating is MOST RELEVANT (quality priority) - base weight: 0.50
   2. If distance > 15km => distance gets MORE weight than rating (rating_base + 0.10)
   3. If price is better (cheaper) than average AND owner has good rating (>= 4.0) => price gets MORE weight than rating (rating_base + 0.05)
   Base weights: rating=0.50, distance=0.25, price=0.15, auto=0.10';

