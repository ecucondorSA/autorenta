-- Update view to include car_id for easier frontend mapping
-- Context: User requested car_id to map locations to car cards in Marketplace.

DROP VIEW IF EXISTS public.car_latest_location;

CREATE OR REPLACE VIEW public.car_latest_location AS
SELECT DISTINCT ON (p.session_id)
  p.session_id,
  b.car_id,
  p.lat,
  p.lng,
  p.recorded_at
FROM public.car_tracking_points p
JOIN public.car_tracking_sessions s ON s.id = p.session_id
JOIN public.bookings b ON b.id = s.booking_id
ORDER BY p.session_id, p.recorded_at DESC;

-- Grant access to the view (re-applying policies implicitly via underlying tables, but explicit grant might be needed for anon/authenticated if RLS is tricky on views)
-- Note: Views in Supabase/Postgres inherit RLS from underlying tables if created with security_invoker (default is security_definer behavior for views? No, standard views run with permissions of the user, but RLS on underlying tables applies).
-- However, for simplicity and to ensure it works as expected with the previous RLS setup:
GRANT SELECT ON public.car_latest_location TO authenticated;
GRANT SELECT ON public.car_latest_location TO service_role;
