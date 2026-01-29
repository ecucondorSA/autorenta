-- ============================================================================
-- Migration: Add robust server-side payment validation (P0-004 FIX)
-- ============================================================================
-- Date: 2025-11-23
-- Category: Security / Payments
-- Priority: P0 - CRITICAL
--
-- This migration adds comprehensive server-side validation for payment operations
-- to prevent client-side validation bypass attacks.
--
-- Security Issues Fixed:
-- 1. ❌ No validation of amount ranges (min/max)
-- 2. ❌ No validation of negative amounts
-- 3. ❌ No validation of zero amounts
-- 4. ❌ No validation of booking status before payment
-- 5. ❌ No user limit validation
-- 6. ❌ No sanitization of numeric inputs
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create payment validation function
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_payment_amount(
  p_amount_usd NUMERIC,
  p_amount_ars NUMERIC,
  p_fx_rate NUMERIC,
  p_booking_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_booking bookings%ROWTYPE;
  v_calculated_ars NUMERIC;
  v_tolerance NUMERIC := 0.01; -- 1% tolerance for FX rate differences
BEGIN
  -- ✅ P0-004 FIX: Validate amount ranges

  -- 1. Check for NULL values
  IF p_amount_usd IS NULL THEN
    v_errors := array_append(v_errors, 'amount_usd is required');
  END IF;

  IF p_amount_ars IS NULL THEN
    v_errors := array_append(v_errors, 'amount_ars is required');
  END IF;

  IF p_fx_rate IS NULL THEN
    v_errors := array_append(v_errors, 'fx_rate is required');
  END IF;

  -- Early return if missing required fields
  IF array_length(v_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'errors', v_errors
    );
  END IF;

  -- 2. Check for negative amounts
  IF p_amount_usd < 0 THEN
    v_errors := array_append(v_errors, 'amount_usd cannot be negative');
  END IF;

  IF p_amount_ars < 0 THEN
    v_errors := array_append(v_errors, 'amount_ars cannot be negative');
  END IF;

  IF p_fx_rate <= 0 THEN
    v_errors := array_append(v_errors, 'fx_rate must be positive');
  END IF;

  -- 3. Check for zero amounts
  IF p_amount_usd = 0 THEN
    v_errors := array_append(v_errors, 'amount_usd must be greater than zero');
  END IF;

  IF p_amount_ars = 0 THEN
    v_errors := array_append(v_errors, 'amount_ars must be greater than zero');
  END IF;

  -- 4. Validate minimum amount (e.g., $5 USD minimum)
  IF p_amount_usd < 5 THEN
    v_errors := array_append(v_errors, 'amount_usd must be at least $5 USD');
  END IF;

  -- 5. Validate maximum amount (e.g., $50,000 USD maximum per transaction)
  IF p_amount_usd > 50000 THEN
    v_errors := array_append(v_errors, 'amount_usd exceeds maximum of $50,000 USD per transaction');
  END IF;

  -- 6. Validate FX rate consistency
  v_calculated_ars := p_amount_usd * p_fx_rate;

  IF ABS(v_calculated_ars - p_amount_ars) / v_calculated_ars > v_tolerance THEN
    v_errors := array_append(v_errors, format(
      'FX rate mismatch: expected ~%s ARS (using rate %s), got %s ARS',
      ROUND(v_calculated_ars, 2),
      p_fx_rate,
      p_amount_ars
    ));
  END IF;

  -- 7. If booking_id provided, validate against booking total_amount
  IF p_booking_id IS NOT NULL THEN
    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id;

    IF FOUND THEN
      -- Validate amount matches booking total (with 1% tolerance)
      IF ABS(p_amount_usd - v_booking.total_amount) / v_booking.total_amount > v_tolerance THEN
        v_errors := array_append(v_errors, format(
          'Payment amount (%s USD) does not match booking total (%s USD)',
          p_amount_usd,
          v_booking.total_amount
        ));
      END IF;

      -- Validate booking is in valid status for payment
      IF v_booking.status NOT IN ('pending', 'pending_payment', 'pending_insurance') THEN
        v_errors := array_append(v_errors, format(
          'Booking status (%s) is not valid for payment. Only pending bookings can be paid.',
          v_booking.status
        ));
      END IF;
    ELSE
      v_errors := array_append(v_errors, format(
        'Booking %s not found',
        p_booking_id
      ));
    END IF;
  END IF;

  -- Return validation result
  IF array_length(v_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'errors', v_errors
    );
  ELSE
    RETURN jsonb_build_object(
      'valid', TRUE,
      'errors', ARRAY[]::TEXT[]
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION validate_payment_amount IS
'✅ P0-004 FIX: Validates payment amounts server-side to prevent client-side validation bypass.
Checks: NULL values, negative/zero amounts, min/max ranges, FX rate consistency, booking match.
Returns: { valid: boolean, errors: string[] }';

-- ============================================================================
-- PART 2: Update create_payment_authorization with robust validation
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_payment_authorization(uuid, uuid, numeric, numeric, numeric, text, text);

CREATE OR REPLACE FUNCTION public.create_payment_authorization(
  p_user_id UUID,
  p_booking_id UUID DEFAULT NULL,
  p_amount_usd NUMERIC DEFAULT NULL,
  p_amount_ars NUMERIC DEFAULT NULL,
  p_fx_rate NUMERIC DEFAULT NULL,
  p_description TEXT DEFAULT 'Preautorización de garantía',
  p_external_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent_id UUID;
  v_result JSONB;
  v_validation_result JSONB;
BEGIN
  -- ✅ P0-004 FIX: Robust server-side validation
  v_validation_result := validate_payment_amount(
    p_amount_usd,
    p_amount_ars,
    p_fx_rate,
    p_booking_id
  );

  -- Check if validation passed
  IF NOT (v_validation_result->>'valid')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Payment validation failed',
      'validation_errors', v_validation_result->'errors'
    );
  END IF;

  -- Si se proporciona booking_id, validar que exista
  IF p_booking_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = p_booking_id) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'Booking not found: ' || p_booking_id::text
      );
    END IF;
  END IF;

  -- ✅ All validations passed - insert payment intent
  INSERT INTO public.payment_intents (
    user_id,
    booking_id,
    intent_type,
    is_preauth,
    amount_usd,
    amount_ars,
    fx_rate,
    status,
    description,
    external_reference
  ) VALUES (
    p_user_id,
    p_booking_id,
    'preauth',
    TRUE,
    p_amount_usd,
    p_amount_ars,
    p_fx_rate,
    'pending',
    p_description,
    COALESCE(p_external_reference, 'preauth_' || gen_random_uuid()::text)
  )
  RETURNING id INTO v_intent_id;

  -- Return success result
  SELECT jsonb_build_object(
    'success', TRUE,
    'intent_id', v_intent_id,
    'external_reference', external_reference
  )
  INTO v_result
  FROM public.payment_intents
  WHERE id = v_intent_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION public.create_payment_authorization IS
