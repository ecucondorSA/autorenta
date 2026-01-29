-- ============================================================================
-- MIGRATION: Driver Profile RPCs
-- Date: 2025-11-06
-- Purpose: Core functions for driver risk profile management
-- ============================================================================

BEGIN;

-- ============================================================================
-- RPC 1: get_driver_profile
-- Get complete driver profile with class factors
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_driver_profile(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  class INTEGER,
  driver_score INTEGER,
  good_years INTEGER,
  total_claims INTEGER,
  claims_with_fault INTEGER,
  total_bookings INTEGER,
  clean_bookings INTEGER,
  clean_percentage NUMERIC,
  last_claim_at TIMESTAMPTZ,
  last_claim_with_fault BOOLEAN,
  last_class_update TIMESTAMPTZ,
  fee_multiplier DECIMAL,
  guarantee_multiplier DECIMAL,
  class_description TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_factors RECORD;
  v_clean_pct NUMERIC;
BEGIN
  -- Use provided user_id or auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get profile
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE driver_risk_profile.user_id = v_user_id;

  -- If no profile, return NULL (profile must be initialized first)
  IF v_profile IS NULL THEN
    RETURN;
  END IF;

  -- Get class factors
  SELECT * INTO v_factors
  FROM pricing_class_factors
  WHERE pricing_class_factors.class = v_profile.class;

  -- Calculate clean booking percentage
  IF v_profile.total_bookings > 0 THEN
    v_clean_pct := ROUND((v_profile.clean_bookings::NUMERIC / v_profile.total_bookings) * 100, 2);
  ELSE
    v_clean_pct := 0;
  END IF;

  RETURN QUERY SELECT
    v_profile.user_id,
    v_profile.class,
    v_profile.driver_score,
    v_profile.good_years,
    v_profile.total_claims,
    v_profile.claims_with_fault,
    v_profile.total_bookings,
    v_profile.clean_bookings,
    v_clean_pct AS clean_percentage,
    v_profile.last_claim_at,
    v_profile.last_claim_with_fault,
    v_profile.last_class_update,
    v_factors.fee_multiplier,
    v_factors.guarantee_multiplier,
    v_factors.description AS class_description,
    v_factors.is_active;
END;
$function$;

COMMENT ON FUNCTION public.get_driver_profile IS
'Get complete driver profile including class, score, history, and pricing multipliers.';

-- ============================================================================
-- RPC 2: initialize_driver_profile
-- Create initial profile for new user (class 5 = neutral)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initialize_driver_profile(p_user_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_existing UUID;
BEGIN
  -- Use provided user_id or auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if profile already exists
  SELECT user_id INTO v_existing
  FROM driver_risk_profile
  WHERE user_id = v_user_id;

  IF v_existing IS NOT NULL THEN
    RAISE NOTICE 'Driver profile already exists for user %', v_user_id;
    RETURN v_existing;
  END IF;

  -- Create profile with class 5 (neutral/base)
  INSERT INTO driver_risk_profile (
    user_id,
    class,
    driver_score,
    good_years,
    total_claims,
    claims_with_fault,
    total_bookings,
    clean_bookings,
    last_claim_at,
    last_claim_with_fault,
    last_class_update
  ) VALUES (
    v_user_id,
    5,              -- Class 5 = neutral
    50,             -- Score 50 = average
    0,              -- 0 good years
    0,              -- 0 total claims
    0,              -- 0 claims with fault
    0,              -- 0 total bookings
    0,              -- 0 clean bookings
    NULL,           -- No claims yet
    NULL,
    NOW()
  );

  RAISE NOTICE 'Initialized driver profile for user % with class 5', v_user_id;

  RETURN v_user_id;
END;
$function$;

COMMENT ON FUNCTION public.initialize_driver_profile IS
'Initialize driver risk profile for new user. Starts at class 5 (neutral). Idempotent.';

-- ============================================================================
-- RPC 3: update_driver_class_on_event
-- Update driver class after booking completion or claim
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_driver_class_on_event(
  p_user_id UUID,
  p_booking_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_claim_with_fault BOOLEAN DEFAULT FALSE,
  p_claim_severity INTEGER DEFAULT 1
)
RETURNS TABLE(
  old_class INTEGER,
  new_class INTEGER,
  class_change INTEGER,
  reason TEXT,
  fee_multiplier_old DECIMAL,
  fee_multiplier_new DECIMAL,
  guarantee_multiplier_old DECIMAL,
  guarantee_multiplier_new DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_profile RECORD;
  v_old_class INTEGER;
  v_new_class INTEGER;
  v_class_change INTEGER;
  v_reason TEXT;
  v_old_factors RECORD;
  v_new_factors RECORD;
BEGIN
  -- Get current profile
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found for user %. Call initialize_driver_profile() first.', p_user_id;
  END IF;

  v_old_class := v_profile.class;

  -- Get old factors
  SELECT * INTO v_old_factors
  FROM pricing_class_factors
  WHERE class = v_old_class;

  -- Determine class change based on event
  IF p_claim_id IS NOT NULL AND p_claim_with_fault = TRUE THEN
    -- Claim with fault: MALUS (increase class = worse)
    v_class_change := CASE
      WHEN p_claim_severity = 3 THEN 3  -- Major claim: +3 classes
      WHEN p_claim_severity = 2 THEN 2  -- Moderate claim: +2 classes
      ELSE 1                             -- Minor claim: +1 class
    END;
    v_reason := FORMAT('claim_with_fault_severity_%s', p_claim_severity);

    -- Update claim history
    UPDATE driver_risk_profile
    SET
      total_claims = total_claims + 1,
      claims_with_fault = claims_with_fault + 1,
      last_claim_at = NOW(),
      last_claim_with_fault = TRUE
    WHERE user_id = p_user_id;

  ELSIF p_claim_id IS NOT NULL AND p_claim_with_fault = FALSE THEN
    -- Claim without fault: no class change, just record
    v_class_change := 0;
    v_reason := 'claim_no_fault';

    UPDATE driver_risk_profile
    SET
      total_claims = total_claims + 1,
      last_claim_at = NOW(),
      last_claim_with_fault = FALSE
    WHERE user_id = p_user_id;

  ELSIF p_booking_id IS NOT NULL THEN
    -- Clean booking completed: BONUS (decrease class = better)
    -- Check if user has 5+ clean bookings in a row
    IF v_profile.clean_bookings >= 5 AND v_profile.clean_bookings % 5 = 0 THEN
      v_class_change := -1;  -- Improve class every 5 clean bookings
      v_reason := 'good_history_5_clean_bookings';
    ELSE
      v_class_change := 0;  -- No change yet
      v_reason := 'clean_booking_recorded';
    END IF;

    -- Update booking history
    UPDATE driver_risk_profile
    SET
      total_bookings = total_bookings + 1,
      clean_bookings = clean_bookings + 1
    WHERE user_id = p_user_id;

  ELSE
    RAISE EXCEPTION 'Must provide either booking_id or claim_id';
  END IF;

  -- Calculate new class (bounded 0-10)
  v_new_class := GREATEST(0, LEAST(10, v_old_class + v_class_change));

  -- Update class if changed
  IF v_new_class != v_old_class THEN
    UPDATE driver_risk_profile
    SET
      class = v_new_class,
      last_class_update = NOW()
    WHERE user_id = p_user_id;

    -- Record in history
    INSERT INTO driver_class_history (
      user_id,
      old_class,
      new_class,
      class_change,
      reason,
      booking_id,
      claim_id,
      notes
    ) VALUES (
      p_user_id,
      v_old_class,
      v_new_class,
      v_class_change,
      v_reason,
      p_booking_id,
      p_claim_id,
      FORMAT('Class changed from %s to %s (%s)', v_old_class, v_new_class, v_reason)
    );

    RAISE NOTICE 'Driver class updated: % → % (change: %s, reason: %s)', v_old_class, v_new_class, v_class_change, v_reason;
  ELSE
    RAISE NOTICE 'Driver class unchanged: % (reason: %s)', v_old_class, v_reason;
  END IF;

  -- Get new factors
  SELECT * INTO v_new_factors
  FROM pricing_class_factors
  WHERE class = v_new_class;

  -- Return result
  RETURN QUERY SELECT
    v_old_class AS old_class,
    v_new_class AS new_class,
    v_class_change AS class_change,
    v_reason AS reason,
    v_old_factors.fee_multiplier AS fee_multiplier_old,
    v_new_factors.fee_multiplier AS fee_multiplier_new,
    v_old_factors.guarantee_multiplier AS guarantee_multiplier_old,
    v_new_factors.guarantee_multiplier AS guarantee_multiplier_new;
END;
$function$;

COMMENT ON FUNCTION public.update_driver_class_on_event IS
'Update driver class after booking or claim. Returns old/new class and multipliers. Records history.';

-- ============================================================================
-- RPC 4: get_user_class_benefits
-- Get benefits and requirements for next class
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_class_benefits(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  current_class INTEGER,
  current_class_description TEXT,
  current_fee_multiplier DECIMAL,
  current_guarantee_multiplier DECIMAL,
  next_better_class INTEGER,
  next_better_description TEXT,
  next_better_fee_multiplier DECIMAL,
  next_better_guarantee_multiplier DECIMAL,
  clean_bookings_needed INTEGER,
  can_improve BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_current_factors RECORD;
  v_next_factors RECORD;
  v_next_class INTEGER;
  v_clean_needed INTEGER;
  v_can_improve BOOLEAN;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get profile
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = v_user_id;

  IF v_profile IS NULL THEN
    RETURN;  -- No profile yet
  END IF;

  -- Get current factors
  SELECT * INTO v_current_factors
  FROM pricing_class_factors
  WHERE class = v_profile.class;

  -- Calculate next better class
  v_next_class := GREATEST(0, v_profile.class - 1);
  v_can_improve := (v_profile.class > 0);

  -- Get next class factors
  IF v_can_improve THEN
    SELECT * INTO v_next_factors
    FROM pricing_class_factors
    WHERE class = v_next_class;

    -- Calculate clean bookings needed (5 per class improvement)
    v_clean_needed := 5 - (v_profile.clean_bookings % 5);
  ELSE
    v_next_factors := NULL;
    v_clean_needed := NULL;
  END IF;

  RETURN QUERY SELECT
    v_profile.class AS current_class,
    v_current_factors.description AS current_class_description,
    v_current_factors.fee_multiplier AS current_fee_multiplier,
    v_current_factors.guarantee_multiplier AS current_guarantee_multiplier,
    v_next_class AS next_better_class,
    v_next_factors.description AS next_better_description,
    v_next_factors.fee_multiplier AS next_better_fee_multiplier,
    v_next_factors.guarantee_multiplier AS next_better_guarantee_multiplier,
    v_clean_needed AS clean_bookings_needed,
    v_can_improve AS can_improve;
END;
$function$;

COMMENT ON FUNCTION public.get_user_class_benefits IS
'Get current class benefits and requirements to reach next better class. Used for motivation/gamification.';

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration creates core RPCs for driver profile management:
--
-- 1. get_driver_profile: Get complete profile with factors
-- 2. initialize_driver_profile: Create profile for new user (class 5)
-- 3. update_driver_class_on_event: Update class after booking/claim
-- 4. get_user_class_benefits: Get progression info for UI
--
-- Class change logic:
-- - Clean booking: Improve 1 class every 5 clean bookings
-- - Minor claim (severity 1): +1 class (worse)
-- - Moderate claim (severity 2): +2 classes (worse)
-- - Major claim (severity 3): +3 classes (worse)
-- - No-fault claim: No class change, just recorded
--
-- Classes are bounded 0-10 (can't go below 0 or above 10).
--
-- Next migrations will create pricing RPCs (FASE 3) that use these classes.
-- ============================================================================

COMMIT;
