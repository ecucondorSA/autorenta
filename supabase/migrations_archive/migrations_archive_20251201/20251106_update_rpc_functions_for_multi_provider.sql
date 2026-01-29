-- Migration: Update RPC functions to support multiple providers
-- Description: Make register_payment_split() and calculate_payment_split() provider-agnostic
-- Phase: 2.1, 2.3 - RPC Function Abstraction
-- Date: 2025-11-06

-- This migration updates existing payment RPC functions to work with multiple providers

BEGIN;

-- ============================================================================
-- PART 1: Update calculate_payment_split() to use platform_config (15% fee)
-- ============================================================================

DROP FUNCTION IF EXISTS calculate_payment_split(DECIMAL, DECIMAL);

CREATE OR REPLACE FUNCTION calculate_payment_split(
  p_total_amount DECIMAL,
  p_provider TEXT DEFAULT 'mercadopago'
)
RETURNS TABLE (
  total_amount DECIMAL,
  owner_amount DECIMAL,
  platform_fee DECIMAL,
  platform_fee_percent DECIMAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_platform_fee_percent DECIMAL;
  v_platform_fee DECIMAL;
  v_owner_amount DECIMAL;
BEGIN
  -- Get platform fee from config (defaults to 15%)
  v_platform_fee_percent := get_platform_fee_percent(p_provider);

  -- Calculate split
  v_platform_fee := ROUND(p_total_amount * v_platform_fee_percent, 2);
  v_owner_amount := p_total_amount - v_platform_fee;

  RETURN QUERY SELECT
    p_total_amount,
    v_owner_amount,
    v_platform_fee,
    v_platform_fee_percent;
END;
$$;

COMMENT ON FUNCTION calculate_payment_split IS
  'Calculate payment split amounts using platform fee from config (15% default)';

-- ============================================================================
-- PART 2: Update register_payment_split() to accept provider parameter
-- ============================================================================

-- Drop old function signature
DROP FUNCTION IF EXISTS register_payment_split(UUID, VARCHAR, INTEGER, VARCHAR);

-- Create new function with provider parameter
CREATE OR REPLACE FUNCTION register_payment_split(
  p_booking_id UUID,
  p_provider payment_provider,
  p_provider_payment_id TEXT,
  p_total_amount_cents INTEGER,
  p_currency VARCHAR(10) DEFAULT 'ARS'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split_id UUID;
  v_booking bookings%ROWTYPE;
  v_car cars%ROWTYPE;
  v_owner profiles%ROWTYPE;
  v_platform_fee_percent DECIMAL;
  v_platform_fee_cents INTEGER;
  v_owner_amount_cents INTEGER;
  v_provider_payee_identifier TEXT;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Get car details
  SELECT * INTO v_car
  FROM cars
  WHERE id = v_booking.car_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found for booking: %', p_booking_id;
  END IF;

  -- Get owner details
  SELECT * INTO v_owner
  FROM profiles
  WHERE id = v_car.owner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Owner not found for car: %', v_car.id;
  END IF;

  -- Get platform fee from config (15% default)
  v_platform_fee_percent := get_platform_fee_percent(p_provider::text);

  -- Calculate split amounts in cents
  v_platform_fee_cents := ROUND(p_total_amount_cents * v_platform_fee_percent);
  v_owner_amount_cents := p_total_amount_cents - v_platform_fee_cents;

  -- Get provider-specific payee identifier
  IF p_provider = 'mercadopago' THEN
    v_provider_payee_identifier := v_owner.mercadopago_collector_id;
  ELSIF p_provider = 'paypal' THEN
    v_provider_payee_identifier := v_owner.paypal_merchant_id;
  ELSE
    v_provider_payee_identifier := NULL;
  END IF;

  -- Insert payment split record
  INSERT INTO payment_splits (
    booking_id,
    provider,
    provider_payment_id,
    total_amount_cents,
    owner_amount_cents,
    platform_fee_cents,
    platform_fee_percent,
    currency,
    collector_id,  -- Keep for backward compatibility
    provider_payee_identifier,
    status,
    validated_at,
    metadata
  )
  VALUES (
    p_booking_id,
    p_provider,
    p_provider_payment_id,
    p_total_amount_cents,
    v_owner_amount_cents,
    v_platform_fee_cents,
    v_platform_fee_percent,
    p_currency,
    v_provider_payee_identifier,  -- Also set collector_id for backward compat
    v_provider_payee_identifier,
    'validated',
    NOW(),
    jsonb_build_object(
      'owner_id', v_car.owner_id,
      'car_id', v_car.id,
      'renter_id', v_booking.renter_id,
      'provider', p_provider
    )
  )
  RETURNING id INTO v_split_id;

  -- Update booking with split payment information
  UPDATE bookings
  SET
    payment_split_completed = TRUE,
    owner_payment_amount = v_owner_amount_cents::DECIMAL / 100,
    platform_fee = v_platform_fee_cents::DECIMAL / 100,
    provider_split_payment_id = p_provider_payment_id,
    provider_collector_id = v_provider_payee_identifier
  WHERE id = p_booking_id;

  RETURN v_split_id;
END;
$$;

COMMENT ON FUNCTION register_payment_split IS
  'Register a marketplace split payment for a booking (supports multiple providers)';

-- ============================================================================
-- PART 3: Create compatibility wrapper for old function signature (MercadoPago)
-- ============================================================================

-- This allows existing Edge Functions to continue working during migration
CREATE OR REPLACE FUNCTION register_payment_split(
  p_booking_id UUID,
  p_mp_payment_id VARCHAR(255),
  p_total_amount_cents INTEGER,
  p_currency VARCHAR(10) DEFAULT 'ARS'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delegate to new function with 'mercadopago' provider
  RETURN register_payment_split(
    p_booking_id,
    'mercadopago'::payment_provider,
    p_mp_payment_id,
    p_total_amount_cents,
    p_currency
  );
END;
$$;

COMMENT ON FUNCTION register_payment_split(UUID, VARCHAR, INTEGER, VARCHAR) IS
  'Backward compatibility wrapper for MercadoPago split payments';

-- ============================================================================
-- PART 4: Create function to validate split payment matches expected amounts
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_split_payment_amounts(
  p_booking_id UUID,
  p_provider payment_provider,
  p_total_amount_cents INTEGER,
  p_platform_fee_cents INTEGER,
  p_owner_amount_cents INTEGER
)
RETURNS TABLE (
  is_valid BOOLEAN,
  expected_total_cents INTEGER,
  expected_platform_fee_cents INTEGER,
  expected_owner_amount_cents INTEGER,
  actual_total_cents INTEGER,
  actual_platform_fee_cents INTEGER,
  actual_owner_amount_cents INTEGER,
  total_matches BOOLEAN,
  platform_fee_matches BOOLEAN,
  owner_amount_matches BOOLEAN,
  errors TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_fee_percent DECIMAL;
  v_expected_total_cents INTEGER;
  v_expected_platform_fee_cents INTEGER;
  v_expected_owner_amount_cents INTEGER;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_is_valid BOOLEAN := TRUE;
  v_total_matches BOOLEAN;
  v_fee_matches BOOLEAN;
  v_owner_matches BOOLEAN;
BEGIN
  -- Get booking
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::INTEGER, NULL::INTEGER, NULL::INTEGER,
      p_total_amount_cents, p_platform_fee_cents, p_owner_amount_cents,
      FALSE, FALSE, FALSE,
      ARRAY['Booking not found']::TEXT[];
    RETURN;
  END IF;

  -- Calculate expected amounts based on booking total and platform fee
  v_fee_percent := get_platform_fee_percent(p_provider::text);

  -- Convert booking total to cents (assuming total_amount is in decimal)
  v_expected_total_cents := ROUND(v_booking.total_amount * 100);
  v_expected_platform_fee_cents := ROUND(v_expected_total_cents * v_fee_percent);
  v_expected_owner_amount_cents := v_expected_total_cents - v_expected_platform_fee_cents;

  -- Validate amounts
  v_total_matches := (p_total_amount_cents = v_expected_total_cents);
  v_fee_matches := (ABS(p_platform_fee_cents - v_expected_platform_fee_cents) <= 1);  -- Allow 1 cent rounding
  v_owner_matches := (ABS(p_owner_amount_cents - v_expected_owner_amount_cents) <= 1);

  -- Collect errors
  IF NOT v_total_matches THEN
    v_errors := array_append(v_errors, format('Total mismatch: expected %s cents, got %s cents', v_expected_total_cents, p_total_amount_cents));
    v_is_valid := FALSE;
  END IF;

  IF NOT v_fee_matches THEN
    v_errors := array_append(v_errors, format('Platform fee mismatch: expected %s cents, got %s cents', v_expected_platform_fee_cents, p_platform_fee_cents));
    v_is_valid := FALSE;
  END IF;

  IF NOT v_owner_matches THEN
    v_errors := array_append(v_errors, format('Owner amount mismatch: expected %s cents, got %s cents', v_expected_owner_amount_cents, p_owner_amount_cents));
    v_is_valid := FALSE;
  END IF;

  -- Verify split adds up
  IF (p_platform_fee_cents + p_owner_amount_cents) != p_total_amount_cents THEN
    v_errors := array_append(v_errors, 'Split amounts do not add up to total');
    v_is_valid := FALSE;
  END IF;

  RETURN QUERY SELECT
    v_is_valid,
    v_expected_total_cents,
    v_expected_platform_fee_cents,
    v_expected_owner_amount_cents,
    p_total_amount_cents,
    p_platform_fee_cents,
    p_owner_amount_cents,
    v_total_matches,
    v_fee_matches,
    v_owner_matches,
    v_errors;
END;
$$;

COMMENT ON FUNCTION validate_split_payment_amounts IS
  'Validate that split payment amounts match expected values from booking';

COMMIT;
