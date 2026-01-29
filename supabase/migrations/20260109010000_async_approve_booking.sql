-- ============================================================================
-- FIX: Async Booking Approval to prevent 504 Timeouts
-- Date: 2026-01-09
-- Description: Replaces the likely synchronous `approve_booking` with a lightweight
--              `approve_booking_v2` that only updates state. Heavy lifting
--              (payments, notifications) should be handled by triggers/queues.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_booking_v2(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Lock booking to prevent race conditions
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

  -- 1. Validation
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  -- Verify owner permission checks (via car ownership)
  IF NOT EXISTS (SELECT 1 FROM cars WHERE id = v_booking.car_id AND owner_id = v_user_id) THEN
     RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para aprobar esta reserva');
  END IF;

  IF v_booking.status != 'pending' THEN
     RETURN jsonb_build_object('success', false, 'error', 'La reserva no está en estado pendiente (Actual: ' || v_booking.status || ')');
  END IF;

  -- 2. Update Status to 'confirmed'
  -- Triggers will handle notifications and other side effects
  UPDATE bookings
  SET
    status = 'confirmed',
    updated_at = NOW(),
    owner_confirmed_at = NOW()
  WHERE id = p_booking_id;

  -- 3. Optimization: If we need extended actions (like capturing money),
  -- we should rely on the triggers on the 'bookings' table or use the payment_captures_queue.
  -- For now, we rely on the existing triggers to handle the transition logic asynchronously if possible.

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reserva aprobada exitosamente',
    'booking_id', p_booking_id,
    'new_status', 'confirmed'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_booking_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_booking_v2(UUID) TO service_role;
