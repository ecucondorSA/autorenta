-- Update get_available_cars to exclude cars without photos
-- Cars without at least one photo should not appear in marketplace search results

CREATE OR REPLACE FUNCTION public.get_available_cars(
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_lat double precision DEFAULT NULL::double precision,
  p_lng double precision DEFAULT NULL::double precision,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  owner_id uuid,
  brand text,
  model text,
  year integer,
  plate text,
  price_per_day numeric,
  currency character,
  status text,
  location jsonb,
  images text[],
  features jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_bookings bigint,
  avg_rating numeric,
  score numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_avg_price NUMERIC;
BEGIN
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
      -- NEW: Exclude cars without photos
      AND EXISTS (
        SELECT 1 FROM car_photos cp WHERE cp.car_id = c.id LIMIT 1
      )
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
      (COALESCE(c.avg_rating_calc, 0)::NUMERIC / 5.0) AS rating_component,
      CASE
        WHEN p_lat IS NULL OR p_lng IS NULL OR c.location_lat IS NULL OR c.location_lng IS NULL THEN NULL
        ELSE ST_DistanceSphere(ST_MakePoint(p_lng, p_lat), ST_MakePoint(c.location_lng, c.location_lat)) / 1000.0
      END AS distance_km,
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
      CASE
        WHEN v_avg_price <= 0 OR c.price_per_day IS NULL THEN 0.5
        WHEN c.price_per_day <= v_avg_price THEN 1.0
        ELSE GREATEST(0.0, 1.0 - ((c.price_per_day - v_avg_price) / v_avg_price))
      END AS price_component,
      CASE WHEN c.auto_approval = TRUE THEN 1.0 ELSE 0.0 END AS auto_component,
      CASE WHEN v_avg_price > 0 THEN ABS(c.price_per_day - v_avg_price) / v_avg_price ELSE 0 END AS price_dev_pct
    FROM candidates c
  ),
  weighted AS (
    SELECT
      s.*,
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
      (CASE
         WHEN w.distance_km IS NULL THEN w_distance_base
         WHEN w.distance_km <= 1 THEN 0.90
         WHEN w.distance_km <= 5 THEN 0.70
         WHEN w.distance_km <= 15 THEN 0.60
         WHEN w.distance_km > 15 THEN GREATEST(w_distance_base * 0.3, 0.10)
         ELSE w_distance_base
       END) AS w_distance_adj,
      (CASE
         WHEN w.distance_km IS NOT NULL AND w.distance_km <= 1 THEN
           w_price_base * 0.1
         WHEN w.price_dev_pct > 0.15 THEN w_price_base + 0.05
         ELSE w_price_base
       END) AS w_price_adj,
      w_rating_base AS w_rating_adj_pre,
      (CASE
         WHEN w.distance_km IS NOT NULL AND w.distance_km <= 1 THEN
           w_auto_base * 0.1
         ELSE w_auto_base
       END) AS w_auto_adj
    FROM weighted w
  ),
  normalized AS (
    SELECT
      f.*,
      f.w_rating_adj_pre AS w_rating_adj_raw,
      f.w_distance_adj AS w_distance_raw,
      f.w_price_adj AS w_price_raw,
      f.w_auto_adj AS w_auto_raw
    FROM final f
  ),
  normalized2 AS (
    SELECT
      n.*,
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
$function$;

COMMENT ON FUNCTION public.get_available_cars IS
  'Returns available cars for marketplace search. Excludes cars without photos and with overlapping bookings.';
