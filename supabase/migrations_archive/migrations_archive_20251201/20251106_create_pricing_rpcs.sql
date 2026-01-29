-- ============================================================================
-- MIGRATION: Pricing RPCs with Driver Class Integration
-- Date: 2025-11-06
-- Purpose: Calculate fees and guarantees adjusted by driver class and score
-- ============================================================================

BEGIN;

-- ============================================================================
-- RPC 1: compute_fee_with_class
-- Calculate rental fee adjusted by driver class and telemetry score
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_fee_with_class(
  p_user_id UUID,
  p_base_fee_cents BIGINT,
  p_telematic_score INTEGER DEFAULT NULL
)
RETURNS TABLE(
  base_fee_cents BIGINT,
  class_multiplier DECIMAL,
  score_multiplier DECIMAL,
  adjusted_fee_cents BIGINT,
  driver_class INTEGER,
  driver_score INTEGER,
  savings_cents BIGINT,  -- Negative if surcharge
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_profile RECORD;
  v_factors RECORD;
  v_class_mult DECIMAL;
  v_score_mult DECIMAL;
  v_adjusted_fee BIGINT;
  v_savings BIGINT;
  v_driver_score INTEGER;
BEGIN
  -- Validate inputs
  IF p_base_fee_cents <= 0 THEN
    RAISE EXCEPTION 'Base fee must be positive';
  END IF;

  -- Get driver profile
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  -- If no profile, use class 5 (neutral)
  IF v_profile IS NULL THEN
    RAISE NOTICE 'No driver profile found for user %, using class 5 (neutral)', p_user_id;

    SELECT * INTO v_factors
    FROM pricing_class_factors
    WHERE class = 5;

    v_class_mult := v_factors.fee_multiplier;
    v_driver_score := COALESCE(p_telematic_score, 50);

  ELSE
    -- Get class factors
    SELECT * INTO v_factors
    FROM pricing_class_factors
    WHERE class = v_profile.class;

    v_class_mult := v_factors.fee_multiplier;
    v_driver_score := COALESCE(p_telematic_score, v_profile.driver_score, 50);
  END IF;

  -- Calculate score multiplier (score 0-100 → multiplier 0.90-1.10)
  -- Score 100 = 0.90 (10% discount)
  -- Score 50 = 1.00 (neutral)
  -- Score 0 = 1.10 (10% surcharge)
  v_score_mult := 1.10 - (v_driver_score::DECIMAL / 100 * 0.20);

  -- Calculate adjusted fee
  v_adjusted_fee := ROUND(p_base_fee_cents * v_class_mult * v_score_mult);

  -- Calculate savings (negative = surcharge)
  v_savings := p_base_fee_cents - v_adjusted_fee;

  RETURN QUERY SELECT
    p_base_fee_cents AS base_fee_cents,
    v_class_mult AS class_multiplier,
    v_score_mult AS score_multiplier,
    v_adjusted_fee AS adjusted_fee_cents,
    COALESCE(v_profile.class, 5) AS driver_class,
    v_driver_score AS driver_score,
    v_savings AS savings_cents,
    'USD'::TEXT AS currency;
END;
$function$;

COMMENT ON FUNCTION public.compute_fee_with_class IS
'Calculate rental fee adjusted by driver class (0-10) and telemetry score (0-100). Returns breakdown.';

-- ============================================================================
-- RPC 2: compute_guarantee_with_class
-- Calculate security deposit adjusted by driver class and card presence
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_guarantee_with_class(
  p_user_id UUID,
  p_base_guarantee_usd NUMERIC,
  p_has_card BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  base_guarantee_usd NUMERIC,
  class_multiplier DECIMAL,
  card_discount DECIMAL,
  adjusted_guarantee_usd NUMERIC,
  driver_class INTEGER,
  savings_usd NUMERIC,  -- Negative if surcharge
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_profile RECORD;
  v_factors RECORD;
  v_class_mult DECIMAL;
  v_card_discount DECIMAL;
  v_adjusted_guarantee NUMERIC;
  v_savings NUMERIC;
BEGIN
  -- Validate inputs
  IF p_base_guarantee_usd <= 0 THEN
    RAISE EXCEPTION 'Base guarantee must be positive';
  END IF;

  -- Get driver profile
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  -- If no profile, use class 5 (neutral)
  IF v_profile IS NULL THEN
    RAISE NOTICE 'No driver profile found for user %, using class 5 (neutral)', p_user_id;

    SELECT * INTO v_factors
    FROM pricing_class_factors
    WHERE class = 5;

  ELSE
    -- Get class factors
    SELECT * INTO v_factors
    FROM pricing_class_factors
    WHERE class = v_profile.class;
  END IF;

  v_class_mult := v_factors.guarantee_multiplier;

  -- Card discount: 20% off if has card
  v_card_discount := CASE WHEN p_has_card THEN 0.80 ELSE 1.00 END;

  -- Calculate adjusted guarantee
  v_adjusted_guarantee := ROUND(p_base_guarantee_usd * v_class_mult * v_card_discount, 2);

  -- Calculate savings (negative = surcharge)
  v_savings := p_base_guarantee_usd - v_adjusted_guarantee;

  RETURN QUERY SELECT
    p_base_guarantee_usd AS base_guarantee_usd,
    v_class_mult AS class_multiplier,
    v_card_discount AS card_discount,
    v_adjusted_guarantee AS adjusted_guarantee_usd,
    COALESCE(v_profile.class, 5) AS driver_class,
    v_savings AS savings_usd,
    'USD'::TEXT AS currency;
END;
$function$;

COMMENT ON FUNCTION public.compute_guarantee_with_class IS
'Calculate security deposit adjusted by driver class and card presence. Returns breakdown.';

-- ============================================================================
-- RPC 3: get_booking_pricing_breakdown
-- Complete pricing breakdown for a booking (fee + guarantee)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_booking_pricing_breakdown(
  p_user_id UUID,
  p_base_fee_cents BIGINT,
  p_base_guarantee_usd NUMERIC,
  p_has_card BOOLEAN DEFAULT FALSE,
  p_telematic_score INTEGER DEFAULT NULL
)
RETURNS TABLE(
  -- Fee breakdown
  base_fee_cents BIGINT,
  adjusted_fee_cents BIGINT,
  fee_class_multiplier DECIMAL,
  fee_score_multiplier DECIMAL,
  fee_savings_cents BIGINT,

  -- Guarantee breakdown
  base_guarantee_usd NUMERIC,
  adjusted_guarantee_usd NUMERIC,
  guarantee_class_multiplier DECIMAL,
  guarantee_card_discount DECIMAL,
  guarantee_savings_usd NUMERIC,

  -- Driver info
  driver_class INTEGER,
  driver_score INTEGER,
  class_description TEXT,

  -- Currency
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_fee RECORD;
  v_guarantee RECORD;
  v_factors RECORD;
BEGIN
  -- Calculate fee
  SELECT * INTO v_fee
  FROM compute_fee_with_class(p_user_id, p_base_fee_cents, p_telematic_score);

  -- Calculate guarantee
  SELECT * INTO v_guarantee
  FROM compute_guarantee_with_class(p_user_id, p_base_guarantee_usd, p_has_card);

  -- Get class description
  SELECT * INTO v_factors
  FROM pricing_class_factors
  WHERE class = v_fee.driver_class;

  RETURN QUERY SELECT
    v_fee.base_fee_cents,
    v_fee.adjusted_fee_cents,
    v_fee.class_multiplier AS fee_class_multiplier,
    v_fee.score_multiplier AS fee_score_multiplier,
    v_fee.savings_cents AS fee_savings_cents,

    v_guarantee.base_guarantee_usd,
    v_guarantee.adjusted_guarantee_usd,
    v_guarantee.class_multiplier AS guarantee_class_multiplier,
    v_guarantee.card_discount AS guarantee_card_discount,
    v_guarantee.savings_usd AS guarantee_savings_usd,

    v_fee.driver_class,
    v_fee.driver_score,
    v_factors.description AS class_description,

    'USD'::TEXT AS currency;
END;
$function$;

COMMENT ON FUNCTION public.get_booking_pricing_breakdown IS
'Get complete pricing breakdown (fee + guarantee) for a booking with all adjustments. Used for quote display.';

-- ============================================================================
-- RPC 4: estimate_class_impact
-- Estimate how class change would affect pricing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.estimate_class_impact(
  p_user_id UUID,
  p_target_class INTEGER,
  p_base_fee_cents BIGINT,
  p_base_guarantee_usd NUMERIC
)
RETURNS TABLE(
  current_class INTEGER,
  target_class INTEGER,
  current_fee_cents BIGINT,
  target_fee_cents BIGINT,
  fee_difference_cents BIGINT,
  current_guarantee_usd NUMERIC,
  target_guarantee_usd NUMERIC,
  guarantee_difference_usd NUMERIC,
  improvement BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_profile RECORD;
  v_current_factors RECORD;
  v_target_factors RECORD;
  v_current_fee BIGINT;
  v_target_fee BIGINT;
  v_current_guarantee NUMERIC;
  v_target_guarantee NUMERIC;
BEGIN
  -- Validate target class
  IF p_target_class < 0 OR p_target_class > 10 THEN
    RAISE EXCEPTION 'Target class must be between 0 and 10';
  END IF;

  -- Get current profile
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  IF v_profile IS NULL THEN
    -- No profile, use class 5
    SELECT * INTO v_current_factors FROM pricing_class_factors WHERE class = 5;
  ELSE
    SELECT * INTO v_current_factors FROM pricing_class_factors WHERE class = v_profile.class;
  END IF;

  -- Get target factors
  SELECT * INTO v_target_factors FROM pricing_class_factors WHERE class = p_target_class;

  -- Calculate current pricing
  v_current_fee := ROUND(p_base_fee_cents * v_current_factors.fee_multiplier);
  v_current_guarantee := ROUND(p_base_guarantee_usd * v_current_factors.guarantee_multiplier, 2);

  -- Calculate target pricing
  v_target_fee := ROUND(p_base_fee_cents * v_target_factors.fee_multiplier);
  v_target_guarantee := ROUND(p_base_guarantee_usd * v_target_factors.guarantee_multiplier, 2);

  RETURN QUERY SELECT
    COALESCE(v_profile.class, 5) AS current_class,
    p_target_class AS target_class,
    v_current_fee AS current_fee_cents,
    v_target_fee AS target_fee_cents,
    (v_current_fee - v_target_fee) AS fee_difference_cents,
    v_current_guarantee AS current_guarantee_usd,
    v_target_guarantee AS target_guarantee_usd,
    (v_current_guarantee - v_target_guarantee) AS guarantee_difference_usd,
    (p_target_class < COALESCE(v_profile.class, 5)) AS improvement;
END;
$function$;

COMMENT ON FUNCTION public.estimate_class_impact IS
'Estimate pricing impact of reaching a different class. Used for motivation/gamification.';

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration creates pricing RPCs that integrate driver classification:
--
-- 1. compute_fee_with_class: Adjust rental fee by class + telemetry score
-- 2. compute_guarantee_with_class: Adjust security deposit by class + card
-- 3. get_booking_pricing_breakdown: Complete breakdown for UI display
-- 4. estimate_class_impact: Show user how improving class affects pricing
--
-- Pricing logic:
-- - Fee: base * class_multiplier * score_multiplier
-- - Guarantee: base * class_multiplier * card_discount
-- - Class multipliers from pricing_class_factors table
-- - Score multiplier: 0.90 (score 100) to 1.10 (score 0)
-- - Card discount: 20% off guarantee if has card
--
-- Integration points:
-- - RiskCalculatorService.calculateRisk() will call these RPCs
-- - BookingsService will use for quote calculation
-- - UI will display breakdown to users
--
-- Next: FASE 4 - Autorentar Credit RPCs (issue, consume, extend, breakage)
-- ============================================================================

COMMIT;
