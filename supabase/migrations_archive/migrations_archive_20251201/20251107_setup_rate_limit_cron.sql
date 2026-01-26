-- ============================================================================
-- RATE LIMITING CRON JOBS
-- Created: 2025-11-07
-- Purpose: Setup cron jobs for rate limit cleanup
-- Related: Issue #114 P0 Blocker #3
-- ============================================================================

BEGIN;

-- ============================================================================
-- Enable pg_cron extension (if not already enabled)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ============================================================================
-- Schedule rate limit cleanup job
-- ============================================================================

-- Cleanup expired rate limit records every hour
SELECT cron.schedule(
  'rate-limit-cleanup',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT cleanup_rate_limit_tracking();$$
);

-- ============================================================================
-- Verification
-- ============================================================================

-- View scheduled jobs:
-- SELECT * FROM cron.job WHERE jobname = 'rate-limit-cleanup';

-- View job execution history:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'rate-limit-cleanup')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- SELECT cron.unschedule('rate-limit-cleanup');

COMMIT;
