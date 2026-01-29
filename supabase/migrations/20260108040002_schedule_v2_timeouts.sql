-- ============================================================================
-- SCHEDULING: V2 Return Flow Timeouts
-- Date: 2026-01-08
-- Description: Schedules the V2 timeout processing function to run every hour.
-- ============================================================================

-- Ensure pg_cron is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the V2 timeout processor (Runs every hour)
SELECT cron.schedule(
    'process-v2-return-timeouts',
    '30 * * * *', -- At minute 30 of every hour
    'SELECT public.process_booking_v2_timeouts();'
);
