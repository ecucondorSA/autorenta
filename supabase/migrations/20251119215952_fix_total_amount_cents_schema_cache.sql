-- ============================================================================
-- FIX: Schema Cache Error - total_amount_cents column
-- Date: 2025-11-19
-- Purpose: Ensure schema cache is refreshed and no references to
--          non-existent total_amount_cents column in bookings table
-- Issue: Error "Could not find the 'total_amount_cents' column of 'bookings'
--        in the schema cache"
-- ============================================================================
--
-- The bookings table has:
--   - total_amount (NUMERIC) - decimal amount
--   - total_cents (INTEGER) - amount in cents
--
-- It does NOT have total_amount_cents column.
--
-- This migration ensures all views and functions use the correct column names.
-- ============================================================================

BEGIN;

-- Refresh schema cache by recreating views that might reference bookings
-- This forces Supabase to rebuild the schema cache

-- Recreate my_bookings view to ensure it uses correct columns
DROP VIEW IF EXISTS public.my_bookings CASCADE;

CREATE OR REPLACE VIEW public.my_bookings AS
SELECT
  b.*,
  c.title AS car_title,
  c.brand AS car_brand,
  c.model AS car_model,
  c.year AS car_year,
  c.location_city AS car_city,
  c.location_province AS car_province,
  -- Get main photo (cover photo or first photo)
  COALESCE(
    (SELECT url FROM public.car_photos WHERE car_id = c.id ORDER BY sort_order LIMIT 1)
  ) AS main_photo_url,
  -- Payment info
  pay.status AS payment_status,
  pay.provider AS payment_table_provider
FROM public.bookings b
JOIN public.cars c ON c.id = b.car_id
LEFT JOIN public.payments pay ON pay.id = b.payment_id
WHERE b.renter_id = auth.uid();

-- Grant select permission
GRANT SELECT ON public.my_bookings TO authenticated;

COMMENT ON VIEW public.my_bookings IS 'Bookings for the current authenticated user with car details - Schema cache refreshed';

-- Recreate owner_bookings view
DROP VIEW IF EXISTS public.owner_bookings CASCADE;

CREATE OR REPLACE VIEW public.owner_bookings AS
SELECT
  b.*,
  c.title AS car_title,
  c.brand AS car_brand,
  c.model AS car_model,
  c.year AS car_year,
  c.location_city AS car_city,
  c.location_province AS car_province,
  -- Get main photo
  COALESCE(
    (SELECT url FROM public.car_photos WHERE car_id = c.id ORDER BY sort_order LIMIT 1)
  ) AS main_photo_url,
  -- Renter info
  renter.full_name AS renter_name,
  renter.email AS renter_email,
  -- Payment info
  pay.status AS payment_status,
  pay.provider AS payment_table_provider
FROM public.bookings b
JOIN public.cars c ON c.id = b.car_id
LEFT JOIN public.profiles renter ON renter.id = b.renter_id
LEFT JOIN public.payments pay ON pay.id = b.payment_id
WHERE c.owner_id = auth.uid();

-- Grant select permission
GRANT SELECT ON public.owner_bookings TO authenticated;

COMMENT ON VIEW public.owner_bookings IS 'Bookings for cars owned by the current authenticated user - Schema cache refreshed';

COMMIT;





