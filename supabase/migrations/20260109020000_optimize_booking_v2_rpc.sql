-- ============================================================================
-- OPTIMIZATION: Non-blocking Booking V2 RPCs
-- Date: 2026-01-09
-- Description: Removes explicit 'FOR UPDATE' locks to preventing 504 Gateway Timeouts
--              during Checkout/Inspection/Resolution phases.
-- ============================================================================

-- 1. Optimized Submit Inspection (Owner) - Check-out
CREATE OR REPLACE FUNCTION public.booking_v2_submit_inspection(
    p_booking_id UUID,
    p_inspector_id UUID,
    p_has_damage BOOLEAN,
    p_damage_amount_cents BIGINT DEFAULT 0,
    p_evidence JSONB DEFAULT '[]'::jsonb,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_id UUID;
BEGIN
    -- Perform UPDATE directly causing implicit row lock only for duration of update
    IF p_has_damage THEN
         UPDATE bookings
         SET
            owner_confirmed_delivery = TRUE,
            owner_confirmed_at = NOW(),
            has_damages = TRUE,
            damage_amount_cents = p_damage_amount_cents,
            damage_description = p_description,
            inspection_evidence = p_evidence,
            inspection_status = 'damaged',
            inspection_comment = p_description,
            auto_release_at = NOW() + INTERVAL '72 hours'
         WHERE id = p_booking_id
           AND owner_id = p_inspector_id
           AND returned_at IS NOT NULL
           AND owner_confirmed_delivery IS FALSE
         RETURNING id INTO v_updated_id;
    ELSE
         -- No damage = Happy Path
         UPDATE bookings
         SET
            owner_confirmed_delivery = TRUE,
            owner_confirmed_at = NOW(),
            has_damages = FALSE,
            inspection_status = 'good',
            auto_release_at = NOW() + INTERVAL '24 hours'
         WHERE id = p_booking_id
           AND owner_id = p_inspector_id
           AND returned_at IS NOT NULL
           AND owner_confirmed_delivery IS FALSE
         RETURNING id INTO v_updated_id;
    END IF;

    IF v_updated_id IS NULL THEN
        -- Determine why it failed (for better error msg) - READ ONLY (No Lock)
        PERFORM 1 FROM bookings WHERE id = p_booking_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

        PERFORM 1 FROM bookings WHERE id = p_booking_id AND owner_id = p_inspector_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Not authorized'; END IF;

        PERFORM 1 FROM bookings WHERE id = p_booking_id AND returned_at IS NOT NULL;
        IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle not returned yet'; END IF;

        PERFORM 1 FROM bookings WHERE id = p_booking_id AND owner_confirmed_delivery IS FALSE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Inspection already submitted'; END IF;

        RAISE EXCEPTION 'Update failed for unknown reason';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'outcome', CASE WHEN p_has_damage THEN 'DAMAGE_REPORTED' ELSE 'INSPECTED_GOOD' END
    );
END;
$$;

-- 2. Optimized Resolve Conclusion (Renter) - Resolution
CREATE OR REPLACE FUNCTION public.booking_v2_resolve_conclusion(
    p_booking_id UUID,
    p_renter_id UUID,
    p_accept_damage BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_id UUID;
    v_damage_amount BIGINT;
BEGIN
    -- Get damage amount without locking
    SELECT damage_amount_cents INTO v_damage_amount FROM bookings WHERE id = p_booking_id;

    IF p_accept_damage THEN
        -- Renter accepts charge
        -- Insert into Capture Queue (No lock on booking needed for insert)
        INSERT INTO public.payment_captures_queue (
            booking_id,
            amount_cents,
            reason
        ) VALUES (
            p_booking_id,
            v_damage_amount,
            'damage_charge'
        );

        UPDATE bookings
        SET
            renter_confirmed_payment = TRUE,
            renter_confirmed_at = NOW(),
            status = 'completed',
            funds_released_at = NOW(),
            inspection_status = 'damage_accepted'
        WHERE id = p_booking_id
          AND renter_id = p_renter_id
          AND has_damages IS TRUE
          AND renter_confirmed_payment IS FALSE
        RETURNING id INTO v_updated_id;

        IF v_updated_id IS NULL THEN RAISE EXCEPTION 'Could not resolve: Check permissions or status'; END IF;

        RETURN jsonb_build_object('success', true, 'outcome', 'DAMAGE_ACCEPTED');
    ELSE
        -- Renter disputes
        UPDATE bookings
        SET
            inspection_status = 'disputed',
            dispute_reason = 'Renter rejected damage report',
            auto_release_at = NULL
        WHERE id = p_booking_id
          AND renter_id = p_renter_id
          AND has_damages IS TRUE
          AND renter_confirmed_payment IS FALSE
        RETURNING id INTO v_updated_id;

        IF v_updated_id IS NULL THEN RAISE EXCEPTION 'Could not resolve: Check permissions or status'; END IF;

        RETURN jsonb_build_object('success', true, 'outcome', 'DISPUTE_OPENED');
    END IF;
END;
$$;
