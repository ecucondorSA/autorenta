-- ============================================================================
-- MONITORING SYSTEM - Cron Jobs Setup
-- AutoRenta Production Monitoring - Scheduled Tasks
-- ============================================================================

-- ============================================================================
-- PREREQUISITES
-- ============================================================================
-- Ensure pg_cron extension is enabled:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- CRON JOB 1: Health Checks (Every 5 minutes)
-- ============================================================================

-- Remove existing job if present
SELECT cron.unschedule('monitoring-health-check-every-5min') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'monitoring-health-check-every-5min'
);

-- Create new job
SELECT cron.schedule(
    'monitoring-health-check-every-5min',
    '*/5 * * * *', -- Every 5 minutes
    $$
    SELECT
        net.http_post(
            url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- ============================================================================
-- CRON JOB 2: Alert Notifications (Every 2 minutes)
-- ============================================================================

-- Remove existing job if present
SELECT cron.unschedule('monitoring-alerts-every-2min') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'monitoring-alerts-every-2min'
);

-- Create new job
SELECT cron.schedule(
    'monitoring-alerts-every-2min',
    '*/2 * * * *', -- Every 2 minutes
    $$
    SELECT
        net.http_post(
            url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-alerts',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- ============================================================================
-- CRON JOB 3: Data Cleanup (Daily at 2 AM)
-- ============================================================================

-- Remove existing job if present
SELECT cron.unschedule('monitoring-cleanup-daily') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'monitoring-cleanup-daily'
);

-- Create new job
SELECT cron.schedule(
    'monitoring-cleanup-daily',
    '0 2 * * *', -- Daily at 2:00 AM
    $$
    SELECT monitoring_cleanup_old_data();
    $$
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- View all scheduled monitoring jobs
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    command
FROM cron.job
WHERE jobname LIKE 'monitoring%'
ORDER BY jobname;

-- ============================================================================
-- MANUAL EXECUTION (for testing)
-- ============================================================================

-- Test health check manually:
-- SELECT
--     net.http_post(
--         url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check',
--         headers := jsonb_build_object(
--             'Content-Type', 'application/json',
--             'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--         ),
--         body := '{}'::jsonb
--     ) AS request_id;

-- Test alert processing manually:
-- SELECT
--     net.http_post(
--         url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-alerts',
--         headers := jsonb_build_object(
--             'Content-Type', 'application/json',
--             'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--         ),
--         body := '{}'::jsonb
--     ) AS request_id;

-- Test cleanup manually:
-- SELECT monitoring_cleanup_old_data();













