-- ============================================================================
-- Migration: Remove orphaned DB objects
-- Purpose: Drop unused RPCs/functions and tables identified as orphans
-- Date: 2026-01-07
-- ============================================================================

-- Orphaned RPC/functions (no references outside their own migrations)
DROP FUNCTION IF EXISTS public.apply_bonus_malus_to_deposit(UUID, BIGINT);
DROP FUNCTION IF EXISTS public.get_cron_job_history(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.is_blocked_by(UUID);
DROP FUNCTION IF EXISTS public.get_inspection_analysis(UUID);
DROP FUNCTION IF EXISTS public.admin_verify_insurance(UUID, BOOLEAN, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.auto_expire_insurance();
DROP FUNCTION IF EXISTS public.refresh_user_stats();
DROP FUNCTION IF EXISTS public.schedule_user_stats_refresh();
DROP FUNCTION IF EXISTS public.confirm_account_deletion(TEXT);
DROP FUNCTION IF EXISTS public.wallet_charge_subscription(UUID, BIGINT, TEXT, TEXT, JSONB);

-- Orphaned table
DROP TABLE IF EXISTS public.personal_use_verifications CASCADE;
