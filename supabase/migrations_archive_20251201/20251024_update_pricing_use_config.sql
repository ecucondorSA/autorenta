-- ============================================================================
-- UPDATE: pricing_recalculate to use platform_config
-- Created: 2025-10-24
-- Purpose: Replace hardcoded values with config table lookups
-- ============================================================================

BEGIN;

-- Drop and recreate pricing_recalculate with config-based values
DROP FUNCTION IF EXISTS public.pricing_recalculate(UUID);

CREATE OR REPLACE FUNCTION public.pricing_recalculate(p_booking_id UUID)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_car public.cars;
  v_days INTEGER;
  v_nightly_rate_cents BIGINT;
  v_subtotal_cents BIGINT;
  v_insurance_cents BIGINT := 0;
  v_fees_cents BIGINT := 0;
  v_discounts_cents BIGINT := 0;
  v_deposit_cents BIGINT := 0;
  v_total_cents BIGINT;
  v_breakdown JSONB;
  v_lines JSONB := '[]'::JSONB;
  v_service_fee_percent DECIMAL;
BEGIN
  -- Get booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Get car
  SELECT * INTO v_car
  FROM public.cars
  WHERE id = v_booking.car_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found';
  END IF;

  -- Calculate days (minimum 1)
  v_days := GREATEST(
    1,
    EXTRACT(DAY FROM (v_booking.end_at - v_booking.start_at))::INTEGER
  );

  v_nightly_rate_cents := ROUND(v_car.price_per_day * 100)::BIGINT;
  v_subtotal_cents := v_nightly_rate_cents * v_days;

  v_lines := jsonb_build_array(
    jsonb_build_object('label', 'Tarifa base', 'amount_cents', v_subtotal_cents)
  );

  -- Get service fee from config (fallback to 23% if config not found)
  BEGIN
    v_service_fee_percent := config_get_number('pricing.service_fee_percent');
  EXCEPTION
    WHEN OTHERS THEN
      v_service_fee_percent := 23;
  END;

  -- Platform service fee
  v_fees_cents := ROUND(v_subtotal_cents * (v_service_fee_percent / 100))::BIGINT;
  v_lines := v_lines || jsonb_build_object(
    'label', FORMAT('Comisión de servicio (%s%%)', v_service_fee_percent::TEXT),
    'amount_cents', v_fees_cents
  );

  -- Determine security deposit based on payment method using config
  v_deposit_cents := CASE
    WHEN v_booking.payment_method = 'wallet' THEN
      (config_get_number('deposit.wallet.usd') * 100)::BIGINT
    WHEN v_booking.payment_method = 'partial_wallet' THEN
      (config_get_number('deposit.partial_wallet.usd') * 100)::BIGINT
    WHEN v_booking.payment_method = 'credit_card' THEN
      (config_get_number('deposit.credit_card.usd') * 100)::BIGINT
    ELSE
      COALESCE(
        NULLIF(v_booking.deposit_amount_cents, 0),
        (config_get_number('deposit.default.usd') * 100)::BIGINT
      )
  END;

  IF v_deposit_cents > 0 THEN
    v_lines := v_lines || jsonb_build_object(
      'label', 'Depósito de garantía (se devuelve)',
      'amount_cents', v_deposit_cents
    );
  END IF;

  v_total_cents := v_subtotal_cents + v_insurance_cents + v_fees_cents - v_discounts_cents;

  v_breakdown := jsonb_build_object(
    'days', v_days,
    'nightly_rate_cents', v_nightly_rate_cents,
    'subtotal_cents', v_subtotal_cents,
    'insurance_cents', v_insurance_cents,
    'fees_cents', v_fees_cents,
    'discounts_cents', v_discounts_cents,
    'deposit_cents', v_deposit_cents,
    'total_cents', v_total_cents,
    'currency', v_car.currency,
    'lines', v_lines
  );

  UPDATE public.bookings
  SET
    days_count = v_days,
    nightly_rate_cents = v_nightly_rate_cents,
    subtotal_cents = v_subtotal_cents,
    insurance_cents = v_insurance_cents,
    fees_cents = v_fees_cents,
    discounts_cents = v_discounts_cents,
    total_cents = v_total_cents,
    rental_amount_cents = v_total_cents,
    deposit_amount_cents = v_deposit_cents,
    breakdown = v_breakdown,
    total_amount = v_total_cents / 100.0,
    currency = v_car.currency
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.pricing_recalculate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pricing_recalculate(UUID) TO service_role;

COMMENT ON FUNCTION public.pricing_recalculate IS 'Recalculates booking pricing using platform_config values (service fee, deposits)';

COMMIT;
