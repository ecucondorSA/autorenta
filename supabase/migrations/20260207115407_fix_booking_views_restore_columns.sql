-- ============================================================================
-- FIX: Restore full booking views with all required columns
-- Date: 2026-02-07
-- Schema verified via production REST API
-- ============================================================================

-- Drop views first
DROP VIEW IF EXISTS public.owner_bookings CASCADE;
DROP VIEW IF EXISTS public.my_bookings CASCADE;

-- ============================================================================
-- owner_bookings: For car owners to see bookings on their cars
-- ============================================================================
CREATE VIEW public.owner_bookings AS
SELECT
  -- Core booking columns (verified in production)
  b.id,
  b.car_id,
  b.renter_id,
  b.owner_id,
  b.start_at,
  b.end_at,
  b.status,
  b.total_price,
  b.total_price AS total_amount, -- Alias for frontend compatibility
  b.currency,
  b.created_at,
  b.updated_at,
  b.returned_at,
  b.cancelled_at,
  b.cancellation_reason,
  b.inspection_status,
  b.notes,
  b.daily_rate,
  b.total_days,
  b.subtotal,
  b.service_fee,
  b.insurance_fee,
  b.owner_fee,
  -- Payment status derived from booking status
  CASE 
    WHEN b.status IN ('confirmed', 'in_progress', 'completed') THEN 'approved'
    WHEN b.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END AS payment_status,
  -- Deposit status (simplified)
  CASE 
    WHEN b.status = 'completed' THEN 'released'
    WHEN b.status IN ('confirmed', 'in_progress') THEN 'held'
    ELSE 'pending'
  END AS deposit_status,
  -- Payment mode default
  'card'::text AS payment_mode,
  -- Completion tracking
  CASE 
    WHEN b.status = 'completed' THEN 'completed'
    WHEN b.status = 'in_progress' THEN 'in_progress'
    ELSE 'pending'
  END AS completion_status,
  -- Dispute tracking
  CASE 
    WHEN b.dispute_reason IS NOT NULL AND b.dispute_resolved_at IS NULL THEN 'disputed'
    ELSE 'none'
  END AS dispute_status,
  -- Bilateral confirmation (derived from status)
  (b.status IN ('in_progress', 'completed')) AS owner_confirmed_delivery,
  -- Car details
  c.title AS car_title,
  c.brand AS car_brand,
  c.model AS car_model,
  c.year AS car_year,
  c.city AS car_city,
  c.province AS car_province,
  -- Main photo from car_photos table
  (SELECT cp.url FROM public.car_photos cp WHERE cp.car_id = c.id ORDER BY cp.sort_order, cp.position LIMIT 1) AS main_photo_url,
  -- Renter details
  pr.full_name AS renter_name,
  pr.avatar_url AS renter_avatar
FROM public.bookings b
JOIN public.cars c ON c.id = b.car_id
LEFT JOIN public.profiles pr ON pr.id = b.renter_id
WHERE b.owner_id = auth.uid();

-- Security setting
ALTER VIEW public.owner_bookings SET (security_invoker = true);

-- Grants
GRANT SELECT ON public.owner_bookings TO authenticated;

COMMENT ON VIEW public.owner_bookings IS 'Bookings for cars owned by the current authenticated user';

-- ============================================================================
-- my_bookings: For renters to see their own bookings
-- ============================================================================
CREATE VIEW public.my_bookings AS
SELECT
  -- Core booking columns (verified in production)
  b.id,
  b.car_id,
  b.renter_id,
  b.owner_id,
  b.start_at,
  b.end_at,
  b.status,
  b.total_price,
  b.total_price AS total_amount, -- Alias for frontend compatibility
  b.currency,
  b.created_at,
  b.updated_at,
  b.returned_at,
  b.cancelled_at,
  b.cancellation_reason,
  b.inspection_status,
  b.notes,
  b.daily_rate,
  b.total_days,
  b.subtotal,
  b.service_fee,
  b.insurance_fee,
  -- Payment status derived from booking status
  CASE 
    WHEN b.status IN ('confirmed', 'in_progress', 'completed') THEN 'approved'
    WHEN b.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END AS payment_status,
  -- Payment mode default
  'card'::text AS payment_mode,
  -- Car details
  c.title AS car_title,
  c.brand AS car_brand,
  c.model AS car_model,
  c.year AS car_year,
  c.city AS car_city,
  c.province AS car_province,
  c.owner_id AS car_owner_id,
  -- Main photo from car_photos table
  (SELECT cp.url FROM public.car_photos cp WHERE cp.car_id = c.id ORDER BY cp.sort_order, cp.position LIMIT 1) AS main_photo_url,
  -- Owner details
  po.full_name AS owner_name,
  po.avatar_url AS owner_avatar
FROM public.bookings b
JOIN public.cars c ON c.id = b.car_id
LEFT JOIN public.profiles po ON po.id = c.owner_id
WHERE b.renter_id = auth.uid();

-- Security setting
ALTER VIEW public.my_bookings SET (security_invoker = true);

-- Grants
GRANT SELECT ON public.my_bookings TO authenticated;

COMMENT ON VIEW public.my_bookings IS 'Bookings for the current authenticated user as renter';

-- ============================================================================
DO $$ BEGIN RAISE NOTICE '✅ Booking views restored with production schema columns'; END $$;
