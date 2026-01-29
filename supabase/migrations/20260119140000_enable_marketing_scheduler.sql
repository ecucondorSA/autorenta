-- Migration: Enable Marketing Scheduler Cron Job
-- Purpose: Periodically trigger the marketing-scheduler Edge Function to publish pending posts
-- Created: 2026-01-19

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.trigger_marketing_scheduler()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_supabase_url TEXT;
  v_supabase_key TEXT;
BEGIN
  -- Get secrets safely
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_supabase_key := current_setting('app.supabase_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
    v_supabase_key := NULL;
  END;

  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE WARNING 'Supabase URL or Key not set. Cannot trigger scheduler.';
    RETURN;
  END IF;

  RAISE NOTICE 'Triggering marketing scheduler...';

  -- Call marketing-scheduler Edge Function
  PERFORM
    http_post(
      (v_supabase_url || '/functions/v1/marketing-scheduler')::text,
      jsonb_build_object(
        'max_posts', 10,
        'dry_run', false
      ),
      'application/json',
      jsonb_build_object(
        'Authorization', 'Bearer ' || v_supabase_key,
        'Content-Type', 'application/json'
      )
    );
END;
$$;

-- 2. Schedule the cron job (Every 15 minutes)
-- Checks for pending posts and publishes them if their scheduled_for time has passed.
SELECT cron.schedule(
  'trigger-marketing-scheduler', -- Job name
  '*/15 * * * *',                -- Every 15 minutes
  'SELECT public.trigger_marketing_scheduler()'
);

COMMENT ON FUNCTION public.trigger_marketing_scheduler() IS 'Triggers the marketing-scheduler Edge Function to process the content queue.';
