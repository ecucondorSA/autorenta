-- Migration: Create prepare_booking_payment() RPC function
-- Description: Extract split payment logic from Edge Functions into reusable RPC
-- Phase: 2.2 - RPC Function Abstraction
-- Date: 2025-11-06

-- This migration creates a centralized function to prepare booking payment data
-- reducing code duplication across provider-specific Edge Functions

BEGIN;

-- ============================================================================
-- Create prepare_booking_payment() function
-- ============================================================================

CREATE OR REPLACE FUNCTION prepare_booking_payment(
  p_booking_id UUID,
  p_provider payment_provider,
  p_use_split_payment BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_car cars%ROWTYPE;
  v_owner profiles%ROWTYPE;
  v_renter profiles%ROWTYPE;
  v_platform_fee_percent DECIMAL;
  v_total_amount_cents INTEGER;
  v_platform_fee_cents INTEGER;
  v_owner_amount_cents INTEGER;
  v_provider_payee_identifier TEXT;
  v_can_use_split BOOLEAN := FALSE;
  v_split_errors TEXT[] := ARRAY[]::TEXT[];
  v_result JSONB;
BEGIN
  -- Fetch booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Booking not found',
      'booking_id', p_booking_id
    );
  END IF;

  -- Fetch car
  SELECT * INTO v_car
  FROM cars
  WHERE id = v_booking.car_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Car not found',
      'car_id', v_booking.car_id
    );
  END IF;

  -- Fetch owner
  SELECT * INTO v_owner
  FROM profiles
  WHERE id = v_car.owner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Owner not found',
      'owner_id', v_car.owner_id
    );
  END IF;

  -- Fetch renter
  SELECT * INTO v_renter
  FROM profiles
  WHERE id = v_booking.renter_id;

  -- Calculate amounts
  v_platform_fee_percent := get_platform_fee_percent(p_provider::text);
  v_total_amount_cents := ROUND(v_booking.total_amount * 100);
  v_platform_fee_cents := ROUND(v_total_amount_cents * v_platform_fee_percent);
  v_owner_amount_cents := v_total_amount_cents - v_platform_fee_cents;

  -- Determine if split payment can be used
  IF p_use_split_payment THEN
    -- Check provider-specific requirements
    IF p_provider = 'mercadopago' THEN
      v_provider_payee_identifier := v_owner.mercadopago_collector_id;

      -- Validate MercadoPago split requirements
      IF v_owner.mercadopago_collector_id IS NULL THEN
        v_split_errors := array_append(v_split_errors, 'Owner has not connected MercadoPago account');
      END IF;

      IF v_owner.mercadopago_connected = FALSE THEN
        v_split_errors := array_append(v_split_errors, 'Owner MercadoPago account not connected');
      END IF;

      IF v_owner.marketplace_approved = FALSE THEN
        v_split_errors := array_append(v_split_errors, 'Owner not approved for marketplace payments');
      END IF;

      -- Check if feature is enabled
      IF NOT is_provider_feature_enabled('mercadopago', 'split_payments_enabled') THEN
        v_split_errors := array_append(v_split_errors, 'MercadoPago split payments disabled in platform config');
      END IF;

    ELSIF p_provider = 'paypal' THEN
      v_provider_payee_identifier := v_owner.paypal_merchant_id;

      -- Validate PayPal split requirements
      IF v_owner.paypal_merchant_id IS NULL THEN
        v_split_errors := array_append(v_split_errors, 'Owner has not connected PayPal account');
      END IF;

      IF v_owner.paypal_connected = FALSE THEN
        v_split_errors := array_append(v_split_errors, 'Owner PayPal account not connected');
      END IF;

      IF v_owner.marketplace_approved_paypal = FALSE THEN
        v_split_errors := array_append(v_split_errors, 'Owner not approved for PayPal marketplace payments');
      END IF;

      -- Check if feature is enabled
      IF NOT is_provider_feature_enabled('paypal', 'split_payments_enabled') THEN
        v_split_errors := array_append(v_split_errors, 'PayPal split payments disabled in platform config');
      END IF;

    ELSE
      v_split_errors := array_append(v_split_errors, format('Provider %s does not support split payments', p_provider));
    END IF;

    -- Set can_use_split flag
    v_can_use_split := (array_length(v_split_errors, 1) IS NULL);
  END IF;

  -- Build result JSON
  v_result := jsonb_build_object(
    'success', TRUE,
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'status', v_booking.status,
      'total_amount', v_booking.total_amount,
      'currency', v_booking.currency,
      'start_date', v_booking.start_date,
      'end_date', v_booking.end_date,
      'renter_id', v_booking.renter_id,
      'car_id', v_booking.car_id
    ),
    'car', jsonb_build_object(
      'id', v_car.id,
      'model', v_car.model,
      'brand', v_car.brand,
      'owner_id', v_car.owner_id
    ),
    'owner', jsonb_build_object(
      'id', v_owner.id,
      'email', v_owner.email,
      'full_name', v_owner.full_name,
      'mercadopago_collector_id', v_owner.mercadopago_collector_id,
      'mercadopago_connected', v_owner.mercadopago_connected,
      'marketplace_approved', v_owner.marketplace_approved,
      'paypal_merchant_id', v_owner.paypal_merchant_id,
      'paypal_connected', v_owner.paypal_connected,
      'marketplace_approved_paypal', v_owner.marketplace_approved_paypal
    ),
    'renter', jsonb_build_object(
      'id', v_renter.id,
      'email', v_renter.email,
      'full_name', v_renter.full_name
    ),
    'payment', jsonb_build_object(
      'provider', p_provider,
      'total_amount_cents', v_total_amount_cents,
      'total_amount_decimal', v_booking.total_amount,
      'currency', v_booking.currency,
      'platform_fee_percent', v_platform_fee_percent,
      'platform_fee_cents', v_platform_fee_cents,
      'owner_amount_cents', v_owner_amount_cents,
      'use_split_payment', v_can_use_split,
      'split_requested', p_use_split_payment,
      'split_enabled', v_can_use_split,
      'split_errors', v_split_errors,
      'provider_payee_identifier', v_provider_payee_identifier
    ),
    'metadata', jsonb_build_object(
      'external_reference', format('booking_%s', v_booking.id),
      'statement_descriptor', 'AutoRenta',
      'notification_url_base', format('/api/%s/webhook', p_provider)
    )
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION prepare_booking_payment IS
  'Prepare all necessary data for creating a booking payment with a provider (includes split payment validation)';

