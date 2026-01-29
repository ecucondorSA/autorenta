-- ============================================================================
-- FIX: Money Capture Logic "The Missing Link"
-- Date: 2026-01-08
-- Description: Creates a queue for async payment captures and updates the
--              resolution RPC to actually enqueue the charge.
-- ============================================================================

-- 1. Create Queue Table
CREATE TABLE IF NOT EXISTS public.payment_captures_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    amount_cents BIGINT NOT NULL,
    currency TEXT DEFAULT 'ARS',
    reason TEXT DEFAULT 'damage_charge',
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_log JSONB
);

-- Index for fast polling
CREATE INDEX IF NOT EXISTS idx_payment_captures_pending ON public.payment_captures_queue(status) WHERE status = 'pending';

-- 2. Patch RPC: Resolve Conclusion (Renter decision on Damage)
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
    v_booking RECORD;
BEGIN
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

    IF v_booking.renter_id != p_renter_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
    IF NOT v_booking.has_damages THEN RAISE EXCEPTION 'No damages to resolve'; END IF;
    IF v_booking.renter_confirmed_payment THEN RAISE EXCEPTION 'Already resolved'; END IF;

    IF p_accept_damage THEN
        -- Renter accepts charge
        -- ✅ FIX: Insert into Capture Queue instead of empty comment
        INSERT INTO public.payment_captures_queue (
            booking_id,
            amount_cents,
            reason
        ) VALUES (
            p_booking_id,
            v_booking.damage_amount_cents,
            'damage_charge'
        );

        UPDATE bookings
        SET
            renter_confirmed_payment = TRUE,
            renter_confirmed_at = NOW(),
            status = 'completed',
            funds_released_at = NOW(), -- Effectual release (Queue will handle actual money)
            inspection_status = 'damage_accepted'
        WHERE id = p_booking_id;

        RETURN jsonb_build_object('success', true, 'outcome', 'DAMAGE_ACCEPTED');
    ELSE
        -- Renter disputes
        UPDATE bookings
        SET
            inspection_status = 'disputed', -- Enum 'disputed' added in previous migration
            dispute_reason = 'Renter rejected damage report',
            auto_release_at = NULL -- Stop auto timers, require manual mediation
        WHERE id = p_booking_id;

        RETURN jsonb_build_object('success', true, 'outcome', 'DISPUTE_OPENED');
    END IF;
END;
$$;
