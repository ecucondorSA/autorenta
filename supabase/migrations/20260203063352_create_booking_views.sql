-- ============================================================================
-- FIX: Create missing views for bookings page
-- Date: 2026-02-03
-- Applied via Management API
-- ============================================================================

DROP VIEW IF EXISTS public.owner_bookings CASCADE;
DROP VIEW IF EXISTS public.my_bookings CASCADE;

-- owner_bookings: for car owners to see bookings on their cars
CREATE VIEW public.owner_bookings AS
SELECT
  b.id,
  b.car_id,
  b.renter_id,
  b.owner_id,
  b.start_at,
  b.end_at,
  b.status,
  b.total_price,
  b.currency,
  b.created_at,
  b.updated_at,
  b.returned_at,
  b.cancelled_at,
  b.cancellation_reason,
  b.inspection_status,
  b.notes,
  -- Car details
  c.title AS car_title,
  c.brand AS car_brand,
  c.model AS car_model,
  c.city AS car_city,
  c.province AS car_province,
  -- Renter details
  pr.full_name AS renter_name,
  pr.avatar_url AS renter_avatar
FROM public.bookings b
JOIN public.cars c ON c.id = b.car_id
LEFT JOIN public.profiles pr ON pr.id = b.renter_id
WHERE c.owner_id = auth.uid();

-- my_bookings: for renters to see their own bookings
CREATE VIEW public.my_bookings AS
SELECT
  b.id,
  b.car_id,
  b.renter_id,
  b.owner_id,
  b.start_at,
  b.end_at,
  b.status,
  b.total_price,
  b.currency,
  b.created_at,
  b.updated_at,
  b.returned_at,
  b.cancelled_at,
  b.cancellation_reason,
  b.inspection_status,
  b.notes,
  -- Car details
  c.title AS car_title,
  c.brand AS car_brand,
  c.model AS car_model,
  c.city AS car_city,
  c.province AS car_province,
  c.owner_id AS car_owner_id,
  -- Owner details
  po.full_name AS owner_name,
  po.avatar_url AS owner_avatar
FROM public.bookings b
JOIN public.cars c ON c.id = b.car_id
LEFT JOIN public.profiles po ON po.id = c.owner_id
WHERE b.renter_id = auth.uid();

-- Security settings
ALTER VIEW public.owner_bookings SET (security_invoker = true);
ALTER VIEW public.my_bookings SET (security_invoker = true);

-- Grants
GRANT SELECT ON public.owner_bookings TO authenticated;
GRANT SELECT ON public.my_bookings TO authenticated;
