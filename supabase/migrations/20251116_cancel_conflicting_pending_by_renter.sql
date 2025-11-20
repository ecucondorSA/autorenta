-- ============================================================================
-- Migration: Cancel Conflicting Pending Bookings by Same Renter
-- Date: 2025-11-16
-- Purpose: Allow users to automatically replace their own pending bookings
--          when creating a new reservation for overlapping dates
-- ============================================================================

-- ============================================================================
-- FUNCTION: cancel_conflicting_pending_by_renter
-- ============================================================================
-- Cancels pending bookings from the same renter that overlap with new dates
-- Only cancels if bookings have more than 5 minutes until expiration
-- Returns the number of bookings cancelled
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_conflicting_pending_by_renter(
  p_renter_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_expiration_threshold_minutes INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
BEGIN
  -- Cancel pending bookings from the same renter that overlap with new dates
  -- Only cancel if they have more than threshold minutes until expiration
  -- This prevents cancelling bookings that are about to expire anyway
  UPDATE bookings
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = 'Replaced by new booking request for overlapping dates'
  WHERE renter_id = p_renter_id
    AND status = 'pending'
    AND (start_at, end_at) OVERLAPS (p_start, p_end)
    AND (
      expires_at IS NULL
      OR expires_at > NOW() + (p_expiration_threshold_minutes || ' minutes')::INTERVAL
    );

  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

  RETURN v_cancelled_count;
END;
$$;

-- Grant execute permission to service_role only
-- This function should only be called from request_booking RPC (which uses SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION cancel_conflicting_pending_by_renter(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO service_role;

COMMENT ON FUNCTION cancel_conflicting_pending_by_renter IS
'Cancels pending bookings from the same renter that overlap with new booking dates. Only cancels bookings with more than threshold minutes until expiration. Returns the number of bookings cancelled.';








