-- ============================================================================
-- Migration: Atomic Split Payment Validation
-- P0-3: Ensure split payment validation and booking confirmation are atomic
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE FUNCTION: validate_and_confirm_split_payment
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_and_confirm_split_payment(
  p_booking_id UUID,
  p_mp_payment_id TEXT,
  p_mp_status TEXT,
  p_mp_status_detail TEXT,
  p_transaction_amount NUMERIC,
  p_currency_id TEXT,
  p_payment_method_id TEXT,
  p_date_approved TIMESTAMPTZ,
  p_collector_id TEXT,
  p_marketplace_fee NUMERIC,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_car RECORD;
  v_owner_profile RECORD;
  v_expected_collector_id TEXT;
  v_expected_owner_amount NUMERIC;
  v_expected_platform_fee NUMERIC;
  v_calculated_total NUMERIC;
  v_amount_difference NUMERIC;
  v_validation_passed BOOLEAN := TRUE;
  v_validation_issues JSONB := '[]'::JSONB;
  v_result JSONB;
BEGIN
  -- ========================================
  -- STEP 1: Lock and validate booking exists
  -- ========================================
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;  -- Lock row to prevent concurrent modifications

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'BOOKING_NOT_FOUND',
      'message', 'Booking not found: ' || p_booking_id
    );
  END IF;

  -- Validate booking is in correct state
  IF v_booking.status NOT IN ('pending', 'pending_payment') THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'already_processed', TRUE,
      'message', 'Booking already processed with status: ' || v_booking.status,
      'booking_id', p_booking_id
    );
  END IF;

  -- ========================================
  -- STEP 2: Get car owner info for validation
  -- ========================================
  SELECT c.*, p.mercadopago_collector_id
  INTO v_car
  FROM cars c
  LEFT JOIN profiles p ON c.owner_id = p.id
  WHERE c.id = v_booking.car_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'CAR_NOT_FOUND',
      'message', 'Car not found for booking'
    );
  END IF;

  v_expected_collector_id := v_car.mercadopago_collector_id;

  -- ========================================
  -- STEP 3: Extract expected amounts from metadata
  -- ========================================
  v_expected_owner_amount := COALESCE((p_metadata->>'owner_amount_ars')::NUMERIC, 0);
  v_expected_platform_fee := COALESCE((p_metadata->>'platform_fee_ars')::NUMERIC, 0);

  -- ========================================
  -- STEP 4: Validate collector_id
  -- ========================================
  IF v_expected_collector_id IS NOT NULL AND p_collector_id IS NOT NULL THEN
    IF p_collector_id != v_expected_collector_id THEN
      v_validation_passed := FALSE;
      v_validation_issues := v_validation_issues || jsonb_build_object(
        'type', 'split_collector_mismatch',
        'expected', v_expected_collector_id,
        'received', p_collector_id,
        'severity', 'critical'
      );

      -- Insert into payment_issues atomically
      INSERT INTO payment_issues (
        booking_id,
        payment_id,
        issue_type,
        severity,
        description,
        metadata,
        detected_at
      ) VALUES (
        p_booking_id,
        p_mp_payment_id,
        'split_collector_mismatch',
        'critical',
        'Split payment collector ID mismatch',
        jsonb_build_object(
          'expected_collector_id', v_expected_collector_id,
          'received_collector_id', p_collector_id,
          'payment_amount', p_transaction_amount,
          'currency', p_currency_id
        ),
        NOW()
      );
    END IF;
  END IF;

  -- ========================================
  -- STEP 5: Validate amounts
  -- ========================================
  v_calculated_total := v_expected_owner_amount + v_expected_platform_fee;
  v_amount_difference := ABS(v_calculated_total - p_transaction_amount);

  -- Tolerate 1 cent difference for rounding
  IF v_amount_difference > 0.01 AND v_expected_owner_amount > 0 THEN
    v_validation_passed := FALSE;
    v_validation_issues := v_validation_issues || jsonb_build_object(
      'type', 'split_amount_mismatch',
      'total', p_transaction_amount,
      'calculated', v_calculated_total,
      'difference', v_amount_difference,
      'owner_amount', v_expected_owner_amount,
      'platform_fee', v_expected_platform_fee,
      'severity', 'critical'
    );

    INSERT INTO payment_issues (
      booking_id,
      payment_id,
      issue_type,
      severity,
      description,
      metadata,
      detected_at
    ) VALUES (
      p_booking_id,
      p_mp_payment_id,
      'split_amount_mismatch',
      'critical',
      'Split payment amount mismatch',
      jsonb_build_object(
        'total_amount', p_transaction_amount,
        'calculated_total', v_calculated_total,
        'difference', v_amount_difference,
        'owner_amount', v_expected_owner_amount,
        'platform_fee', v_expected_platform_fee,
        'marketplace_fee', p_marketplace_fee
      ),
      NOW()
    );
  END IF;

  -- ========================================
  -- STEP 6: Handle validation result
  -- ========================================
  IF v_validation_passed THEN
    -- ALL validations passed - confirm booking atomically
    UPDATE bookings
    SET
      status = 'confirmed',
      paid_at = NOW(),
      payment_method = 'credit_card',
      payment_split_completed = TRUE,
      payment_split_validated_at = NOW(),
      owner_payment_amount = v_expected_owner_amount,
      platform_fee = v_expected_platform_fee,
      metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
        'mercadopago_payment_id', p_mp_payment_id,
        'mercadopago_status', p_mp_status,
        'mercadopago_payment_method', p_payment_method_id,
        'mercadopago_amount', p_transaction_amount,
        'mercadopago_currency', p_currency_id,
        'mercadopago_approved_at', p_date_approved,
        'is_marketplace_split', TRUE,
        'collector_id', p_collector_id,
        'split_validation_passed', TRUE,
        'split_validated_at', NOW()
      ),
      updated_at = NOW()
    WHERE id = p_booking_id;

    -- Register payment split
    PERFORM register_payment_split(
      p_booking_id,
      p_mp_payment_id,
      (p_transaction_amount * 100)::INTEGER,
      p_currency_id
    );

    v_result := jsonb_build_object(
      'success', TRUE,
      'validation_passed', TRUE,
      'booking_id', p_booking_id,
      'status', 'confirmed',
      'message', 'Split payment validated and booking confirmed'
    );

  ELSE
    -- Validation FAILED - DO NOT confirm booking
    -- Mark as payment_validation_failed for manual review
    UPDATE bookings
    SET
      status = 'payment_validation_failed',
      metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
        'mercadopago_payment_id', p_mp_payment_id,
        'mercadopago_status', p_mp_status,
        'mercadopago_payment_method', p_payment_method_id,
        'mercadopago_amount', p_transaction_amount,
        'mercadopago_currency', p_currency_id,
        'mercadopago_approved_at', p_date_approved,
        'is_marketplace_split', TRUE,
        'collector_id', p_collector_id,
        'split_validation_passed', FALSE,
        'split_validation_issues', v_validation_issues,
        'requires_manual_review', TRUE,
        'validation_failed_at', NOW()
      ),
      updated_at = NOW()
    WHERE id = p_booking_id;

    v_result := jsonb_build_object(
      'success', FALSE,
      'validation_passed', FALSE,
      'booking_id', p_booking_id,
      'status', 'payment_validation_failed',
      'validation_issues', v_validation_issues,
      'message', 'Split payment validation failed - booking NOT confirmed',
      'requires_manual_review', TRUE
    );

    -- Log critical alert
    RAISE WARNING '[P0-3] Split payment validation FAILED for booking %: %',
      p_booking_id, v_validation_issues::TEXT;
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION validate_and_confirm_split_payment IS
'P0-3 FIX: Atomic split payment validation.
Validates collector_id and amounts BEFORE confirming booking.
If validation fails, booking status = payment_validation_failed (NOT confirmed).
All operations happen in a single transaction - no partial states.

Usage from webhook:
SELECT validate_and_confirm_split_payment(
  p_booking_id := ''uuid'',
  p_mp_payment_id := ''12345'',
  p_mp_status := ''approved'',
  p_mp_status_detail := ''accredited'',
  p_transaction_amount := 1000.00,
  p_currency_id := ''ARS'',
  p_payment_method_id := ''credit_card'',
  p_date_approved := NOW(),
  p_collector_id := ''123456789'',
  p_marketplace_fee := 150.00,
  p_metadata := ''{"owner_amount_ars": "850", "platform_fee_ars": "150"}''::JSONB
);';

-- ============================================================================
-- 2. ADD booking status: payment_validation_failed
-- ============================================================================

-- Check if the status already exists in the enum or check constraint
DO $$
BEGIN
  -- Try to add to enum if it exists
  BEGIN
    ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_validation_failed';
  EXCEPTION
    WHEN undefined_object THEN
      -- Enum doesn't exist, might be using check constraint
      RAISE NOTICE 'booking_status enum not found, checking for check constraint';
  END;
END $$;

-- ============================================================================
-- 3. GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION validate_and_confirm_split_payment(
  UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, JSONB
) TO service_role;

COMMIT;
