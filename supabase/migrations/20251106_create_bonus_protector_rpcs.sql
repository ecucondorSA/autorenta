-- ============================================================================
-- MIGRATION: Bonus Protector RPCs
-- Date: 2025-11-06
-- Purpose: Manage Bonus Protector addon (protect class on claim)
-- ============================================================================

BEGIN;

-- ============================================================================
-- RPC 1: purchase_bonus_protector
-- Purchase Bonus Protector addon to protect class from downgrade
-- ============================================================================

CREATE OR REPLACE FUNCTION public.purchase_bonus_protector(
  p_user_id UUID,
  p_protection_level INTEGER DEFAULT 1,
  p_price_cents BIGINT DEFAULT 1500  -- $15 USD default
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  addon_id UUID,
  protection_level INTEGER,
  max_protected_claims INTEGER,
  expires_at TIMESTAMPTZ,
  price_paid_cents BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_wallet RECORD;
  v_addon_id UUID;
  v_max_claims INTEGER;
  v_expires TIMESTAMPTZ;
BEGIN
  -- Validate protection level
  IF p_protection_level < 1 OR p_protection_level > 3 THEN
    RAISE EXCEPTION 'Protection level must be between 1 and 3';
  END IF;

  -- Get wallet
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wallet IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Check sufficient funds
  IF v_wallet.available_balance < (p_price_cents / 100.0) THEN
    RETURN QUERY SELECT
      FALSE AS success,
      FORMAT('Insufficient funds. Need $%s, have $%s',
             p_price_cents / 100.0,
             v_wallet.available_balance) AS message,
      NULL::UUID AS addon_id,
      NULL::INTEGER AS protection_level,
      NULL::INTEGER AS max_protected_claims,
      NULL::TIMESTAMPTZ AS expires_at,
      NULL::BIGINT AS price_paid_cents;
    RETURN;
  END IF;

  -- Calculate max claims based on level
  v_max_claims := p_protection_level;  -- Level 1 = 1 claim, Level 2 = 2 claims, Level 3 = 3 claims

  -- Expires in 6 months
  v_expires := NOW() + INTERVAL '6 months';

  -- Deduct from wallet
  UPDATE user_wallets
  SET
    available_balance = available_balance - (p_price_cents / 100.0),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Create addon
  INSERT INTO driver_protection_addons (
    user_id,
    addon_type,
    purchase_date,
    expires_at,
    price_paid_cents,
    currency,
    protection_level,
    max_protected_claims,
    claims_used,
    is_active
  ) VALUES (
    p_user_id,
    'bonus_protector',
    NOW(),
    v_expires,
    p_price_cents,
    'USD',
    p_protection_level,
    v_max_claims,
    0,
    TRUE
  )
  RETURNING id INTO v_addon_id;

  -- Record transaction
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    meta
  ) VALUES (
    p_user_id,
    'addon_purchase',
    -p_price_cents,
    FORMAT('bonus_protector_%s', v_addon_id),
    jsonb_build_object(
      'addon_id', v_addon_id,
      'addon_type', 'bonus_protector',
      'protection_level', p_protection_level,
      'expires_at', v_expires
    )
  );

  RAISE NOTICE 'Purchased Bonus Protector Level % for user %: $%', p_protection_level, p_user_id, p_price_cents / 100.0;

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Bonus Protector Level %s purchased! Protects against %s claim(s). Expires %s.',
           p_protection_level,
           v_max_claims,
           v_expires::DATE) AS message,
    v_addon_id AS addon_id,
    p_protection_level AS protection_level,
    v_max_claims AS max_protected_claims,
    v_expires AS expires_at,
    p_price_cents AS price_paid_cents;
END;
$function$;

COMMENT ON FUNCTION public.purchase_bonus_protector IS
'Purchase Bonus Protector addon. Protects driver class from downgrade on claim. Levels 1-3, expires in 6 months.';

