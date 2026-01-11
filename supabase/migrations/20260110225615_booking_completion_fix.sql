-- ============================================================================
-- FIX: Booking Completion Flow
-- Date: 2026-01-10
-- Description:
--   1. Add RPC for renter to confirm completion when no damages (happy path)
--   2. Auto-complete booking when owner inspection is good
-- ============================================================================

-- 1. RPC: Renter confirms completion (when no damages)
-- Called by renter after owner submitted inspection without damages
CREATE OR REPLACE FUNCTION public.booking_v2_confirm_completion(
    p_booking_id UUID,
    p_renter_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_id UUID;
    v_booking RECORD;
BEGIN
    -- Get booking state
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

    IF v_booking IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.renter_id != p_renter_id THEN
        RAISE EXCEPTION 'Not authorized - not the renter';
    END IF;

    -- Must be in inspected_good status (owner confirmed no damages)
    IF v_booking.status != 'inspected_good' THEN
        RAISE EXCEPTION 'Invalid status for completion: %', v_booking.status;
    END IF;

    -- Must have owner confirmation
    IF v_booking.owner_confirmed_delivery IS NOT TRUE THEN
        RAISE EXCEPTION 'Owner has not confirmed delivery yet';
    END IF;

    -- Should not have damages
    IF v_booking.has_damages IS TRUE THEN
        RAISE EXCEPTION 'Cannot confirm - damages reported. Use resolve_conclusion instead.';
    END IF;

    -- Update to completed
    UPDATE bookings
    SET
        status = 'completed',
        renter_confirmed_payment = TRUE,
        renter_confirmed_at = NOW(),
        funds_released_at = NOW(),
        completed_at = NOW(),
        auto_release_at = NULL -- Clear timer since we're completing now
    WHERE id = p_booking_id
    RETURNING id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'Update failed';
    END IF;

    -- Queue wallet release (security deposit back to renter)
    -- This is done via the existing wallet_release_lock mechanism
    BEGIN
        PERFORM public.wallet_release_lock(
            p_booking_id,
            'Liberación de garantía - Inspección sin daños confirmada por ambas partes'
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log but don't fail - wallet might already be released
        RAISE NOTICE 'Wallet release note: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'outcome', 'COMPLETED',
        'message', 'Reserva completada exitosamente'
    );
END;
$$;

COMMENT ON FUNCTION public.booking_v2_confirm_completion IS
'Renter confirms booking completion after owner inspection with no damages.
Transitions from inspected_good to completed, releases security deposit.';


-- 2. Also provide option to auto-complete directly from submit_inspection
-- when no damages (optional improvement - owner can choose)
CREATE OR REPLACE FUNCTION public.booking_v2_auto_complete_inspection(
    p_booking_id UUID,
    p_inspector_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_id UUID;
BEGIN
    -- Update directly to completed (skip inspected_good state)
    UPDATE bookings b
    SET
        status = 'completed',
        owner_confirmed_delivery = TRUE,
        owner_confirmed_at = NOW(),
        has_damages = FALSE,
        inspection_status = 'good',
        completed_at = NOW(),
        funds_released_at = NOW(),
        auto_release_at = NULL
    FROM cars c
    WHERE b.id = p_booking_id
      AND b.car_id = c.id
      AND c.owner_id = p_inspector_id
      AND b.returned_at IS NOT NULL
      AND (b.inspection_status = 'pending' OR b.inspection_status IS NULL)
    RETURNING b.id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
        -- Check why it failed
        PERFORM 1 FROM bookings WHERE id = p_booking_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

        PERFORM 1 FROM bookings b
        JOIN cars c ON b.car_id = c.id
        WHERE b.id = p_booking_id AND c.owner_id = p_inspector_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Not authorized'; END IF;

        PERFORM 1 FROM bookings WHERE id = p_booking_id AND returned_at IS NOT NULL;
        IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle not returned yet'; END IF;

        PERFORM 1 FROM bookings WHERE id = p_booking_id AND (inspection_status = 'pending' OR inspection_status IS NULL);
        IF NOT FOUND THEN RAISE EXCEPTION 'Inspection already submitted'; END IF;

        RAISE EXCEPTION 'Update failed for unknown reason';
    END IF;

    -- Release wallet
    BEGIN
        PERFORM public.wallet_release_lock(
            p_booking_id,
            'Liberación automática - Inspección sin daños confirmada por propietario'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Wallet release note: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'outcome', 'COMPLETED',
        'message', 'Inspección aprobada y reserva completada'
    );
END;
$$;

COMMENT ON FUNCTION public.booking_v2_auto_complete_inspection IS
'Owner submits inspection with no damages and auto-completes booking in one step.
Alternative to submit_inspection + renter confirmation flow.';


-- 3. Add completed_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE bookings ADD COLUMN completed_at TIMESTAMPTZ;
        COMMENT ON COLUMN bookings.completed_at IS 'Timestamp when booking was marked as completed';
    END IF;
END $$;


-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.booking_v2_confirm_completion TO authenticated;
GRANT EXECUTE ON FUNCTION public.booking_v2_auto_complete_inspection TO authenticated;

-- ============================================================================
-- Migration complete
-- ============================================================================
RAISE NOTICE '✅ Booking completion fix applied successfully';
