UPDATE public.bookings b
SET metadata = jsonb_set(
  COALESCE(b.metadata, '{}'::jsonb),
  '{renter_checkin_required}',
  'true'::jsonb,
  true
)
WHERE b.status = 'in_progress'
  AND NOT EXISTS (
    SELECT 1
    FROM public.booking_inspections bi
    WHERE bi.booking_id = b.id
      AND bi.stage = 'renter_check_in'
      AND bi.signed_at IS NOT NULL
  );
