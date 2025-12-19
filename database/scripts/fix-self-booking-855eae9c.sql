-- Fix autorreserva (self-booking) + prevención
-- Booking afectado: 855eae9c-675d-46bc-92b2-03c5466ecc5e

BEGIN;

-- 1) Cancelar la autorreserva (solo si está pendiente)
UPDATE public.bookings
SET
  status = 'cancelled',
  cancelled_at = now(),
  cancellation_reason = 'self_booking_cleanup'
WHERE id = '855eae9c-675d-46bc-92b2-03c5466ecc5e'
  AND status IN ('pending', 'pending_payment');

-- 2) Prevenir futuras autorreservas
CREATE OR REPLACE FUNCTION public.prevent_self_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM public.cars
  WHERE id = NEW.car_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'CAR_NOT_FOUND';
  END IF;

  IF NEW.renter_id = v_owner_id THEN
    RAISE EXCEPTION 'SELF_BOOKING_NOT_ALLOWED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_booking ON public.bookings;

CREATE TRIGGER trg_prevent_self_booking
BEFORE INSERT OR UPDATE OF car_id, renter_id
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_booking();

COMMIT;
