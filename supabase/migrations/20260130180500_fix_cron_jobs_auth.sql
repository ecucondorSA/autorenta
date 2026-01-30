-- ============================================================================
-- Migration: Fix cron jobs authentication
-- Date: 2026-01-30
-- Issue: 3 cron jobs had broken auth (placeholder SERVICE_ROLE_KEY)
-- ============================================================================
-- NOTE: This migration documents changes already applied via MCP.
-- The cron jobs were updated to use vault.decrypted_secrets instead of:
-- - Literal "SERVICE_ROLE_KEY" placeholder
-- - current_setting() which wasn't configured
-- ============================================================================

-- Jobs fixed:
-- 1. process-push-notifications (every minute)
-- 2. renew-preauthorizations (daily at 3am)
-- 3. monitor-pending-payouts-hourly (every hour)

-- All now use pattern:
-- 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)

-- Verification query:
-- SELECT jobname,
--        CASE WHEN command LIKE '%vault.decrypted_secrets%' THEN '✅' ELSE '❌' END
-- FROM cron.job WHERE command LIKE '%net.http%';
