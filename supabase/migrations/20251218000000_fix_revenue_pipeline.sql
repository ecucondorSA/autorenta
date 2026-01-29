-- ============================================================================
-- FIX REVENUE PIPELINE: Platform Fee & Split Payment
-- ============================================================================
-- Problem: platform_fee, owner_payment_amount never calculated = $0 revenue
-- Solution: Calculate 15% platform fee on every booking
-- ============================================================================

-- ============================================================================
-- 1. UPDATE pricing_recalculate to set platform_fee and owner_payment_amount
-- ============================================================================

CREATE OR REPLACE FUNCTION public.pricing_recalculate(p_booking_id uuid)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- NEW: Platform fee calculation
  v_platform_fee_rate NUMERIC := 0.15; -- 15% platform fee
  v_platform_fee_cents BIGINT;
  v_owner_amount_cents BIGINT;
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

  v_days := GREATEST(
    1,
    EXTRACT(DAY FROM (v_booking.end_at - v_booking.start_at))::INTEGER
  );

  v_nightly_rate_cents := ROUND(v_car.price_per_day * 100)::BIGINT;
  v_subtotal_cents := v_nightly_rate_cents * v_days;

  v_lines := jsonb_build_array(
    jsonb_build_object('label', 'Tarifa base', 'amount_cents', v_subtotal_cents)
  );

  -- Service fee shown to user (23%)
  v_fees_cents := ROUND(v_subtotal_cents * 0.23)::BIGINT;
  v_lines := v_lines || jsonb_build_object(
    'label', 'Comisión de servicio (23%)',
    'amount_cents', v_fees_cents
  );

  v_deposit_cents := CASE
    WHEN v_booking.payment_method = 'wallet' THEN 30000
    WHEN v_booking.payment_method = 'partial_wallet' THEN 50000
    WHEN v_booking.payment_method = 'credit_card' THEN 50000
    ELSE COALESCE(NULLIF(v_booking.deposit_amount_cents, 0), 50000)
  END;

  IF v_deposit_cents > 0 THEN
    v_lines := v_lines || jsonb_build_object(
      'label', 'Depósito de garantía (se devuelve)',
      'amount_cents', v_deposit_cents
    );
  END IF;

  v_total_cents := v_subtotal_cents + v_insurance_cents + v_fees_cents - v_discounts_cents;

  -- ============================================================================
  -- NEW: Calculate platform fee (15%) and owner amount (85%)
  -- Based on the rental amount (subtotal), NOT including service fees
  -- ============================================================================
  v_platform_fee_cents := ROUND(v_subtotal_cents * v_platform_fee_rate)::BIGINT;
  v_owner_amount_cents := v_subtotal_cents - v_platform_fee_cents;

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
    'lines', v_lines,
    -- NEW: Include split info in breakdown
    'platform_fee_cents', v_platform_fee_cents,
    'owner_amount_cents', v_owner_amount_cents,
    'platform_fee_rate', v_platform_fee_rate
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
    currency = v_car.currency,
    -- NEW: Set platform fee and owner amount
    platform_fee = v_platform_fee_cents / 100.0,
    owner_payment_amount = v_owner_amount_cents / 100.0
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$function$;

-- ============================================================================
-- 2. CREATE process_booking_payout: Execute split payment on completion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_booking_payout(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking RECORD;
  v_car RECORD;
  v_owner RECORD;
  v_platform_fee_cents BIGINT;
  v_owner_amount_cents BIGINT;
  v_split_id uuid;
BEGIN
  -- Lock booking row to prevent concurrent processing
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  -- Only process completed bookings
  IF v_booking.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_COMPLETED', 'status', v_booking.status);
  END IF;

  -- Skip if already processed
  IF v_booking.payment_split_completed = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_PROCESSED');
  END IF;

  -- Skip if payout already done
  IF v_booking.payout_status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PAYOUT_ALREADY_COMPLETED');
  END IF;

  -- Get car and owner info
  SELECT * INTO v_car FROM public.cars WHERE id = v_booking.car_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CAR_NOT_FOUND');
  END IF;

  SELECT * INTO v_owner FROM public.profiles WHERE id = v_car.owner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'OWNER_NOT_FOUND');
  END IF;

  -- Calculate amounts (use stored values or recalculate)
  IF v_booking.platform_fee IS NOT NULL AND v_booking.platform_fee > 0 THEN
    v_platform_fee_cents := ROUND(v_booking.platform_fee * 100)::BIGINT;
    v_owner_amount_cents := ROUND(v_booking.owner_payment_amount * 100)::BIGINT;
  ELSE
    -- Fallback: calculate from subtotal (15% fee)
    v_platform_fee_cents := ROUND(COALESCE(v_booking.subtotal_cents, v_booking.total_cents) * 0.15)::BIGINT;
    v_owner_amount_cents := COALESCE(v_booking.subtotal_cents, v_booking.total_cents) - v_platform_fee_cents;
  END IF;

  -- Insert payment split record
  INSERT INTO public.payment_splits (
    id,
    booking_id,
    payment_id,
    total_amount_cents,
    owner_amount_cents,
    platform_fee_cents,
    currency,
    collector_id,
    status,
    created_at,
    metadata
  ) VALUES (
    gen_random_uuid(),
    p_booking_id,
    v_booking.payment_id::varchar,
    COALESCE(v_booking.subtotal_cents, v_booking.total_cents)::integer,
    v_owner_amount_cents::integer,
    v_platform_fee_cents::integer,
    COALESCE(v_booking.currency, 'ARS'),
    v_owner.mercadopago_collector_id,
    'pending',
    now(),
    jsonb_build_object(
      'owner_id', v_car.owner_id,
      'car_id', v_car.id,
      'processed_at', now()
    )
  )
  RETURNING id INTO v_split_id;

  -- Update booking with split info
  UPDATE public.bookings
  SET
    payment_split_completed = true,
    payment_split_validated_at = now(),
    payout_status = 'pending',
    platform_fee_collected = v_platform_fee_cents / 100.0,
    owner_amount_paid = 0, -- Will be set when actual transfer happens
    updated_at = now()
  WHERE id = p_booking_id;

  -- Create wallet transaction for owner (credit pending payout)
  INSERT INTO public.wallet_transactions (
    id,
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    reference_type,
    reference_id,
    provider,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_car.owner_id,
    'rental_earning',
    v_owner_amount_cents,
    COALESCE(v_booking.currency, 'ARS'),
    'pending',
    'Ingreso por alquiler #' || p_booking_id::text,
    'booking',
    p_booking_id,
    'platform',
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'split_id', v_split_id,
    'platform_fee_cents', v_platform_fee_cents,
    'owner_amount_cents', v_owner_amount_cents,
    'owner_id', v_car.owner_id
  );
