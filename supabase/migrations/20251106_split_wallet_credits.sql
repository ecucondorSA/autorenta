-- ============================================================================
-- MIGRATION: Split Wallet Credits - Bonus-Malus System Foundation
-- Date: 2025-11-06
-- Purpose: Separate cash deposits from Autorentar Credit (Bonus-Malus)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ADD NEW COLUMNS TO user_wallets
-- ============================================================================

-- Add Autorentar Credit balance (Bonus-Malus system)
ALTER TABLE public.user_wallets
  ADD COLUMN IF NOT EXISTS autorentar_credit_balance NUMERIC(10, 2) NOT NULL DEFAULT 0
    CHECK (autorentar_credit_balance >= 0);

-- Add metadata for Autorentar Credit
ALTER TABLE public.user_wallets
  ADD COLUMN IF NOT EXISTS autorentar_credit_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS autorentar_credit_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS autorentar_credit_last_renewal TIMESTAMPTZ;

-- Comments
COMMENT ON COLUMN public.user_wallets.non_withdrawable_floor IS
'Non-withdrawable cash deposits (Pago Fácil/Rapipago). Cannot be withdrawn to bank account.';

COMMENT ON COLUMN public.user_wallets.autorentar_credit_balance IS
'Autorentar Credit from Bonus-Malus system. Renewable credit for good driving history. NOT withdrawable.';

COMMENT ON COLUMN public.user_wallets.autorentar_credit_issued_at IS
'Timestamp when Autorentar Credit was first issued to the user.';

COMMENT ON COLUMN public.user_wallets.autorentar_credit_expires_at IS
'Expiration timestamp for Autorentar Credit. Renewed automatically on good history.';

COMMENT ON COLUMN public.user_wallets.autorentar_credit_last_renewal IS
'Timestamp of last automatic renewal of Autorentar Credit.';

-- ============================================================================
-- SECTION 2: UPDATE wallet_ledger FOR AUTORENTAR CREDIT TRACKING
-- ============================================================================

-- Add flag to track Autorentar Credit movements
ALTER TABLE public.wallet_ledger
  ADD COLUMN IF NOT EXISTS is_autorentar_credit BOOLEAN DEFAULT FALSE;

ALTER TABLE public.wallet_ledger
  ADD COLUMN IF NOT EXISTS autorentar_credit_reference_type VARCHAR(50);

COMMENT ON COLUMN public.wallet_ledger.is_autorentar_credit IS
'TRUE if this transaction involves Autorentar Credit from Bonus-Malus system.';

COMMENT ON COLUMN public.wallet_ledger.autorentar_credit_reference_type IS
'Type of Autorentar Credit transaction: issue, consume, extend, breakage, bonus, malus.';

-- ============================================================================
-- SECTION 3: UPDATE wallet_transactions FOR AUTORENTAR CREDIT TRACKING
-- ============================================================================

-- Add flag to legacy wallet_transactions table
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS is_autorentar_credit BOOLEAN DEFAULT FALSE;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS autorentar_credit_reference_type VARCHAR(50);

COMMENT ON COLUMN public.wallet_transactions.is_autorentar_credit IS
'TRUE if this transaction involves Autorentar Credit from Bonus-Malus system.';

-- ============================================================================
-- SECTION 4: UPDATE wallet_get_balance() RPC
-- ============================================================================

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS public.wallet_get_balance();

CREATE OR REPLACE FUNCTION public.wallet_get_balance()
RETURNS TABLE(
  available_balance NUMERIC,
  transferable_balance NUMERIC,
  withdrawable_balance NUMERIC,
  cash_deposit_balance NUMERIC,
  autorentar_credit_balance NUMERIC,
  protected_credit_balance NUMERIC,  -- Deprecated, sum of cash + autorentar
  locked_balance NUMERIC,
  total_balance NUMERIC,
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
  v_cash_deposit NUMERIC;
  v_autorentar_credit NUMERIC;
  v_withdrawable NUMERIC;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 'USD'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = v_user_id;

  IF v_wallet IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 'USD'::TEXT;
    RETURN;
  END IF;

  -- Calculate balances
  v_cash_deposit := COALESCE(v_wallet.non_withdrawable_floor, 0);
  v_autorentar_credit := COALESCE(v_wallet.autorentar_credit_balance, 0);
  v_withdrawable := GREATEST(0, v_wallet.available_balance - v_cash_deposit - v_autorentar_credit);

  RETURN QUERY SELECT
    v_wallet.available_balance,
    v_wallet.available_balance AS transferable_balance,  -- For now
    v_withdrawable AS withdrawable_balance,
    v_cash_deposit AS cash_deposit_balance,
    v_autorentar_credit AS autorentar_credit_balance,
    v_cash_deposit + v_autorentar_credit AS protected_credit_balance,  -- Deprecated, backward compat
    v_wallet.locked_balance,
    v_wallet.available_balance + v_wallet.locked_balance AS total_balance,
    v_wallet.currency;
END;
$function$;

-- ============================================================================
-- SECTION 5: CREATE HELPER FUNCTION FOR AUTORENTAR CREDIT INFO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.wallet_get_autorentar_credit_info()
RETURNS TABLE(
  balance NUMERIC,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_renewal TIMESTAMPTZ,
  days_until_expiration INTEGER,
  is_expired BOOLEAN,
  is_renewable BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
  v_days_until_exp INTEGER;
  v_is_expired BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
      NULL::INTEGER, FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;

  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = v_user_id;

  IF v_wallet IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
      NULL::INTEGER, FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;

  -- Calculate expiration info
  IF v_wallet.autorentar_credit_expires_at IS NOT NULL THEN
    v_days_until_exp := EXTRACT(DAY FROM (v_wallet.autorentar_credit_expires_at - NOW()));
    v_is_expired := v_wallet.autorentar_credit_expires_at < NOW();
  ELSE
    v_days_until_exp := NULL;
    v_is_expired := FALSE;
  END IF;

  RETURN QUERY SELECT
    COALESCE(v_wallet.autorentar_credit_balance, 0) AS balance,
    v_wallet.autorentar_credit_issued_at,
    v_wallet.autorentar_credit_expires_at,
    v_wallet.autorentar_credit_last_renewal,
    v_days_until_exp,
    v_is_expired,
    -- Is renewable if balance > 0 or user has good history (to be implemented in FASE 4)
    FALSE AS is_renewable  -- Placeholder, will be updated in next migrations
  FROM user_wallets
  WHERE user_id = v_user_id;
END;
$function$;

-- ============================================================================
-- SECTION 6: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_wallets_autorentar_credit_expires
  ON public.user_wallets(autorentar_credit_expires_at)
  WHERE autorentar_credit_balance > 0;

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_autorentar_credit
  ON public.wallet_ledger(is_autorentar_credit)
  WHERE is_autorentar_credit = TRUE;

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration establishes the foundation for the Bonus-Malus system by:
--
-- 1. Separating cash deposits (non_withdrawable_floor) from Autorentar Credit
-- 2. Adding metadata fields for credit issuance and expiration tracking
-- 3. Updating wallet_get_balance() to return both credit types separately
-- 4. Creating helper function for Autorentar Credit info retrieval
-- 5. Adding tracking columns to wallet_ledger and wallet_transactions
--
-- IMPORTANT: This migration does NOT:
-- - Create the driver risk profile tables (FASE 2)
-- - Implement bonus/malus RPCs (FASE 4)
-- - Set up automatic renewals (FASE 10)
--
-- Those will come in subsequent migrations as part of the full Bonus-Malus
-- system implementation.
-- ============================================================================

COMMIT;
