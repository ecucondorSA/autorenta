-- ============================================================================
-- BOOKING PRICING BREAKDOWN MIGRATION (Adapted to existing schema)
-- Created: 2025-10-16
-- Purpose: Add detailed pricing breakdown to bookings
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Extend booking_status enum with 'expired'
-- ============================================================================

-- Check if 'expired' already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'expired'
        AND enumtypid = 'booking_status'::regtype
    ) THEN
        ALTER TYPE booking_status ADD VALUE 'expired';
    END IF;
END$$;

-- ============================================================================
-- SECTION 2: Add pricing breakdown fields to bookings table
-- ============================================================================

ALTER TABLE public.bookings
  -- Pricing breakdown fields (all amounts in cents to avoid floating point issues)
  ADD COLUMN IF NOT EXISTS days_count INTEGER,
  ADD COLUMN IF NOT EXISTS nightly_rate_cents BIGINT,
  ADD COLUMN IF NOT EXISTS subtotal_cents BIGINT,
  ADD COLUMN IF NOT EXISTS insurance_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fees_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discounts_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cents BIGINT,

  -- Complete breakdown as JSON for extensibility
  ADD COLUMN IF NOT EXISTS breakdown JSONB,

  -- Payment management
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,

  -- Cancellation management
  ADD COLUMN IF NOT EXISTS cancellation_policy_id BIGINT,
  ADD COLUMN IF NOT EXISTS cancellation_fee_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create index on expires_at for automatic expiration queries
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON public.bookings(expires_at)
  WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Create index on payment_id
CREATE INDEX IF NOT EXISTS idx_bookings_payment_id ON public.bookings(payment_id);

-- ============================================================================
-- SECTION 3: RPC Function - pricing_recalculate
-- ============================================================================

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
  v_total_cents BIGINT;
  v_breakdown JSONB;
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
  v_days := EXTRACT(DAY FROM (v_booking.end_at - v_booking.start_at))::INTEGER;
  IF v_days < 1 THEN
    v_days := 1;
  END IF;

  -- Convert price_per_day to cents (multiply by 100)
  v_nightly_rate_cents := ROUND(v_car.price_per_day * 100)::BIGINT;

  -- Calculate subtotal
  v_subtotal_cents := v_nightly_rate_cents * v_days;

  -- TODO: Add insurance calculation based on car value or fixed percentage
  -- For now, insurance is optional and defaults to 0

  -- TODO: Add platform fees (e.g., 10% of subtotal)
  -- v_fees_cents := ROUND(v_subtotal_cents * 0.10)::BIGINT;

  -- TODO: Add discounts based on rental duration
  -- e.g., 5% off for 7+ days, 10% off for 30+ days
  -- IF v_days >= 30 THEN
  --   v_discounts_cents := ROUND(v_subtotal_cents * 0.10)::BIGINT;
  -- ELSIF v_days >= 7 THEN
  --   v_discounts_cents := ROUND(v_subtotal_cents * 0.05)::BIGINT;
  -- END IF;

  -- Calculate total
  v_total_cents := v_subtotal_cents + v_insurance_cents + v_fees_cents - v_discounts_cents;

  -- Build breakdown JSON
  v_breakdown := jsonb_build_object(
    'days', v_days,
    'nightly_rate_cents', v_nightly_rate_cents,
    'subtotal_cents', v_subtotal_cents,
    'insurance_cents', v_insurance_cents,
    'fees_cents', v_fees_cents,
    'discounts_cents', v_discounts_cents,
    'total_cents', v_total_cents,
    'currency', v_car.currency,
    'lines', jsonb_build_array(
      jsonb_build_object('label', 'Base rate', 'amount_cents', v_subtotal_cents),
      jsonb_build_object('label', 'Insurance', 'amount_cents', v_insurance_cents),
      jsonb_build_object('label', 'Service fee', 'amount_cents', v_fees_cents),
      jsonb_build_object('label', 'Discount', 'amount_cents', -v_discounts_cents)
    )
  );

  -- Update booking with calculated values
  UPDATE public.bookings
  SET
    days_count = v_days,
    nightly_rate_cents = v_nightly_rate_cents,
    subtotal_cents = v_subtotal_cents,
    insurance_cents = v_insurance_cents,
    fees_cents = v_fees_cents,
    discounts_cents = v_discounts_cents,
    total_cents = v_total_cents,
    breakdown = v_breakdown,
    -- Keep existing total_amount in sync (for backward compatibility)
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

