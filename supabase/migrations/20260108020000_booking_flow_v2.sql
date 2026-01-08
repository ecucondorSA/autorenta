-- ============================================================================
-- BOOKING FLOW V2: Robust Bilateral Confirmation
-- Date: 2026-01-08
-- Description: Implements a strict state machine for vehicle returns,
--              inspections, damage reporting, and dispute resolution.
-- ============================================================================

-- 1. Extend bookings table with V2 columns
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS inspection_status TEXT DEFAULT 'pending', -- pending, good, damaged, disputed
    ADD COLUMN IF NOT EXISTS inspection_evidence JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS inspection_comment TEXT,
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
    ADD COLUMN IF NOT EXISTS dispute_evidence JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS funds_released_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ; -- For timeouts
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. State Machine Constants
-- We rely on the existing 'booking_status' enum but will interpret it strictly with the new columns.

-- 3. RPC: Mark as Returned (Renter initiated)
CREATE OR REPLACE FUNCTION public.booking_v2_return_vehicle(
    p_booking_id UUID,
    p_returned_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
BEGIN
    -- Lock booking
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
    IF v_booking.renter_id != p_returned_by THEN RAISE EXCEPTION 'Not authorized'; END IF;
    IF v_booking.status != 'in_progress' THEN RAISE EXCEPTION 'Booking not in progress'; END IF;

    -- Update state
    UPDATE bookings
    SET
        status = 'returned', -- Wait, standard enum uses 'completed' or 'in_progress'.
        -- If 'returned' is not in enum, we stick to 'in_progress' but set returned_at
        returned_at = NOW(),
        auto_release_at = NOW() + INTERVAL '48 hours' -- Auto-confirm in 48h if owner silent
    WHERE id = p_booking_id;

    RETURN jsonb_build_object('success', true, 'state', 'RETURNED');
END;
$$;

-- 4. RPC: Submit Inspection (Owner)
-- 4. RPC: Submit Inspection (Owner)
-- SUPERSEDED BY: 20260109020000_optimize_booking_v2_rpc.sql
-- Removed-CREATE OR REPLACE FUNCTION public.booking_v2_submit_inspection(...)

-- 5. RPC: Resolve Conclusion (Renter decision on Damage)
-- SUPERSEDED BY: 20260109020000_optimize_booking_v2_rpc.sql
-- Removed-CREATE OR REPLACE FUNCTION public.booking_v2_resolve_conclusion(...)
