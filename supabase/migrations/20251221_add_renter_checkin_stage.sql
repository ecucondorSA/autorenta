ALTER TABLE public.booking_inspections
  DROP CONSTRAINT IF EXISTS booking_inspections_stage_check;

ALTER TABLE public.booking_inspections
  ADD CONSTRAINT booking_inspections_stage_check
  CHECK (stage = ANY (ARRAY['check_in'::text, 'check_out'::text, 'renter_check_in'::text]));
