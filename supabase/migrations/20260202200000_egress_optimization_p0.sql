-- ============================================================================
-- MIGRATION: Egress Optimization P0
-- Date: 2026-02-02
-- Purpose: Reduce Supabase cached egress consumption
--
-- Changes:
--   1. Disable non-essential cron jobs (marketing, social media)
--   2. Add retention policies for log tables
--   3. Create optimized indexes for common queries (if tables exist)
-- ============================================================================

-- NOTE: Using individual transactions for resilience
-- Some tables may not exist in fresh deployments

-- ============================================================================
-- 1. DISABLE NON-ESSENTIAL CRON JOBS
-- These jobs run frequently and generate egress without critical business value
-- ============================================================================

DO $$
BEGIN
  -- Marketing scheduler (runs every minute - HIGH EGRESS)
  PERFORM cron.unschedule('marketing_scheduler');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('marketing-scheduler');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  -- Social media cron (runs every minute - HIGH EGRESS)
  PERFORM cron.unschedule('social_media_cron');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('social-media-cron');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('publish-scheduled-social');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  -- Daily content generation (can be run manually)
  PERFORM cron.unschedule('daily-content-generation');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('generate-daily-content');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  -- Authority metrics (can be run weekly instead of hourly)
  PERFORM cron.unschedule('update-authority-scores');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('authority-daily-digest');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  -- Marketing reset daily (not critical)
  PERFORM cron.unschedule('marketing-reset-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  -- FIPE sync (can be run weekly)
  PERFORM cron.unschedule('sync-fipe-models');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 2. LOG RETENTION POLICIES
-- Automatically delete old log entries to prevent unbounded growth
-- ============================================================================

-- Function to clean old logs (reusable)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete vehicle recognition logs older than 7 days
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicle_recognition_logs' AND table_schema = 'public') THEN
    DELETE FROM public.vehicle_recognition_logs WHERE created_at < NOW() - INTERVAL '7 days';
  END IF;

  -- Delete MP webhook logs older than 30 days
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mp_webhook_logs' AND table_schema = 'public') THEN
    DELETE FROM public.mp_webhook_logs WHERE created_at < NOW() - INTERVAL '30 days';
  END IF;

  -- Delete pending webhook events that are done/failed older than 7 days
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_webhook_events' AND table_schema = 'public') THEN
    DELETE FROM public.pending_webhook_events WHERE created_at < NOW() - INTERVAL '7 days' AND status IN ('done', 'failed');
  END IF;

  -- Delete notification logs older than 14 days
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_logs' AND table_schema = 'public') THEN
    DELETE FROM public.notification_logs WHERE created_at < NOW() - INTERVAL '14 days';
  END IF;

  -- Delete FIPE history older than 90 days (keep recent for pricing)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cars_fipe_history' AND table_schema = 'public') THEN
    DELETE FROM public.cars_fipe_history WHERE synced_at < NOW() - INTERVAL '90 days';
  END IF;

  -- Delete email sequence logs older than 30 days
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sequence_logs' AND table_schema = 'public') THEN
    DELETE FROM public.email_sequence_logs WHERE created_at < NOW() - INTERVAL '30 days';
  END IF;

  RAISE NOTICE 'Log cleanup completed at %', NOW();
END;
$$;

-- Schedule log cleanup to run daily at 3 AM (low traffic)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-logs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-old-logs',
  '0 3 * * *',
  'SELECT public.cleanup_old_logs();'
);

-- ============================================================================
-- 3. OPTIMIZED INDEXES FOR COMMON QUERIES (conditional)
-- Reduce query time = reduce connection time = reduce egress
-- ============================================================================

-- Messages: Optimize chat loading (most common query)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_booking_created ON public.messages(booking_id, created_at DESC) WHERE booking_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_messages_car_created ON public.messages(car_id, created_at DESC) WHERE car_id IS NOT NULL;
  END IF;
END $$;

-- Bookings: Optimize dashboard queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_bookings_renter_status ON public.bookings(renter_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bookings_owner_status ON public.bookings(owner_id, status, created_at DESC);
  END IF;
END $$;

-- Cars: Optimize marketplace queries (location-based)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cars' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_cars_active_location ON public.cars(status, location_lat, location_lng) WHERE status = 'active';
  END IF;
END $$;

-- Wallet transactions: Optimize history loading
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created ON public.wallet_transactions(user_id, created_at DESC);
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE VIEW FOR LIGHTWEIGHT BOOKING LIST (conditional)
-- Returns only essential fields for list views (reduces JSONB transfer)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cars' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'car_photos' AND table_schema = 'public') THEN

    EXECUTE '
      CREATE OR REPLACE VIEW public.bookings_list_view AS
      SELECT
        b.id,
        b.car_id,
        b.renter_id,
        b.owner_id,
        b.status,
        b.start_date,
        b.end_date,
        b.total_price,
        b.currency,
        b.created_at,
        b.updated_at,
        c.title as car_title,
        c.brand as car_brand,
        c.model as car_model,
        c.year as car_year,
        (SELECT url FROM public.car_photos cp WHERE cp.car_id = b.car_id ORDER BY position LIMIT 1) as car_photo_url
      FROM public.bookings b
      LEFT JOIN public.cars c ON b.car_id = c.id
    ';

    GRANT SELECT ON public.bookings_list_view TO authenticated;
  END IF;
END $$;

-- ============================================================================
-- 5. CREATE VIEW FOR LIGHTWEIGHT CAR LIST (conditional)
-- Returns only essential fields for marketplace (no features JSONB)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cars' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'car_photos' AND table_schema = 'public') THEN

    EXECUTE '
      CREATE OR REPLACE VIEW public.cars_list_view AS
      SELECT
        c.id,
        c.owner_id,
        c.title,
        c.brand,
        c.model,
        c.year,
        c.price_per_day,
        c.currency,
        c.location_lat,
        c.location_lng,
        c.city,
        c.status,
        c.instant_booking,
        c.rating_avg,
        c.review_count,
        c.created_at,
        (SELECT url FROM public.car_photos cp WHERE cp.car_id = c.id ORDER BY position LIMIT 1) as primary_photo_url
      FROM public.cars c
      WHERE c.status = ''active''
    ';

    GRANT SELECT ON public.cars_list_view TO authenticated;
    GRANT SELECT ON public.cars_list_view TO anon;
  END IF;
END $$;
