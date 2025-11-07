-- Migration: Setup Protector Expiry Check Cron Job
-- Date: 2025-11-07
-- Epic: #82 - Bonus Protector Purchase Flow
-- Description: Schedules daily checks for expiring bonus protectors

-- Prerequisites:
-- 1. pg_cron extension must be enabled (done in initial setup)
-- 2. pg_net extension must be enabled for HTTP requests
-- 3. Edge Function 'check-expiring-protectors' must be deployed

-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the protector expiry check
-- Runs daily at 9:00 AM (server time)
SELECT cron.schedule(
  'check-expiring-protectors',
  '0 9 * * *', -- Every day at 9:00 AM
  $$
  SELECT
    net.http_post(
      url := concat(current_setting('app.settings.supabase_url', true), '/functions/v1/check-expiring-protectors'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true))
      ),
      body := jsonb_build_object(
        'scheduled_at', now()
      )
    ) AS request_id;
  $$
);

-- Add comment
COMMENT ON CRON JOB 'check-expiring-protectors' IS 'Daily check for bonus protectors expiring in 7 days, 1 day, or expired. Sends notifications to users.';

-- View scheduled cron jobs
SELECT * FROM cron.job WHERE jobname = 'check-expiring-protectors';
