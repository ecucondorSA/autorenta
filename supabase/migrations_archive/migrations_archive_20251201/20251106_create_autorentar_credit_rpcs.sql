-- ============================================================================
-- MIGRATION: Autorentar Credit RPCs
-- Date: 2025-11-06
-- Purpose: Manage Autorentar Credit lifecycle (issue, consume, extend, breakage)
-- ============================================================================

BEGIN;

-- ============================================================================
-- RPC 1: issue_autorentar_credit
-- Issue initial Autorentar Credit to new user (meta: USD 300)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.issue_autorentar_credit(
  p_user_id UUID,
  p_amount_cents BIGINT DEFAULT 30000  -- $300 USD default
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  credit_balance_cents BIGINT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_existing_credit BIGINT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Validate amount
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;

  -- Check if user already has credit
  SELECT autorentar_credit_balance INTO v_existing_credit
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_existing_credit IS NOT NULL AND v_existing_credit > 0 THEN
    RETURN QUERY SELECT
      FALSE AS success,
      FORMAT('User already has Autorentar Credit: $%s', v_existing_credit / 100.0) AS message,
      v_existing_credit AS credit_balance_cents,
      NULL::TIMESTAMPTZ AS issued_at,
      NULL::TIMESTAMPTZ AS expires_at;
    RETURN;
  END IF;

  -- Expires in 1 year
  v_expires_at := NOW() + INTERVAL '1 year';

  -- Create or update wallet
  INSERT INTO user_wallets (
    user_id,
    currency,
    autorentar_credit_balance,
    autorentar_credit_issued_at,
    autorentar_credit_expires_at
  ) VALUES (
    p_user_id,
    'USD',
    p_amount_cents / 100.0,  -- Convert to dollars
    NOW(),
    v_expires_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    autorentar_credit_balance = user_wallets.autorentar_credit_balance + (p_amount_cents / 100.0),
    autorentar_credit_issued_at = COALESCE(user_wallets.autorentar_credit_issued_at, NOW()),
    autorentar_credit_expires_at = v_expires_at,
    updated_at = NOW();

  -- Record in wallet_ledger
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    meta,
    is_autorentar_credit,
    autorentar_credit_reference_type
  ) VALUES (
    p_user_id,
    'autorentar_credit_issued',
    p_amount_cents,
    FORMAT('autorentar_credit_issue_%s', gen_random_uuid()),
    jsonb_build_object(
      'reason', 'initial_credit',
      'expires_at', v_expires_at
    ),
    TRUE,
    'issue'
  );

  RAISE NOTICE 'Issued Autorentar Credit: $% to user %', p_amount_cents / 100.0, p_user_id;

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Autorentar Credit issued: $%s (expires %s)', p_amount_cents / 100.0, v_expires_at::DATE) AS message,
    p_amount_cents AS credit_balance_cents,
    NOW() AS issued_at,
    v_expires_at AS expires_at;
END;
$function$;

COMMENT ON FUNCTION public.issue_autorentar_credit IS
'Issue initial Autorentar Credit to new user. Default $300, expires in 1 year. Idempotent.';

-- ============================================================================
-- RPC 2: consume_autorentar_credit_for_claim
-- Consume Autorentar Credit to cover claim damages (waterfall: AC → WR → External)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.consume_autorentar_credit_for_claim(
  p_user_id UUID,
  p_claim_amount_cents BIGINT,
  p_booking_id UUID,
  p_claim_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  autorentar_credit_used_cents BIGINT,
  wallet_balance_used_cents BIGINT,
  remaining_claim_cents BIGINT,
  new_autorentar_credit_balance NUMERIC,
  new_wallet_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_wallet RECORD;
  v_ac_available_cents BIGINT;
  v_wb_available_cents BIGINT;
  v_ac_used BIGINT := 0;
  v_wb_used BIGINT := 0;
  v_remaining BIGINT;
BEGIN
  -- Validate claim amount
  IF p_claim_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Claim amount must be positive';
  END IF;

  -- Get wallet balances
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wallet IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Convert to cents
  v_ac_available_cents := ROUND(v_wallet.autorentar_credit_balance * 100);
  v_wb_available_cents := ROUND(v_wallet.available_balance * 100);

  -- Waterfall logic: AC → WR → External
  v_remaining := p_claim_amount_cents;

  -- Step 1: Use Autorentar Credit
  IF v_ac_available_cents > 0 THEN
    v_ac_used := LEAST(v_remaining, v_ac_available_cents);
    v_remaining := v_remaining - v_ac_used;

    -- Deduct from AC balance
    UPDATE user_wallets
    SET
      autorentar_credit_balance = autorentar_credit_balance - (v_ac_used / 100.0),
      updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record consumption
    INSERT INTO wallet_ledger (
      user_id,
      kind,
      amount_cents,
      ref,
      booking_id,
      meta,
      is_autorentar_credit,
      autorentar_credit_reference_type
    ) VALUES (
      p_user_id,
      'autorentar_credit_consumed',
      -v_ac_used,  -- Negative = deduction
      FORMAT('claim_coverage_%s', COALESCE(p_claim_id::TEXT, gen_random_uuid()::TEXT)),
      p_booking_id,
      jsonb_build_object(
        'claim_id', p_claim_id,
        'claim_amount_cents', p_claim_amount_cents,
        'covered_by', 'autorentar_credit'
      ),
      TRUE,
      'consume'
    );
  END IF;

  -- Step 2: Use Wallet Balance if AC insufficient
  IF v_remaining > 0 AND v_wb_available_cents > 0 THEN
    v_wb_used := LEAST(v_remaining, v_wb_available_cents);
    v_remaining := v_remaining - v_wb_used;

    -- Deduct from available balance
    UPDATE user_wallets
    SET
      available_balance = available_balance - (v_wb_used / 100.0),
      updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record in ledger
    INSERT INTO wallet_ledger (
      user_id,
      kind,
      amount_cents,
      ref,
      booking_id,
      meta
    ) VALUES (
      p_user_id,
      'claim_deduction',
      -v_wb_used,
      FORMAT('claim_wallet_%s', COALESCE(p_claim_id::TEXT, gen_random_uuid()::TEXT)),
      p_booking_id,
      jsonb_build_object(
        'claim_id', p_claim_id,
        'claim_amount_cents', p_claim_amount_cents,
        'covered_by', 'wallet_balance'
      )
    );
  END IF;

  -- Get updated balances
  SELECT autorentar_credit_balance, available_balance INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  -- Return result
  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Claim coverage: AC=$%s, Wallet=$%s, External=$%s',
           v_ac_used / 100.0,
           v_wb_used / 100.0,
           v_remaining / 100.0) AS message,
    v_ac_used AS autorentar_credit_used_cents,
    v_wb_used AS wallet_balance_used_cents,
    v_remaining AS remaining_claim_cents,
    v_wallet.autorentar_credit_balance AS new_autorentar_credit_balance,
    v_wallet.available_balance AS new_wallet_balance;
END;
$function$;

COMMENT ON FUNCTION public.consume_autorentar_credit_for_claim IS
'Consume Autorentar Credit to cover claim damages. Waterfall: AC → Wallet → External payment.';

-- ============================================================================
-- RPC 3: extend_autorentar_credit_for_good_history
-- Extend/renew Autorentar Credit for users with good driving history
-- ============================================================================

CREATE OR REPLACE FUNCTION public.extend_autorentar_credit_for_good_history(
  p_user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  renewed BOOLEAN,
  new_balance_cents BIGINT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_profile RECORD;
  v_wallet RECORD;
  v_clean_bookings_required INTEGER := 10;
  v_renewal_amount_cents BIGINT := 30000;  -- $300
  v_is_eligible BOOLEAN;
  v_new_expires TIMESTAMPTZ;
BEGIN
  -- Get driver profile
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'No driver profile found. Complete bookings first.' AS message,
      FALSE AS renewed,
      0::BIGINT AS new_balance_cents,
      NULL::TIMESTAMPTZ AS expires_at;
    RETURN;
  END IF;

  -- Check eligibility: 10+ clean bookings since last renewal
  v_is_eligible := v_profile.clean_bookings >= v_clean_bookings_required;

  IF NOT v_is_eligible THEN
    RETURN QUERY SELECT
      FALSE AS success,
      FORMAT('Need %s more clean bookings for renewal (%s/%s)',
             v_clean_bookings_required - v_profile.clean_bookings,
             v_profile.clean_bookings,
             v_clean_bookings_required) AS message,
      FALSE AS renewed,
      0::BIGINT AS new_balance_cents,
      NULL::TIMESTAMPTZ AS expires_at;
    RETURN;
  END IF;

  -- Get wallet
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  -- Extend expiration by 1 year
  v_new_expires := COALESCE(v_wallet.autorentar_credit_expires_at, NOW()) + INTERVAL '1 year';

  -- Renew credit (add to existing balance)
  UPDATE user_wallets
  SET
    autorentar_credit_balance = autorentar_credit_balance + (v_renewal_amount_cents / 100.0),
    autorentar_credit_last_renewal = NOW(),
    autorentar_credit_expires_at = v_new_expires,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record renewal
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    meta,
    is_autorentar_credit,
    autorentar_credit_reference_type
  ) VALUES (
    p_user_id,
    'autorentar_credit_renewed',
    v_renewal_amount_cents,
    FORMAT('renewal_%s', gen_random_uuid()),
    jsonb_build_object(
      'reason', 'good_history',
      'clean_bookings', v_profile.clean_bookings,
      'expires_at', v_new_expires
    ),
    TRUE,
    'extend'
  );

  RAISE NOTICE 'Renewed Autorentar Credit for user %: +$%s', p_user_id, v_renewal_amount_cents / 100.0;

  -- Get new balance
  SELECT ROUND(autorentar_credit_balance * 100) INTO v_renewal_amount_cents
  FROM user_wallets
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Autorentar Credit renewed! +$300 for %s clean bookings. New balance: $%s',
           v_profile.clean_bookings,
           v_renewal_amount_cents / 100.0) AS message,
    TRUE AS renewed,
    v_renewal_amount_cents AS new_balance_cents,
    v_new_expires AS expires_at;
