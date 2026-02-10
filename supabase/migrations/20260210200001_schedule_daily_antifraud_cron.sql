-- ============================================================================
-- AUTOMATION: Daily Anti-Fraud Cron Job
-- Date: 2026-02-10
-- Description: Schedules run-daily-antifraud edge function at 02:00 UTC daily
--
-- PROJECT URL: https://aceacpaockyxgogxsfyc.supabase.co
-- AUTH: Uses vault.decrypted_secrets for service_role_key (same pattern as fix_cron_jobs_auth)
-- ============================================================================

-- Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if any (idempotent)
SELECT cron.unschedule('run-daily-antifraud')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'run-daily-antifraud'
);

-- Schedule daily anti-fraud pipeline at 02:00 UTC
-- Runs: calculate_daily_points → detect_gaming_signals → update_monthly_summaries → expire_old_signals
SELECT cron.schedule(
    'run-daily-antifraud',
    '0 2 * * *', -- Daily at 02:00 UTC
    $$
    select
      net.http_post(
          url:='https://aceacpaockyxgogxsfyc.supabase.co/functions/v1/run-daily-antifraud',
          headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
          ),
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- ============================================================================
-- Schedule monthly reward distribution — 1st of each month at 06:00 UTC
-- (After daily antifraud has been running all month building eligibility data)
-- ============================================================================

SELECT cron.unschedule('distribute-monthly-rewards')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'distribute-monthly-rewards'
);

SELECT cron.schedule(
    'distribute-monthly-rewards',
    '0 6 1 * *', -- 1st of every month at 06:00 UTC
    $$
    select
      net.http_post(
          url:='https://aceacpaockyxgogxsfyc.supabase.co/functions/v1/distribute-monthly-rewards',
          headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
          ),
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-daily-antifraud') THEN
    RAISE NOTICE '✅ Cron job "run-daily-antifraud" scheduled: daily at 02:00 UTC';
  ELSE
    RAISE WARNING '⚠️ Cron job "run-daily-antifraud" was NOT created';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'distribute-monthly-rewards') THEN
    RAISE NOTICE '✅ Cron job "distribute-monthly-rewards" scheduled: 1st of month at 06:00 UTC';
  ELSE
    RAISE WARNING '⚠️ Cron job "distribute-monthly-rewards" was NOT created';
  END IF;
END $$;
