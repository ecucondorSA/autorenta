-- ============================================================================
-- FIX: Booking b25f2723 stuck in confirmed state
-- Date: 2026-01-11
-- Description:
--   The booking missed the check-in step and is stuck in 'confirmed'.
--   This migration transitions it to 'in_progress' so the owner can complete check-out.
-- ============================================================================

-- 1. Update the specific booking to in_progress
UPDATE bookings
SET
    status = 'in_progress',
    updated_at = NOW()
WHERE id::text LIKE 'b25f2723%'
  AND status = 'confirmed';

-- 2. Create a helper RPC to force-start bookings that missed check-in
-- This can be used by owners when the start date has passed
CREATE OR REPLACE FUNCTION public.booking_force_start(
    p_booking_id UUID,
    p_owner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
BEGIN
    -- Get booking with car owner validation
    SELECT b.*, c.owner_id as car_owner_id
    INTO v_booking
    FROM bookings b
    JOIN cars c ON b.car_id = c.id
    WHERE b.id = p_booking_id;

    IF v_booking IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.car_owner_id != p_owner_id THEN
        RAISE EXCEPTION 'Not authorized - not the car owner';
    END IF;

    IF v_booking.status != 'confirmed' THEN
        RAISE EXCEPTION 'Booking must be in confirmed status. Current: %', v_booking.status;
    END IF;

    -- Check if start date has passed
    IF v_booking.start_at > NOW() THEN
        RAISE EXCEPTION 'Cannot force start before the scheduled start date';
    END IF;

    -- Transition to in_progress
    UPDATE bookings
    SET
        status = 'in_progress',
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Booking started successfully',
        'new_status', 'in_progress'
    );
END;
$$;

COMMENT ON FUNCTION public.booking_force_start IS
'Allows owner to force-start a booking that missed check-in when the start date has passed';

GRANT EXECUTE ON FUNCTION public.booking_force_start TO authenticated;

-- ============================================================================
DO $$ BEGIN RAISE NOTICE '✅ Booking b25f2723 fixed and force_start RPC created'; END $$;
