-- ============================================================================
-- FIX: Create owner_pending_approvals view
-- Date: 2026-02-03
-- ============================================================================

DROP VIEW IF EXISTS public.owner_pending_approvals CASCADE;

CREATE VIEW public.owner_pending_approvals AS
SELECT
  b.id AS booking_id,
  b.car_id,
  COALESCE(c.title, '') || ' ' || COALESCE(c.model, '') AS car_name,
  c.year AS car_year,
  b.renter_id,
  b.start_at,
  b.end_at,
  b.total_price AS total_amount,
  COALESCE(b.currency, 'ARS') AS currency,
  b.created_at AS booking_created_at,
  COALESCE(b.total_days, 1) AS days_count,
  pr.full_name AS renter_name,
  pr.avatar_url AS renter_avatar
FROM public.bookings b
JOIN public.cars c ON c.id = b.car_id
LEFT JOIN public.profiles pr ON pr.id = b.renter_id
WHERE c.owner_id = auth.uid()
  AND b.status = 'pending';

ALTER VIEW public.owner_pending_approvals SET (security_invoker = true);
GRANT SELECT ON public.owner_pending_approvals TO authenticated;
