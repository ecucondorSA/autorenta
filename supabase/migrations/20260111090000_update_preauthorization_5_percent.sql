-- Update preauthorization logic to 5% of vehicle value (platform-wide)

-- =====================================================================
-- calculate_preauthorization (USD-based)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.calculate_preauthorization(
    p_vehicle_value_usd NUMERIC,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_required_tier TEXT;
    v_user_tier TEXT;
    v_hold_cents BIGINT;
    v_fgo_cap_cents BIGINT;
BEGIN
    -- Determine required tier based on vehicle value (for eligibility/FGO cap only)
    IF p_vehicle_value_usd > 40000 THEN
        v_required_tier := 'club_luxury';
        v_fgo_cap_cents := 200000; -- $2,000 FGO cap
    ELSIF p_vehicle_value_usd > 20000 THEN
        v_required_tier := 'club_black';
        v_fgo_cap_cents := 120000; -- $1,200 FGO cap
    ELSE
        v_required_tier := 'club_standard';
        v_fgo_cap_cents := 80000; -- $800 FGO cap
    END IF;

    -- Hold = 5% of vehicle value
    v_hold_cents := ROUND(p_vehicle_value_usd * 0.05 * 100);

    -- Fetch user tier (informational only)
    IF p_user_id IS NOT NULL THEN
        SELECT tier::TEXT INTO v_user_tier
        FROM subscriptions
        WHERE user_id = p_user_id
          AND status = 'active'
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    RETURN json_build_object(
        'hold_amount_cents', v_hold_cents,
        'hold_amount_usd', v_hold_cents / 100.0,
        'base_hold_cents', v_hold_cents,
        'base_hold_usd', v_hold_cents / 100.0,
        'discount_applied', false,
        'discount_reason', NULL,
        'required_tier', v_required_tier,
        'user_tier', v_user_tier,
        'fgo_cap_cents', v_fgo_cap_cents,
        'fgo_cap_usd', v_fgo_cap_cents / 100.0,
        'vehicle_value_usd', p_vehicle_value_usd
    );
END;
$$;

COMMENT ON FUNCTION public.calculate_preauthorization IS
  'Calculate required preauthorization (hold) amount as 5% of vehicle value';

GRANT EXECUTE ON FUNCTION public.calculate_preauthorization TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_preauthorization TO service_role;

-- =====================================================================
-- calculate_preauthorization_with_snapshot (ARS-based)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.calculate_preauthorization_with_snapshot(
    p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_deductible_percent INTEGER;
    v_base_amount NUMERIC;
    v_hold_amount NUMERIC;
BEGIN
    SELECT
      b.*,
      c.fipe_value_cents,
      c.market_value_cents
    INTO v_booking
    FROM bookings b
    JOIN cars c ON c.id = b.car_id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Booking not found');
    END IF;

    -- Keep deductible percent for metadata (not used in hold calculation)
    IF v_booking.coverage_snapshot IS NOT NULL THEN
      v_deductible_percent := (v_booking.coverage_snapshot->>'deductible_percent')::INTEGER;
    ELSE
      SELECT COALESCE(
        CASE s.tier
          WHEN 'club_luxury' THEN 0
          WHEN 'club_black' THEN 10
          WHEN 'standard' THEN 20
          ELSE 100
        END,
        100
      )
      INTO v_deductible_percent
      FROM subscriptions s
      WHERE s.user_id = v_booking.renter_id
        AND s.status = 'active'
        AND s.ends_at > NOW()
      LIMIT 1;

      v_deductible_percent := COALESCE(v_deductible_percent, 100);
    END IF;

    -- Hold = 5% of vehicle value (ARS)
    v_base_amount := COALESCE(v_booking.fipe_value_cents, v_booking.market_value_cents, 5000000) / 100.0;
    v_hold_amount := v_base_amount * 0.05;

    RETURN jsonb_build_object(
      'booking_id', p_booking_id,
      'tier', COALESCE(v_booking.subscription_tier_at_booking, 'none'),
      'deductible_percent', v_deductible_percent,
      'base_vehicle_value', v_base_amount,
      'hold_amount', v_hold_amount,
      'hold_amount_cents', (v_hold_amount * 100)::BIGINT,
      'using_snapshot', v_booking.coverage_snapshot IS NOT NULL
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_preauthorization_with_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_preauthorization_with_snapshot TO service_role;
