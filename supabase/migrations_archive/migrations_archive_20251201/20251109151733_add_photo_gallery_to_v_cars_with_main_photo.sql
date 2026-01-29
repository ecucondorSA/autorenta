-- ============================================================================
-- AUTORENTAR - Add photo_gallery to v_cars_with_main_photo view
-- ============================================================================
-- Optimización: Agregar photo_gallery directamente en la vista para evitar
-- queries adicionales desde el frontend. Esto mejora el performance del mapa.
-- ============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.v_cars_with_main_photo;

-- Create or replace view with photo_gallery included
CREATE OR REPLACE VIEW public.v_cars_with_main_photo AS
SELECT
  c.*,
  -- Main photo URL (cover photo or first photo by sort_order)
  COALESCE(
    (SELECT url FROM public.car_photos WHERE car_id = c.id AND is_cover = true LIMIT 1),
    (SELECT url FROM public.car_photos WHERE car_id = c.id ORDER BY sort_order ASC LIMIT 1)
  ) AS main_photo_url,
  -- Photo gallery as JSON array (up to 10 photos, ordered by sort_order)
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
  ) AS photo_gallery
FROM public.cars c;

-- Grant select permission
GRANT SELECT ON public.v_cars_with_main_photo TO authenticated;
GRANT SELECT ON public.v_cars_with_main_photo TO anon;

-- Add comment
COMMENT ON VIEW public.v_cars_with_main_photo IS 
'Vista optimizada de autos con foto principal y galería de fotos. 
Incluye main_photo_url (foto de portada o primera foto) y photo_gallery 
como array JSON con hasta 10 fotos ordenadas por sort_order. 
Optimizada para el mapa del marketplace.';