COMMENT ON FUNCTION public.pricing_recalculate IS 'Recalculates and updates booking pricing breakdown';

-- ============================================================================
-- SECTION 4: View - my_bookings
-- ============================================================================

CREATE OR REPLACE VIEW public.my_bookings AS
SELECT
  b.*,
  c.title AS car_title,
  c.brand AS car_brand,
  c.model AS car_model,
  c.year AS car_year,
  c.location_city AS car_city,
  c.location_province AS car_province,
  -- Get main photo (cover photo or first photo)
  COALESCE(
    (SELECT url FROM public.car_photos WHERE car_id = c.id ORDER BY sort_order LIMIT 1)
  ) AS main_photo_url,
  -- Payment info
  p.status AS payment_status,
  p.provider AS payment_provider
FROM public.bookings b
JOIN public.cars c ON c.id = b.car_id
LEFT JOIN public.payments p ON p.id = b.payment_id
WHERE b.renter_id = auth.uid();

-- Grant select permission
GRANT SELECT ON public.my_bookings TO authenticated;

COMMENT ON VIEW public.my_bookings IS 'Bookings for the current authenticated user with car details';

-- ============================================================================
-- SECTION 5: View - owner_bookings
-- ============================================================================

CREATE OR REPLACE VIEW public.owner_bookings AS
SELECT
  b.*,
  c.title AS car_title,
  c.brand AS car_brand,
  c.model AS car_model,
  -- Renter info (public fields only)
  pr.full_name AS renter_name,
  pr.avatar_url AS renter_avatar,
  -- Payment info
  p.status AS payment_status,
  p.provider AS payment_provider
FROM public.bookings b
JOIN public.cars c ON c.id = b.car_id
LEFT JOIN public.profiles pr ON pr.id = b.renter_id
LEFT JOIN public.payments p ON p.id = b.payment_id
WHERE c.owner_id = auth.uid();

-- Grant select permission
GRANT SELECT ON public.owner_bookings TO authenticated;

COMMENT ON VIEW public.owner_bookings IS 'Bookings for cars owned by the current authenticated user';

-- ============================================================================
-- SECTION 6: Trigger - Auto-set defaults on booking creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_booking_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set default expiration to 30 minutes from now for pending bookings
  IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + INTERVAL '30 minutes';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_booking_pricing ON public.bookings;

CREATE TRIGGER set_booking_pricing
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_booking_pricing();

COMMENT ON FUNCTION public.trigger_booking_pricing IS 'Automatically sets defaults for new bookings';

-- ============================================================================
-- SECTION 7: Function - expire_pending_bookings (for cron/scheduled tasks)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_pending_bookings()
RETURNS TABLE(expired_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE public.bookings
  SET
    status = 'expired',
    cancelled_at = now(),
    cancellation_reason = 'Payment expired'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND now() > expires_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$;

-- Grant execute permission to service_role only (for scheduled tasks)
GRANT EXECUTE ON FUNCTION public.expire_pending_bookings() TO service_role;

COMMENT ON FUNCTION public.expire_pending_bookings IS 'Expires pending bookings past their expiration time. Should be called by scheduled task.';

-- ============================================================================
-- SECTION 8: Update existing bookings with pricing breakdown
-- ============================================================================

-- Recalculate pricing for all existing bookings without breakdown
DO $$
DECLARE
  booking_record RECORD;
BEGIN
  FOR booking_record IN SELECT id FROM public.bookings WHERE breakdown IS NULL
  LOOP
    BEGIN
      PERFORM public.pricing_recalculate(booking_record.id);
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue with other bookings
        RAISE NOTICE 'Error recalculating booking %: %', booking_record.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMIT;
