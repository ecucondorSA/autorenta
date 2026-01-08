-- ============================================================================
-- OPTIMIZATION: Non-blocking Start Rental RPC
-- Date: 2026-01-09
-- Description: Introduces booking_v2_start_rental to efficiently transition
--              booking to 'in_progress' without locking issues.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.booking_v2_start_rental(
    p_booking_id UUID,
    p_renter_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_id UUID;
    v_booking_status TEXT;
BEGIN
    -- 1. Optimistic status check (no lock)
    SELECT status INTO v_booking_status FROM bookings WHERE id = p_booking_id;

    IF v_booking_status = 'in_progress' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Rental already started', 'status', 'in_progress');
    END IF;

    IF v_booking_status != 'confirmed' THEN
         RETURN jsonb_build_object('success', false, 'error', 'Booking not confirmed', 'status', v_booking_status);
    END IF;

    -- 2. Atomic Update (No explicit FOR UPDATE)
    UPDATE bookings
    SET
        status = 'in_progress',
        check_in_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_booking_id
      AND renter_id = p_renter_id
      AND status = 'confirmed'
    RETURNING id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
        -- Double check if it was already updated by race condition
        PERFORM 1 FROM bookings WHERE id = p_booking_id AND status = 'in_progress';
        IF FOUND THEN
             RETURN jsonb_build_object('success', true, 'message', 'Rental started (race resolved)', 'status', 'in_progress');
        END IF;

        RETURN jsonb_build_object('success', false, 'error', 'Update failed: Check permissions or status');
    END IF;

    -- 3. Side Effects (Optional - e.g. Notifications)
    -- These are handled by triggers (e.g. notifications) which run AFTER update.
    -- Since we didn't hold a lock for long, triggers should run fine.

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rental started successfully',
        'status', 'in_progress',
        'booking_id', v_updated_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.booking_v2_start_rental(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.booking_v2_start_rental(UUID, UUID) TO service_role;