END;
$function$;

-- ============================================================================
-- 3. CREATE complete_booking_and_process_payout: Atomic completion + payout
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_booking_and_process_payout(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- First mark as completed
  UPDATE public.bookings
  SET
    status = 'completed',
    completion_status = 'clean',
    updated_at = now()
  WHERE id = p_booking_id
    AND status IN ('in_progress', 'confirmed');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND_OR_INVALID_STATUS');
  END IF;

  -- Then process payout
  SELECT public.process_booking_payout(p_booking_id) INTO v_result;

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- 4. CREATE process_pending_payouts: CRON job to process all pending payouts
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_pending_payouts(p_batch_size integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking RECORD;
  v_processed integer := 0;
  v_failed integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_result jsonb;
BEGIN
  -- Find completed bookings without processed splits
  FOR v_booking IN
    SELECT id
    FROM public.bookings
    WHERE status = 'completed'
      AND (payment_split_completed IS NULL OR payment_split_completed = false)
      AND created_at > now() - interval '90 days' -- Only process recent bookings
    ORDER BY created_at ASC
    LIMIT p_batch_size
  LOOP
    BEGIN
      SELECT public.process_booking_payout(v_booking.id) INTO v_result;

      IF (v_result->>'success')::boolean THEN
        v_processed := v_processed + 1;
      ELSE
        v_failed := v_failed + 1;
      END IF;

      v_results := v_results || jsonb_build_object(
        'booking_id', v_booking.id,
        'result', v_result
      );
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_results := v_results || jsonb_build_object(
        'booking_id', v_booking.id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'failed', v_failed,
    'total', v_processed + v_failed,
    'details', v_results
  );
END;
$function$;

-- ============================================================================
-- 5. BACKFILL: Update existing bookings with platform_fee
-- ============================================================================

-- Update all bookings that don't have platform_fee set
UPDATE public.bookings
SET
  platform_fee = ROUND(COALESCE(subtotal_cents, total_cents, 0) * 0.15) / 100.0,
  owner_payment_amount = ROUND(COALESCE(subtotal_cents, total_cents, 0) * 0.85) / 100.0
WHERE platform_fee IS NULL OR platform_fee = 0;

-- ============================================================================
-- 6. TRIGGER: Auto-calculate platform_fee on booking insert/update
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_calculate_platform_fee()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate platform fee (15%) if not already set
  IF NEW.platform_fee IS NULL OR NEW.platform_fee = 0 THEN
    IF NEW.subtotal_cents IS NOT NULL AND NEW.subtotal_cents > 0 THEN
      NEW.platform_fee := ROUND(NEW.subtotal_cents * 0.15) / 100.0;
      NEW.owner_payment_amount := ROUND(NEW.subtotal_cents * 0.85) / 100.0;
    ELSIF NEW.total_cents IS NOT NULL AND NEW.total_cents > 0 THEN
      NEW.platform_fee := ROUND(NEW.total_cents * 0.15) / 100.0;
      NEW.owner_payment_amount := ROUND(NEW.total_cents * 0.85) / 100.0;
    ELSIF NEW.total_amount IS NOT NULL AND NEW.total_amount > 0 THEN
      NEW.platform_fee := ROUND(NEW.total_amount * 0.15 * 100) / 100.0;
      NEW.owner_payment_amount := ROUND(NEW.total_amount * 0.85 * 100) / 100.0;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_calculate_platform_fee ON public.bookings;

CREATE TRIGGER trg_calculate_platform_fee
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_platform_fee();

-- ============================================================================
-- 7. Process existing completed bookings (backfill splits)
-- ============================================================================

-- Run the backfill for completed bookings
SELECT public.process_pending_payouts(100);

-- ============================================================================
-- DONE: Revenue pipeline is now active
-- ============================================================================
-- Summary:
-- 1. pricing_recalculate now sets platform_fee (15%) and owner_payment_amount (85%)
-- 2. process_booking_payout creates payment_splits records
-- 3. complete_booking_and_process_payout combines completion + payout
-- 4. process_pending_payouts CRON job handles batch processing
-- 5. Trigger auto-calculates platform_fee on new bookings
-- 6. Backfill updated existing bookings
-- ============================================================================
