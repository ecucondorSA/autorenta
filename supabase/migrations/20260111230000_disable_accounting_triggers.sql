-- ============================================================================
-- FIX: Disable accounting triggers that cause FK errors
-- Date: 2026-01-11
-- Description:
--   The accounting triggers are trying to insert with account_codes that
--   don't exist in accounting_chart_of_accounts. Disabling them until
--   the accounting module is properly configured.
-- ============================================================================

-- Disable the revenue recognition trigger (causes FK error on booking completion)
DROP TRIGGER IF EXISTS trg_accounting_revenue_recognition_after ON bookings;

-- Also disable other accounting triggers that might have similar issues
DROP TRIGGER IF EXISTS trg_accounting_wallet_deposit_after ON wallet_transactions;
DROP TRIGGER IF EXISTS trg_accounting_wallet_withdrawal_after ON wallet_transactions;
DROP TRIGGER IF EXISTS trg_accounting_security_deposit_after ON bookings;

-- Note: These can be re-enabled once the accounting_chart_of_accounts is populated
-- with the correct account codes (2130, 4110, 2140, 2110, etc.)

-- ============================================================================
-- Migration complete
-- ============================================================================
DO $$ BEGIN RAISE NOTICE 'Accounting triggers disabled to prevent FK errors'; END $$;