-- ============================================================================
-- Create function to get owner payment credentials for a provider
-- ============================================================================

CREATE OR REPLACE FUNCTION get_owner_payment_credentials(
  p_owner_id UUID,
  p_provider payment_provider
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_owner profiles%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_owner
  FROM profiles
  WHERE id = p_owner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Owner not found'
    );
  END IF;

  IF p_provider = 'mercadopago' THEN
    v_result := jsonb_build_object(
      'success', TRUE,
      'provider', 'mercadopago',
      'connected', v_owner.mercadopago_connected,
      'collector_id', v_owner.mercadopago_collector_id,
      'marketplace_approved', v_owner.marketplace_approved,
      'account_type', v_owner.mercadopago_account_type
    );
  ELSIF p_provider = 'paypal' THEN
    v_result := jsonb_build_object(
      'success', TRUE,
      'provider', 'paypal',
      'connected', v_owner.paypal_connected,
      'merchant_id', v_owner.paypal_merchant_id,
      'marketplace_approved', v_owner.marketplace_approved_paypal,
      'account_type', v_owner.paypal_account_type,
      'primary_email', v_owner.paypal_primary_email
    );
  ELSE
    v_result := jsonb_build_object(
      'success', FALSE,
      'error', format('Unsupported provider: %s', p_provider)
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_owner_payment_credentials IS
  'Get owner payment credentials for a specific provider';

COMMIT;
