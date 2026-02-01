-- ============================================================================
-- MIGRATION: SEO Programmatic Infrastructure
-- Date: 2026-02-01
-- Purpose: Enable programmatic SEO landing pages for "Brand + City" combinations
-- ============================================================================

-- Required extension for slugify function
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

BEGIN;

-- 1. Helper function to slugify text
CREATE OR REPLACE FUNCTION public.slugify(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT trim(both '-' from regexp_replace(lower(extensions.unaccent(value)), '[^a-z0-9]+', '-', 'g'));
$$;

-- 2. Materialized View for SEO Pages
-- Pre-calculates valid combinations to avoid Soft 404s
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_seo_landing_pages AS
SELECT
  -- Slugs for matching
  public.slugify(brand_text_backup) AS slug_brand,
  public.slugify(location_city) AS slug_city,
  
  -- Display Data
  brand_text_backup AS brand,
  location_city AS city,
  location_state AS state,
  
  -- Stats
  COUNT(*) AS car_count,
  MIN(price_per_day) AS min_price,
  AVG(price_per_day)::NUMERIC(10,2) AS avg_price,
  
  -- Metadata
  MAX(updated_at) AS last_updated
FROM public.cars
WHERE status = 'active'
GROUP BY brand_text_backup, location_city, location_state
HAVING COUNT(*) > 0;

-- Indexes for fast lookup
CREATE INDEX idx_mv_seo_brand ON public.mv_seo_landing_pages(slug_brand);
CREATE INDEX idx_mv_seo_city ON public.mv_seo_landing_pages(slug_city);
CREATE INDEX idx_mv_seo_combined ON public.mv_seo_landing_pages(slug_brand, slug_city);

-- 3. Refresh Function
CREATE OR REPLACE FUNCTION public.refresh_seo_landing_pages()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_seo_landing_pages;
END;
$$;

-- 4. RPC to Get Page Data (The Brain)
CREATE OR REPLACE FUNCTION public.get_seo_page_data(
  p_segment1 TEXT,
  p_segment2 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_type TEXT;
  v_data RECORD;
  v_cars JSONB;
  v_meta_title TEXT;
  v_meta_desc TEXT;
  v_h1 TEXT;
  v_slug1 TEXT := lower(p_segment1);
  v_slug2 TEXT := lower(p_segment2);
BEGIN
  -- Logic Tree
  IF p_segment2 IS NOT NULL THEN
    -- Scenario A: Brand + City (e.g. /alquiler/toyota/palermo)
    SELECT * INTO v_data 
    FROM public.mv_seo_landing_pages 
    WHERE slug_brand = v_slug1 AND slug_city = v_slug2
    LIMIT 1;
    
    IF FOUND THEN
      v_type := 'brand_city';
      v_h1 := 'Alquiler de ' || v_data.brand || ' en ' || v_data.city;
      v_meta_title := v_h1 || ' | AutoRenta';
      v_meta_desc := 'Encontrá ' || v_data.car_count || ' autos ' || v_data.brand || ' disponibles en ' || v_data.city || ' desde $' || v_data.min_price || '. Sin tarjeta de crédito.';
    END IF;
    
  ELSE
    -- Scenario B: Brand Only OR City Only
    -- Check Brand
    SELECT 
      'brand' as type,
      brand, 
      NULL as city,
      SUM(car_count) as car_count, 
      MIN(min_price) as min_price
    INTO v_data
    FROM public.mv_seo_landing_pages
    WHERE slug_brand = v_slug1
    GROUP BY brand;
    
    IF FOUND THEN
      v_type := 'brand';
      v_h1 := 'Alquiler de ' || v_data.brand;
      v_meta_title := 'Alquilar ' || v_data.brand || ' en Argentina | AutoRenta';
      v_meta_desc := 'Explorá nuestra flota de ' || v_data.brand || '. Precios desde $' || v_data.min_price || '.';
    ELSE
      -- Check City
      SELECT 
        'city' as type,
        NULL as brand,
        city,
        SUM(car_count) as car_count, 
        MIN(min_price) as min_price
      INTO v_data
      FROM public.mv_seo_landing_pages
      WHERE slug_city = v_slug1
      GROUP BY city;
      
      IF FOUND THEN
        v_type := 'city';
        v_h1 := 'Alquiler de Autos en ' || v_data.city;
        v_meta_title := 'Alquilar Autos en ' || v_data.city || ' | AutoRenta';
        v_meta_desc := 'Alquiler de autos particulares en ' || v_data.city || '. Seguro incluido y entrega inmediata.';
      END IF;
    END IF;
  END IF;

  -- 404 if no match
  IF v_type IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch Top Cars for this Page
  -- Note: This is a simplified fetch. Ideally assumes we reuse the logic from get_available_cars
  -- but purely for SEO landing display (e.g. top 6 cheapest/best rated)
  SELECT jsonb_agg(t) INTO v_cars FROM (
    SELECT 
      c.id, 
      c.brand_text_backup as brand, 
      c.model_text_backup as model, 
      c.year, 
      c.price_per_day,
      c.currency,
      (SELECT url FROM car_photos WHERE car_id = c.id LIMIT 1) as image_url,
      c.location_city
    FROM public.cars c
    WHERE c.status = 'active'
    AND (
        (v_type = 'brand_city' AND public.slugify(c.brand_text_backup) = v_slug1 AND public.slugify(c.location_city) = v_slug2)
        OR (v_type = 'brand' AND public.slugify(c.brand_text_backup) = v_slug1)
        OR (v_type = 'city' AND public.slugify(c.location_city) = v_slug1)
    )
    ORDER BY c.price_per_day ASC
    LIMIT 6
  ) t;

  -- Build Response
  RETURN jsonb_build_object(
    'type', v_type,
    'h1', v_h1,
    'meta_title', v_meta_title,
    'meta_description', v_meta_desc,
    'stats', jsonb_build_object(
      'count', v_data.car_count,
      'min_price', v_data.min_price
    ),
    'cars', v_cars,
    'breadcrumbs', jsonb_build_array(
      jsonb_build_object('label', 'Inicio', 'url', '/'),
      jsonb_build_object('label', 'Alquiler', 'url', '/alquiler'),
      jsonb_build_object('label', v_h1, 'url', NULL)
    )
  );
END;
$$;

-- Grant permissions
GRANT SELECT ON public.mv_seo_landing_pages TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_seo_page_data TO authenticated, anon, service_role;

COMMIT;
