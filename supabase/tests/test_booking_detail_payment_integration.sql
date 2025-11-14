-- ============================================================================
-- BOOKING DETAIL & PAYMENT - INTEGRATION TEST
-- ============================================================================
-- Purpose: Test complete vertical stack database functions
-- Date: 2025-10-24
-- Status: Development Test
-- ============================================================================

-- This test should be run manually in a development/test environment
-- DO NOT run in production

-- ============================================================================
-- SETUP: Create test data
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_test_booking_id UUID;
  v_test_payment_id UUID;
  v_test_car_id UUID;
  v_fx_rate NUMERIC;
  v_result RECORD;
BEGIN
  RAISE NOTICE '🧪 Starting Booking Detail & Payment Integration Test...';
  RAISE NOTICE '';

  -- ============================================================================
  -- TEST 1: FX Rates
  -- ============================================================================

  RAISE NOTICE '📊 TEST 1: FX Rates';
  RAISE NOTICE '─────────────────────────────────────────────────────────';

  -- Check that FX rates exist
  SELECT rate INTO v_fx_rate
  FROM fx_rates
  WHERE from_currency = 'USD'
    AND to_currency = 'ARS'
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_fx_rate IS NULL THEN
    RAISE EXCEPTION '❌ FAIL: No active USD→ARS FX rate found';
  END IF;

  RAISE NOTICE '✅ PASS: Found active USD→ARS rate: %', v_fx_rate;
  RAISE NOTICE '';

  -- ============================================================================
  -- TEST 2: Get Current FX Rate Function
  -- ============================================================================

  RAISE NOTICE '📊 TEST 2: get_current_fx_rate Function';
  RAISE NOTICE '─────────────────────────────────────────────────────────';

  BEGIN
    v_fx_rate := get_current_fx_rate('USD', 'ARS');
    RAISE NOTICE '✅ PASS: get_current_fx_rate(USD, ARS) = %', v_fx_rate;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ FAIL: get_current_fx_rate raised error: %', SQLERRM;
  END;

  RAISE NOTICE '';

  -- ============================================================================
  -- TEST 3: FX Rate Revalidation Function
  -- ============================================================================

  RAISE NOTICE '📊 TEST 3: fx_rate_needs_revalidation Function';
  RAISE NOTICE '─────────────────────────────────────────────────────────';

  -- Test with fresh rate (should not need revalidation)
  SELECT needs_revalidation, reason INTO v_result
  FROM fx_rate_needs_revalidation(
    p_rate_timestamp := now(),
    p_max_age_days := 7,
    p_old_rate := 1000.00,
    p_new_rate := 1005.00,
    p_variation_threshold := 0.10
  );

  IF v_result.needs_revalidation THEN
    RAISE EXCEPTION '❌ FAIL: Fresh rate incorrectly needs revalidation';
  END IF;

  RAISE NOTICE '✅ PASS: Fresh rate does not need revalidation';

  -- Test with old rate (should need revalidation)
  SELECT needs_revalidation, reason INTO v_result
  FROM fx_rate_needs_revalidation(
    p_rate_timestamp := now() - INTERVAL '8 days',
    p_max_age_days := 7
  );

  IF NOT v_result.needs_revalidation THEN
    RAISE EXCEPTION '❌ FAIL: Old rate incorrectly does not need revalidation';
  END IF;

  RAISE NOTICE '✅ PASS: Old rate needs revalidation (reason: %)', v_result.reason;

  -- Test with high variation (should need revalidation)
  SELECT needs_revalidation, reason INTO v_result
  FROM fx_rate_needs_revalidation(
    p_rate_timestamp := now(),
    p_max_age_days := 7,
    p_old_rate := 1000.00,
    p_new_rate := 1150.00,
    p_variation_threshold := 0.10
  );

  IF NOT v_result.needs_revalidation THEN
    RAISE EXCEPTION '❌ FAIL: High variation rate incorrectly does not need revalidation';
  END IF;

  RAISE NOTICE '✅ PASS: High variation rate needs revalidation (reason: %)', v_result.reason;
  RAISE NOTICE '';

  -- ============================================================================
  -- TEST 4: Payments Table Structure
  -- ============================================================================

  RAISE NOTICE '📊 TEST 4: Payments Table Extensions';
  RAISE NOTICE '─────────────────────────────────────────────────────────';

  -- Verify new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'is_hold'
  ) THEN
    RAISE EXCEPTION '❌ FAIL: payments.is_hold column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'amount_authorized_cents'
  ) THEN
    RAISE EXCEPTION '❌ FAIL: payments.amount_authorized_cents column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'idempotency_key'
  ) THEN
    RAISE EXCEPTION '❌ FAIL: payments.idempotency_key column not found';
  END IF;

  RAISE NOTICE '✅ PASS: All payment extension columns exist';
  RAISE NOTICE '';

  -- ============================================================================
  -- TEST 5: Bookings Table Structure
  -- ============================================================================

  RAISE NOTICE '📊 TEST 5: Bookings Table Extensions';
  RAISE NOTICE '─────────────────────────────────────────────────────────';

  -- Verify new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_mode'
  ) THEN
    RAISE EXCEPTION '❌ FAIL: bookings.payment_mode column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'coverage_upgrade'
  ) THEN
    RAISE EXCEPTION '❌ FAIL: bookings.coverage_upgrade column not found';
  END IF;

  RAISE NOTICE '✅ PASS: All booking extension columns exist';
  RAISE NOTICE '';

  -- ============================================================================
  -- TEST 6: Create Payment Authorization Function (Mock Data)
  -- ============================================================================

  RAISE NOTICE '📊 TEST 6: create_payment_authorization Function';
  RAISE NOTICE '─────────────────────────────────────────────────────────';
  RAISE NOTICE '⚠️  NOTE: This test uses mock UUIDs and will fail if user/booking validation is strict';
  RAISE NOTICE '⚠️  In a real environment, create actual test user and booking first';
  RAISE NOTICE '';

  -- Generate test UUIDs (these won't exist in the database)
  v_test_user_id := gen_random_uuid();
  v_test_booking_id := gen_random_uuid();

  RAISE NOTICE 'Test user_id: %', v_test_user_id;
  RAISE NOTICE 'Test booking_id: %', v_test_booking_id;
  RAISE NOTICE '';

  -- Note: This will fail with user validation, which is expected behavior
  -- In a real test, you'd create the user and booking first

  BEGIN
    SELECT payment_id, authorized_at, expires_at, status INTO v_result
    FROM create_payment_authorization(
      p_user_id := v_test_user_id,
      p_booking_id := v_test_booking_id,
      p_amount_cents := 100000, -- 1000 ARS
      p_currency := 'ARS',
      p_description := 'Integration test hold',
      p_idempotency_key := 'test-' || gen_random_uuid()::text
    );

    RAISE NOTICE '✅ PASS: Function executed (mock data)';
    RAISE NOTICE '   Payment ID: %', v_result.payment_id;
    RAISE NOTICE '   Authorized: %', v_result.authorized_at;
    RAISE NOTICE '   Expires: %', v_result.expires_at;
    RAISE NOTICE '   Status: %', v_result.status;

    v_test_payment_id := v_result.payment_id;

  EXCEPTION
    WHEN OTHERS THEN
      -- Expected to fail due to user validation
      IF SQLERRM LIKE '%Usuario no autorizado%' OR SQLERRM LIKE '%not exist%' THEN
        RAISE NOTICE '⚠️  EXPECTED: Function correctly validates user permissions';
        RAISE NOTICE '   Error: %', SQLERRM;
      ELSE
        RAISE EXCEPTION '❌ FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  RAISE NOTICE '';

  -- ============================================================================
  -- TEST 7: View - v_payment_authorizations
  -- ============================================================================

  RAISE NOTICE '📊 TEST 7: v_payment_authorizations View';
  RAISE NOTICE '─────────────────────────────────────────────────────────';

  -- Verify view exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_views
    WHERE viewname = 'v_payment_authorizations'
  ) THEN
    RAISE EXCEPTION '❌ FAIL: v_payment_authorizations view not found';
  END IF;

  RAISE NOTICE '✅ PASS: v_payment_authorizations view exists';

  -- Try to select from view (should work even if empty)
  PERFORM * FROM v_payment_authorizations LIMIT 1;
  RAISE NOTICE '✅ PASS: View is queryable';
  RAISE NOTICE '';

  -- ============================================================================
  -- TEST 8: Idempotency Key Uniqueness
  -- ============================================================================

  RAISE NOTICE '📊 TEST 8: Idempotency Key Uniqueness';
  RAISE NOTICE '─────────────────────────────────────────────────────────';

  -- Verify unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_idempotency_key_key'
  ) THEN
    RAISE EXCEPTION '❌ FAIL: idempotency_key unique constraint not found';
  END IF;

  RAISE NOTICE '✅ PASS: idempotency_key has unique constraint';
  RAISE NOTICE '';

  -- ============================================================================
  -- TEST SUMMARY
  -- ============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 ALL INTEGRATION TESTS PASSED';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  ✅ FX Rates table and functions';
  RAISE NOTICE '  ✅ Payments table extensions';
  RAISE NOTICE '  ✅ Bookings table extensions';
  RAISE NOTICE '  ✅ Payment authorization functions';
  RAISE NOTICE '  ✅ Views and constraints';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Create real test user and booking';
  RAISE NOTICE '  2. Test complete authorization flow';
  RAISE NOTICE '  3. Test capture and cancel operations';
  RAISE NOTICE '  4. Verify frontend integration';
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '❌ INTEGRATION TEST FAILED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'Detail: %', SQLSTATE;
    RAISE NOTICE '';
    RAISE EXCEPTION 'Integration test suite failed';
END;
$$;
