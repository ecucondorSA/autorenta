-- ============================================================================
-- MIGRATION: SEO Sitemap Helper
-- Date: 2026-02-01 12:30:00
-- Purpose: Function to retrieve all valid SEO URLs for sitemap generation
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_all_seo_urls()
RETURNS TABLE (
  url_path TEXT,
  lastmod TIMESTAMPTZ,
  priority NUMERIC(2,1),
  changefreq TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 1. Brand Pages (High Priority)
  -- e.g. /alquiler/toyota
  RETURN QUERY
  SELECT 
    'alquiler/' || slug_brand,
    MAX(last_updated),
    0.8,
    'daily'
  FROM public.mv_seo_landing_pages
  GROUP BY slug_brand;

  -- 2. City Pages (High Priority)
  -- e.g. /alquiler/palermo
  RETURN QUERY
  SELECT 
    'alquiler/' || slug_city,
    MAX(last_updated),
    0.8,
    'daily'
  FROM public.mv_seo_landing_pages
  GROUP BY slug_city;

  -- 3. Combination Pages (Medium Priority)
  -- e.g. /alquiler/toyota/palermo
  RETURN QUERY
  SELECT 
    'alquiler/' || slug_brand || '/' || slug_city,
    last_updated,
    0.6,
    'weekly'
  FROM public.mv_seo_landing_pages;

END;
$$;

-- Grant access to service_role (for Edge Function) and anon (if needed, but usually service_role)
GRANT EXECUTE ON FUNCTION public.get_all_seo_urls TO service_role;
GRANT EXECUTE ON FUNCTION public.get_all_seo_urls TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_seo_urls TO authenticated;

COMMIT;