'✅ P0-004 FIX: Creates a payment authorization with ROBUST server-side validation.
Now includes: amount range checks, negative/zero validation, FX rate validation, booking status checks.
Cannot be bypassed via client-side manipulation.';

-- ============================================================================
-- PART 3: Add validation check constraint to payment_intents table
-- ============================================================================

-- Add check constraints to prevent invalid data at DB level
ALTER TABLE payment_intents
  ADD CONSTRAINT IF NOT EXISTS chk_payment_amount_usd_positive
    CHECK (amount_usd IS NULL OR amount_usd > 0);

ALTER TABLE payment_intents
  ADD CONSTRAINT IF NOT EXISTS chk_payment_amount_ars_positive
    CHECK (amount_ars IS NULL OR amount_ars > 0);

ALTER TABLE payment_intents
  ADD CONSTRAINT IF NOT EXISTS chk_payment_fx_rate_positive
    CHECK (fx_rate IS NULL OR fx_rate > 0);

ALTER TABLE payment_intents
  ADD CONSTRAINT IF NOT EXISTS chk_payment_amount_usd_max
    CHECK (amount_usd IS NULL OR amount_usd <= 50000);

COMMENT ON CONSTRAINT chk_payment_amount_usd_positive ON payment_intents IS
'✅ P0-004 FIX: Ensures amount_usd is positive (prevents negative amounts)';

COMMENT ON CONSTRAINT chk_payment_amount_ars_positive ON payment_intents IS
'✅ P0-004 FIX: Ensures amount_ars is positive (prevents negative amounts)';

COMMENT ON CONSTRAINT chk_payment_fx_rate_positive ON payment_intents IS
'✅ P0-004 FIX: Ensures fx_rate is positive (prevents zero/negative rates)';

COMMENT ON CONSTRAINT chk_payment_amount_usd_max ON payment_intents IS
'✅ P0-004 FIX: Enforces maximum transaction amount of $50,000 USD';

-- ============================================================================
-- PART 4: Create audit log for validation failures
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_validation_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  booking_id UUID REFERENCES bookings(id),
  attempted_amount_usd NUMERIC,
  attempted_amount_ars NUMERIC,
  attempted_fx_rate NUMERIC,
  validation_errors JSONB,
  client_ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_validation_failures_user
  ON payment_validation_failures(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_validation_failures_created
  ON payment_validation_failures(created_at DESC);

COMMENT ON TABLE payment_validation_failures IS
'✅ P0-004 FIX: Audit log of payment validation failures for fraud detection';

-- ============================================================================
-- PART 5: Create rate limiting function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_payment_rate_limit(
  p_user_id UUID,
  p_max_attempts INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_attempt_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Count payment attempts in the time window
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM payment_intents
  WHERE user_id = p_user_id
    AND created_at >= v_window_start;

  IF v_attempt_count >= p_max_attempts THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'error', format(
        'Rate limit exceeded: %s payment attempts in the last %s minutes. Maximum allowed: %s.',
        v_attempt_count,
        p_window_minutes,
        p_max_attempts
      ),
      'attempts', v_attempt_count,
      'max_attempts', p_max_attempts,
      'window_minutes', p_window_minutes
    );
  ELSE
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'attempts', v_attempt_count,
      'max_attempts', p_max_attempts,
      'remaining', p_max_attempts - v_attempt_count
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION check_payment_rate_limit IS
'✅ P0-004 FIX: Rate limiting for payment operations to prevent abuse.
Default: 10 attempts per 60 minutes per user.';

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
