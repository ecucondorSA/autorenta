-- ============================================================================
-- AUTOMATION: Booking V2 Timeouts
-- Date: 2026-01-08
-- Description: Automatically processes bookings that are stuck in 'returned'
--              or 'damage_reported' status for too long.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_booking_v2_timeouts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auto_released_count INT := 0;
    v_auto_accepted_count INT := 0;
    v_booking RECORD;
BEGIN
    -- 1. Auto-Release (Owner silent for > 24/48h)
    -- If status is 'returned' and auto_release_at is passed
    FOR v_booking IN
        SELECT id, car_id FROM bookings
        WHERE status = 'returned'
          AND auto_release_at < NOW()
    LOOP
        UPDATE bookings
        SET
            status = 'completed',
            inspection_status = 'auto_good',
            owner_confirmed_delivery = TRUE,
            owner_confirmed_at = NOW(),
            funds_released_at = NOW()
        WHERE id = v_booking.id;

        v_auto_released_count := v_auto_released_count + 1;
    END LOOP;

    -- 2. Auto-Accept Damage (Renter silent for > 72h)
    -- If status is 'damage_reported' and auto_release_at is passed
    FOR v_booking IN
        SELECT id, damage_amount_cents FROM bookings
        WHERE status = 'damage_reported'
          AND auto_release_at < NOW()
    LOOP
        -- Enqueue for capture
        INSERT INTO public.payment_captures_queue (
            booking_id,
            amount_cents,
            reason
        ) VALUES (
            v_booking.id,
            v_booking.damage_amount_cents,
            'auto_damage_acceptance'
        );

        UPDATE bookings
        SET
            status = 'completed',
            renter_confirmed_payment = TRUE,
            renter_confirmed_at = NOW(),
            funds_released_at = NOW(),
            inspection_status = 'auto_damage_accepted'
        WHERE id = v_booking.id;

        v_auto_accepted_count := v_auto_accepted_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'auto_released', v_auto_released_count,
        'auto_accepted', v_auto_accepted_count
    );
END;
$$;
