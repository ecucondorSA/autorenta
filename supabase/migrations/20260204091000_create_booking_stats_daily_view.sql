-- ============================================================================
-- MIGRATION: Create booking_stats_daily materialized view
-- Date: 2026-02-04
-- ============================================================================

-- Recreate to keep definition current
DROP MATERIALIZED VIEW IF EXISTS public.booking_stats_daily;

CREATE MATERIALIZED VIEW public.booking_stats_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  count(*) AS total_bookings,
  count(*) FILTER (WHERE status IN ('pending', 'pending_payment', 'pending_approval')) AS pending_bookings,
  count(*) FILTER (WHERE status IN ('confirmed', 'in_progress', 'pending_return')) AS active_bookings,
  count(*) FILTER (WHERE status = 'completed') AS completed_bookings,
  count(*) FILTER (WHERE status IN ('cancelled', 'cancelled_owner', 'cancelled_renter')) AS cancelled_bookings,
  count(*) FILTER (WHERE status IN ('dispute', 'disputed')) AS disputed_bookings,
  count(*) FILTER (WHERE status = 'payment_validation_failed') AS payment_failed_bookings,
  count(*) FILTER (WHERE status = 'returned') AS returned_bookings,
  count(*) FILTER (WHERE status = 'inspected_good') AS inspected_good_bookings,
  count(*) FILTER (WHERE status = 'damage_reported') AS damage_reported_bookings,
  count(*) FILTER (WHERE is_instant_booking = true) AS instant_bookings,
  sum(total_price) AS total_gmv,
  sum(subtotal) AS subtotal_gmv,
  sum(service_fee) AS service_fee_total,
  sum(owner_fee) AS owner_fee_total,
  sum(insurance_fee) AS insurance_fee_total,
  avg(total_price) AS avg_booking_value,
  avg(daily_rate) AS avg_daily_rate,
  avg(total_days) AS avg_total_days,
  count(DISTINCT renter_id) AS unique_renters,
  count(DISTINCT car_id) AS unique_cars,
  sum(COALESCE(total_days, GREATEST(1, (end_at::date - start_at::date)))) AS total_rental_days
FROM public.bookings
GROUP BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_stats_daily_day
  ON public.booking_stats_daily(day);

CREATE OR REPLACE FUNCTION public.refresh_booking_stats_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.booking_stats_daily;
END;
$$;

REVOKE ALL ON public.booking_stats_daily FROM anon, authenticated;
GRANT SELECT ON public.booking_stats_daily TO service_role;
GRANT SELECT ON public.booking_stats_daily TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_booking_stats_daily() TO service_role;

-- Schedule daily refresh at 03:00 (if pg_cron is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('refresh-booking-stats-daily');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'refresh-booking-stats-daily',
      '0 3 * * *',
      $cron$SELECT public.refresh_booking_stats_daily();$cron$
    );
  END IF;
END $$;
