-- ============================================================================
-- AUTOMATION: Cron Job for Push Notification Queue Processing
-- Date: 2026-01-21
-- Description: Schedules background worker to process notification queue
-- ============================================================================

-- Schedule Push Notification Processor (Runs every minute)
-- Processes pending notifications from notification_queue
SELECT cron.schedule(
    'process-push-notifications',
    '* * * * *', -- Every minute
    $$
    select
      net.http_post(
          url:='https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/send-push-notification',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
          body:='{"action": "process_queue", "limit": 100}'::jsonb
      ) as request_id;
    $$
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
