-- ============================================================================
-- DROP 23 ZOMBIE CRON JOBS
-- All have been failing continuously since project creation (2026-02-02).
-- Root causes: phantom columns, missing tables, wrong enum values,
-- missing search_path in SECURITY DEFINER RPCs.
-- Combined: ~1,075 errors/day with zero functional impact.
--
-- Valuable functionality (booking reminders, demand snapshots, document expiry)
-- should be re-implemented as Edge Functions per Regla #1.
-- ============================================================================

-- High frequency (generating most errors)
SELECT cron.unschedule('poll-pending-payments');              -- 480 fails/day
SELECT cron.unschedule('check-abandoned-bookings');           -- 288 fails/day
SELECT cron.unschedule('update-demand-snapshots');            -- 96 fails/day
SELECT cron.unschedule('booking-reminders-every-30min');      -- 48 fails/day
SELECT cron.unschedule('retry-failed-deposits');              -- 48 fails/day
SELECT cron.unschedule('booking-completion-hourly');          -- 24 fails/day
SELECT cron.unschedule('expire-pending-deposits');            -- 24 fails/day
SELECT cron.unschedule('process-v2-return-timeouts');         -- 24 fails/day
SELECT cron.unschedule('rate-limit-cleanup');                 -- 24 fails/day

-- Every few hours
SELECT cron.unschedule('pending-requests-reminder');          -- 6 fails/day

-- Daily
SELECT cron.unschedule('alert-high-risk-drivers-daily');
SELECT cron.unschedule('auto-renew-protection-credit-daily');
SELECT cron.unschedule('backup-wallet-data');
SELECT cron.unschedule('car-views-milestone-daily');
SELECT cron.unschedule('check-expiring-protectors');          -- OOM, not schema
SELECT cron.unschedule('cleanup-old-logs');
SELECT cron.unschedule('daily-autorentar-credit-expiration');
SELECT cron.unschedule('daily-autorentar-credit-renewal');
SELECT cron.unschedule('document-expiry-daily');
SELECT cron.unschedule('expire-bonus-protectors-daily');
SELECT cron.unschedule('nearby-cars-weekly');
SELECT cron.unschedule('recognize-cp-breakage-daily');
SELECT cron.unschedule('refresh-accounting-balances-daily');

-- ============================================================================
-- DROP ORPHAN RPCs (only called by the zombie crons above)
-- ============================================================================
DROP FUNCTION IF EXISTS public.check_abandoned_bookings();
DROP FUNCTION IF EXISTS public.send_booking_reminders();
DROP FUNCTION IF EXISTS public.send_booking_completion_reminders();
DROP FUNCTION IF EXISTS public.send_pending_requests_reminder();
DROP FUNCTION IF EXISTS public.send_car_views_milestone_notification();
DROP FUNCTION IF EXISTS public.send_nearby_cars_notifications();
DROP FUNCTION IF EXISTS public.send_document_expiry_reminders();
DROP FUNCTION IF EXISTS public.process_booking_v2_timeouts();
-- KEEP: refresh_accounting_balances() — called from accounting.service.ts
DROP FUNCTION IF EXISTS public.cleanup_rate_limit_tracking();

-- Clean up old run details to reduce table bloat
DELETE FROM cron.job_run_details
WHERE start_time < NOW() - INTERVAL '1 day'
AND status = 'failed';
