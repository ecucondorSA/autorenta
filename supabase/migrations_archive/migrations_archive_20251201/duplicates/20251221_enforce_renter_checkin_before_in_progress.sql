CREATE OR REPLACE FUNCTION public.enforce_renter_checkin_before_in_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.booking_inspections bi
      WHERE bi.booking_id = NEW.id
        AND bi.stage = 'renter_check_in'
        AND bi.signed_at IS NOT NULL
      LIMIT 1
    ) THEN
      RAISE EXCEPTION 'renter_check_in_required' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_renter_checkin_before_in_progress ON public.bookings;

CREATE TRIGGER trg_enforce_renter_checkin_before_in_progress
BEFORE UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_renter_checkin_before_in_progress();
