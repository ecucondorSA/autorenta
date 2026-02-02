-- Migración para crear la vista materializada user_stats
-- Fecha: 2026-02-02
-- Autor: Antigravity Agent
-- Nota: Adaptada a la estructura real de la tabla reviews

BEGIN;

-- 1. Crear materialized view para estadísticas de usuario
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_stats AS
WITH owner_ratings AS (
  -- Reviews donde el renter evalúa al owner (is_car_review = true)
  SELECT
    reviewee_id as user_id,
    COUNT(*) as owner_reviews_count,
    ROUND(AVG(rating)::numeric, 2) as owner_rating_avg,
    MAX(created_at) as last_owner_review_at
  FROM public.reviews
  WHERE is_car_review = true
  GROUP BY reviewee_id
),
renter_ratings AS (
  -- Reviews donde el owner evalúa al renter (is_renter_review = true)
  SELECT
    reviewee_id as user_id,
    COUNT(*) as renter_reviews_count,
    ROUND(AVG(rating)::numeric, 2) as renter_rating_avg,
    MAX(created_at) as last_renter_review_at
  FROM public.reviews
  WHERE is_renter_review = true
  GROUP BY reviewee_id
),
owner_bookings AS (
  SELECT
    owner_id as user_id,
    COUNT(*) as total_bookings_as_owner,
    COUNT(*) FILTER (WHERE status = 'cancelled') as owner_cancellations
  FROM public.bookings
  GROUP BY owner_id
),
renter_bookings AS (
  SELECT
    renter_id as user_id,
    COUNT(*) as total_bookings_as_renter,
    COUNT(*) FILTER (WHERE status = 'cancelled') as renter_cancellations
  FROM public.bookings
  GROUP BY renter_id
)
SELECT
  p.id as user_id,

  -- Owner Stats
  COALESCE(ors.owner_reviews_count, 0) as owner_reviews_count,
  COALESCE(ors.owner_rating_avg, 0) as owner_rating_avg,

  -- Renter Stats
  COALESCE(rrs.renter_reviews_count, 0) as renter_reviews_count,
  COALESCE(rrs.renter_rating_avg, 0) as renter_rating_avg,

  -- Booking Stats
  COALESCE(ob.total_bookings_as_owner, 0) as total_bookings_as_owner,
  COALESCE(rb.total_bookings_as_renter, 0) as total_bookings_as_renter,
  (COALESCE(ob.owner_cancellations, 0) + COALESCE(rb.renter_cancellations, 0)) as cancellation_count,

  CASE
    WHEN (COALESCE(ob.total_bookings_as_owner, 0) + COALESCE(rb.total_bookings_as_renter, 0)) > 0
    THEN ROUND(((COALESCE(ob.owner_cancellations, 0) + COALESCE(rb.renter_cancellations, 0))::numeric / (COALESCE(ob.total_bookings_as_owner, 0) + COALESCE(rb.total_bookings_as_renter, 0))), 2)
    ELSE 0
  END as cancellation_rate,

  -- Badges Logic
  -- Top Host: >= 4.5 rating, 5+ reviews
  (COALESCE(ors.owner_rating_avg, 0) >= 4.5 AND COALESCE(ors.owner_reviews_count, 0) >= 5) as is_top_host,
  -- Super Host: >= 4.8 rating, 10+ reviews
  (COALESCE(ors.owner_rating_avg, 0) >= 4.8 AND COALESCE(ors.owner_reviews_count, 0) >= 10) as is_super_host,
  -- Verified Renter (usando id_verified boolean)
  COALESCE(p.id_verified, false) as is_verified_renter,

  -- Timestamps
  GREATEST(ors.last_owner_review_at, rrs.last_renter_review_at) as last_review_received_at,
  NOW() as updated_at

FROM public.profiles p
LEFT JOIN owner_ratings ors ON p.id = ors.user_id
LEFT JOIN renter_ratings rrs ON p.id = rrs.user_id
LEFT JOIN owner_bookings ob ON p.id = ob.user_id
LEFT JOIN renter_bookings rb ON p.id = rb.user_id;

-- 2. Crear índice único para refresh concurrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);

-- 3. Función para refrescar stats (puede ser llamada por triggers o cron)
CREATE OR REPLACE FUNCTION public.refresh_user_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_stats;
END;
$$;

-- 4. Grant permisos
GRANT SELECT ON public.user_stats TO authenticated;
GRANT SELECT ON public.user_stats TO anon;

COMMIT;