-- ============================================================================
-- RPC 2: apply_bonus_protector
-- Apply Bonus Protector when processing a claim (prevents class downgrade)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_bonus_protector(
  p_user_id UUID,
  p_claim_id UUID,
  p_claim_severity INTEGER
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  protection_applied BOOLEAN,
  class_before INTEGER,
  class_after INTEGER,
  class_change_prevented INTEGER,
  addon_id UUID,
  remaining_uses INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_addon RECORD;
  v_profile RECORD;
  v_class_before INTEGER;
  v_class_after INTEGER;
  v_class_change INTEGER;
  v_protection_applied BOOLEAN := FALSE;
BEGIN
  -- Get active Bonus Protector
  SELECT * INTO v_addon
  FROM driver_protection_addons
  WHERE user_id = p_user_id
    AND addon_type = 'bonus_protector'
    AND is_active = TRUE
    AND claims_used < max_protected_claims
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY purchase_date DESC
  LIMIT 1;

  -- Get current profile
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found for user %', p_user_id;
  END IF;

  v_class_before := v_profile.class;

  -- If no active protector, no protection
  IF v_addon IS NULL THEN
    RETURN QUERY SELECT
      TRUE AS success,
      'No active Bonus Protector. Class will be affected by claim.' AS message,
      FALSE AS protection_applied,
      v_class_before AS class_before,
      v_class_before AS class_after,  -- No change yet, will be changed by update_driver_class_on_event
      0 AS class_change_prevented,
      NULL::UUID AS addon_id,
      0 AS remaining_uses;
    RETURN;
  END IF;

  -- Protection applies: prevent class downgrade
  v_protection_applied := TRUE;

  -- Calculate what the class change would have been
  v_class_change := CASE
    WHEN p_claim_severity = 3 THEN 3
    WHEN p_claim_severity = 2 THEN 2
    ELSE 1
  END;

  -- Mark protector as used
  UPDATE driver_protection_addons
  SET
    claims_used = claims_used + 1,
    is_active = CASE WHEN (claims_used + 1) >= max_protected_claims THEN FALSE ELSE TRUE END,
    used_at = NOW()
  WHERE id = v_addon.id;

  -- Record in history that protection was applied
  INSERT INTO driver_class_history (
    user_id,
    old_class,
    new_class,
    class_change,
    reason,
    claim_id,
    notes
  ) VALUES (
    p_user_id,
    v_class_before,
    v_class_before,  -- No change
    0,  -- Protected
    'bonus_protector_applied',
    p_claim_id,
    FORMAT('Bonus Protector prevented class change of +%s (severity %s)', v_class_change, p_claim_severity)
  );

  RAISE NOTICE 'Applied Bonus Protector for user %: prevented class change +%s', p_user_id, v_class_change;

  v_class_after := v_class_before;  -- No change due to protection

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Bonus Protector applied! Your class remains %s. Protection uses left: %s/%s.',
           v_class_after,
           v_addon.max_protected_claims - v_addon.claims_used - 1,
           v_addon.max_protected_claims) AS message,
    TRUE AS protection_applied,
    v_class_before AS class_before,
    v_class_after AS class_after,
    v_class_change AS class_change_prevented,
    v_addon.id AS addon_id,
    v_addon.max_protected_claims - v_addon.claims_used - 1 AS remaining_uses;
END;
$function$;

COMMENT ON FUNCTION public.apply_bonus_protector IS
'Apply Bonus Protector when processing claim. Prevents class downgrade, marks addon as used.';

-- ============================================================================
-- RPC 3: get_active_bonus_protector
-- Get user''s active Bonus Protector status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_active_bonus_protector(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  has_active_protector BOOLEAN,
  addon_id UUID,
  protection_level INTEGER,
  max_protected_claims INTEGER,
  claims_used INTEGER,
  remaining_uses INTEGER,
  purchase_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  days_until_expiration INTEGER,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_addon RECORD;
  v_days_until_exp INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get active protector
  SELECT * INTO v_addon
  FROM driver_protection_addons
  WHERE user_id = v_user_id
    AND addon_type = 'bonus_protector'
    AND is_active = TRUE
    AND claims_used < max_protected_claims
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY purchase_date DESC
  LIMIT 1;

  -- If no active protector
  IF v_addon IS NULL THEN
    RETURN QUERY SELECT
      FALSE AS has_active_protector,
      NULL::UUID, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER,
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::INTEGER, FALSE AS is_expired;
    RETURN;
  END IF;

  -- Calculate days until expiration
  IF v_addon.expires_at IS NOT NULL THEN
    v_days_until_exp := EXTRACT(DAY FROM (v_addon.expires_at - NOW()));
  ELSE
    v_days_until_exp := NULL;
  END IF;

  RETURN QUERY SELECT
    TRUE AS has_active_protector,
    v_addon.id AS addon_id,
    v_addon.protection_level,
    v_addon.max_protected_claims,
    v_addon.claims_used,
    v_addon.max_protected_claims - v_addon.claims_used AS remaining_uses,
    v_addon.purchase_date,
    v_addon.expires_at,
    v_days_until_exp AS days_until_expiration,
    (v_addon.expires_at IS NOT NULL AND v_addon.expires_at < NOW()) AS is_expired;
END;
$function$;

COMMENT ON FUNCTION public.get_active_bonus_protector IS
'Get user''s active Bonus Protector status and remaining uses. Used for UI display.';

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration creates Bonus Protector RPCs:
--
-- 1. purchase_bonus_protector: Buy protection addon (Levels 1-3)
-- 2. apply_bonus_protector: Use protection when claim occurs
-- 3. get_active_bonus_protector: Get status for UI display
--
-- Bonus Protector mechanics:
-- - Purchased with wallet balance ($15-45 depending on level)
-- - Protects against class downgrade on claims with fault
-- - Level 1 = 1 protected claim, Level 2 = 2 claims, Level 3 = 3 claims
-- - Expires in 6 months
-- - Applied automatically when update_driver_class_on_event detects active protector
--
-- Integration:
-- - Called from claim processing workflow
-- - UI displays protection status in driver profile
-- - Accounting (FASE 6) records purchase revenue
--
-- Next: FASE 6 - Accounting integration (cuentas contables + triggers)
-- ============================================================================

COMMIT;
