-- ============================================================================
-- Add owner_verified flag to v_cars_with_main_photo view
-- ============================================================================
-- Adds a computed boolean `owner_verified` that checks:
-- 1. profiles.email_verified = true
-- 2. profiles.id_verified = true (DNI uploaded and verified)
-- 3. At least one license document (license_front or license_back) with status='verified'
--
-- This enables grey overlay for unverified owners in the marketplace UI.
-- ============================================================================

DROP VIEW IF EXISTS public.v_cars_with_main_photo;

CREATE OR REPLACE VIEW public.v_cars_with_main_photo AS
SELECT
  c.*,
  -- Main photo URL (first photo by position/sort_order)
  (SELECT url FROM public.car_photos cp WHERE cp.car_id = c.id ORDER BY cp.position, cp.sort_order LIMIT 1) AS main_photo_url,
  -- Photo gallery as JSON array (up to 10 photos)
  COALESCE(
    (
      SELECT to_jsonb(array_agg(url ORDER BY sort_order ASC))
      FROM (
        SELECT url, sort_order
        FROM public.car_photos
        WHERE car_id = c.id
        ORDER BY sort_order ASC
        LIMIT 10
      ) AS photo_subquery
    ),
    '[]'::jsonb
  ) AS photo_gallery,
  -- Owner verification status: email + DNI + license
  (
    COALESCE(p.email_verified, false)
    AND COALESCE(p.id_verified, false)
    AND EXISTS (
      SELECT 1 FROM public.user_documents ud
      WHERE ud.user_id = c.owner_id
        AND ud.kind IN ('license_front', 'license_back')
        AND ud.status = 'verified'
    )
  ) AS owner_verified
FROM public.cars c
LEFT JOIN public.profiles p ON p.id = c.owner_id;

-- Grant select permission
GRANT SELECT ON public.v_cars_with_main_photo TO authenticated;
GRANT SELECT ON public.v_cars_with_main_photo TO anon;

COMMENT ON VIEW public.v_cars_with_main_photo IS
'Vista optimizada de autos con foto principal, galeria de fotos y estado de verificacion del owner.';
