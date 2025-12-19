BEGIN;

-- Prevent “self-booking”: renter cannot book their own car.
-- Implemented as a trigger because CHECK constraints cannot reference other tables.

CREATE OR REPLACE FUNCTION public.prevent_self_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  -- Fetch car owner
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
