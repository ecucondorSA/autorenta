-- ============================================================================
-- AUTOMATION: Cron Jobs for Payment & Deposits
-- Date: 2026-01-08
-- Description: Schedules background workers for:
--              1. Processing pending money captures (Every minute)
--              2. Releasing expired/clean deposits (Every hour)
--
-- PROJECT URL: https://pisqjmoklivzpwufhscx.supabase.co
-- NOTE: 'SERVICE_ROLE_KEY' must be replaced by the actual key during deployment
--       or via a CI/CD variable substitution step.
-- ============================================================================

-- Enable pg_cron if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Enable pg_net if not enabled (required for http calls)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Schedule Payment Capture Processor (Runs every minute)
-- Calls the Edge Function via HTTP
SELECT cron.schedule(
    'process-payment-captures',
    '* * * * *', -- Every minute
    $$
    select
      net.http_post(
          url:='https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/process-payment-queue',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- 2. Schedule Auto-Release of Deposits (Runs every hour)
-- Calls Edge Function to check bookings with auto_release_at < NOW()
SELECT cron.schedule(
    'release-expired-deposits',
    '0 * * * *', -- Every hour
    $$
    select
      net.http_post(
          url:='https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/release-expired-deposits',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);
