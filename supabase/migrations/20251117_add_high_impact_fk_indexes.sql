-- Migration: Add high-impact foreign key covering indexes
-- Date: 2025-11-17
-- Purpose: Create missing indexes on FK columns identified by performance advisor
-- Note: run in maintenance window if DB is large; these are CONCURRENT where supported.

-- NOTE: Using CONCURRENTLY to avoid locks on large tables. Do NOT wrap
-- CREATE INDEX CONCURRENTLY statements inside a transaction (BEGIN/COMMIT).
-- Apply this file directly with psql or via your migration runner.

-- mp_webhook_logs.booking_id: queries filtering by booking_id (joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mp_webhook_logs_booking_id
  ON public.mp_webhook_logs (booking_id);

-- withdrawal_requests.bank_account_id: used in joins/filters when processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_bank_account_id
  ON public.withdrawal_requests (bank_account_id);

-- accounting_accounts.parent_account_id: hierarchical lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounting_accounts_parent_account_id
  ON public.accounting_accounts (parent_account_id);

-- accounting_ledger.user_id: frequent ledger queries by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounting_ledger_user_id
  ON public.accounting_ledger (user_id);

-- calendar_sync_log.car_id: backfills and sync queries by car
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_sync_log_car_id
  ON public.calendar_sync_log (car_id);

-- Notes:
-- 1) VERIFY with EXPLAIN ANALYZE after deploy to ensure queries use these indexes.
-- 2) If table sizes are large, monitor locks and run during low traffic.
-- 3) Add DROP INDEX statements in a rollback migration if needed.
