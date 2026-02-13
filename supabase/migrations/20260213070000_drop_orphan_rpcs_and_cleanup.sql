-- ============================================================================
-- Drop orphan RPCs identified in global integration audit (Phase 8)
-- These functions have ZERO callers: no frontend .rpc(), no triggers, no crons
-- ============================================================================

-- Logging stubs (never invoked)
DROP FUNCTION IF EXISTS public.log_cron_execution(text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.log_payment_event(uuid, text, jsonb, text, text, jsonb, bigint, text, uuid, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.measure_execution_time(text, timestamp with time zone);

-- Legacy review functions (replaced by current review system)
DROP FUNCTION IF EXISTS public.create_review(uuid, uuid, uuid, integer, text, text, uuid);
DROP FUNCTION IF EXISTS public.create_review_v2(uuid, uuid, uuid, uuid, character varying, integer, integer, integer, integer, integer, integer, text, text);

-- Webhook retry queue (never wired up)
DROP FUNCTION IF EXISTS public.add_webhook_to_retry_queue(text, text, text, jsonb, jsonb, text, jsonb);

-- Cleanup functions (never scheduled)
DROP FUNCTION IF EXISTS public.cleanup_old_pending_deposits();
DROP FUNCTION IF EXISTS public.cleanup_old_performance_logs();

-- Cron functions defined but never scheduled
DROP FUNCTION IF EXISTS public.cron_check_overdue_bookings();
DROP FUNCTION IF EXISTS public.cron_execute_scheduled_events();