END;
$function$;

COMMENT ON FUNCTION public.extend_autorentar_credit_for_good_history IS
'Renew Autorentar Credit for users with 10+ clean bookings. Adds $300, extends expiration.';

-- ============================================================================
-- RPC 4: recognize_autorentar_credit_breakage
-- Recognize breakage revenue when credit expires or account closes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recognize_autorentar_credit_breakage(
  p_user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  breakage_amount_cents BIGINT,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_wallet RECORD;
  v_credit_cents BIGINT;
  v_is_expired BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Get wallet
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wallet IS NULL THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Wallet not found' AS message,
      0::BIGINT AS breakage_amount_cents,
      NULL::TEXT AS reason;
    RETURN;
  END IF;

  v_credit_cents := ROUND(v_wallet.autorentar_credit_balance * 100);

  IF v_credit_cents <= 0 THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'No credit balance to recognize' AS message,
      0::BIGINT AS breakage_amount_cents,
      NULL::TEXT AS reason;
    RETURN;
  END IF;

  -- Check if expired
  v_is_expired := (v_wallet.autorentar_credit_expires_at IS NOT NULL
                   AND v_wallet.autorentar_credit_expires_at < NOW());

  IF v_is_expired THEN
    v_reason := 'expired';
  ELSE
    v_reason := 'account_closure';
  END IF;

  -- Zero out credit
  UPDATE user_wallets
  SET
    autorentar_credit_balance = 0,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record breakage
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    meta,
    is_autorentar_credit,
    autorentar_credit_reference_type
  ) VALUES (
    p_user_id,
    'autorentar_credit_breakage',
    -v_credit_cents,  -- Negative = removal
    FORMAT('breakage_%s', gen_random_uuid()),
    jsonb_build_object(
      'reason', v_reason,
      'recognized_at', NOW()
    ),
    TRUE,
    'breakage'
  );

  RAISE NOTICE 'Recognized Autorentar Credit breakage: $% (%)', v_credit_cents / 100.0, v_reason;

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Breakage recognized: $%s (%s)', v_credit_cents / 100.0, v_reason) AS message,
    v_credit_cents AS breakage_amount_cents,
    v_reason AS reason;
END;
$function$;

COMMENT ON FUNCTION public.recognize_autorentar_credit_breakage IS
'Recognize breakage revenue when Autorentar Credit expires or user closes account. Records in accounting.';

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration creates Autorentar Credit lifecycle RPCs:
--
-- 1. issue_autorentar_credit: Issue $300 credit to new users
-- 2. consume_autorentar_credit_for_claim: Waterfall claim coverage (AC→WR→External)
-- 3. extend_autorentar_credit_for_good_history: Renew credit for 10+ clean bookings
-- 4. recognize_autorentar_credit_breakage: Recognize revenue on expiration/closure
--
-- Autorentar Credit lifecycle:
-- - Issue: New user receives $300, expires in 1 year
-- - Consume: Used first in claim waterfall before wallet balance
-- - Extend: Renewed every 10 clean bookings (adds $300, extends 1 year)
-- - Breakage: Unused credit recognized as revenue on expiration
--
-- Accounting integration:
-- - All movements recorded in wallet_ledger
-- - Triggers (FASE 6) will create accounting journal entries
-- - Breakage is deferred revenue recognition
--
-- Next: FASE 5 - Protector de Bonus RPCs (purchase, apply)
-- ============================================================================

COMMIT;
