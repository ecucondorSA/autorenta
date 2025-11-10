-- ============================================================================
-- FIX: get_available_cars function - Corregir nombre de columna
-- ============================================================================
-- La función estaba buscando price_per_day_cents pero la columna es price_per_day
-- ============================================================================

-- Primero eliminar la función existente para poder cambiar el tipo de retorno
DROP FUNCTION IF EXISTS get_available_cars(TIMESTAMPTZ, TIMESTAMPTZ, INT, INT);

CREATE OR REPLACE FUNCTION get_available_cars(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  brand TEXT,
  model TEXT,
  year INT,
  plate TEXT,
  price_per_day NUMERIC,
  currency CHAR(3),
  status TEXT,
  location JSONB,
  images TEXT[],
  features JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Campos adicionales útiles
  total_bookings BIGINT,
  avg_rating NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.owner_id,
    c.brand_text_backup AS brand,
    c.model_text_backup AS model,
    c.year,
    c.plate,
    c.price_per_day,
    c.currency,
    c.status::TEXT,
    jsonb_build_object(
      'city', c.location_city,
      'state', c.location_state,
      'province', c.location_province,
      'country', c.location_country,
      'lat', c.location_lat,
      'lng', c.location_lng
    ) AS location,
    COALESCE(
      ARRAY(
        SELECT url FROM car_photos WHERE car_id = c.id ORDER BY sort_order LIMIT 10
      ),
      ARRAY[]::TEXT[]
    ) AS images,
    COALESCE(c.features, '{}'::jsonb) AS features,
    c.created_at,
    c.updated_at,
    -- Agregados
    COUNT(DISTINCT b.id) as total_bookings,
    COALESCE(AVG(r.rating_overall), 0)::NUMERIC as avg_rating
  FROM cars c
  LEFT JOIN bookings b ON b.car_id = c.id
  LEFT JOIN reviews r ON r.car_id = c.id
  WHERE 
    -- Solo autos activos
    c.status = 'active'
    -- Sin reservas (pending, confirmed, in_progress) que se solapen con las fechas solicitadas
    AND NOT EXISTS (
      SELECT 1 
      FROM bookings b2
      WHERE b2.car_id = c.id
        AND b2.status IN ('pending', 'confirmed', 'in_progress')
        AND (b2.start_at, b2.end_at) OVERLAPS (p_start_date, p_end_date)
    )
  GROUP BY c.id
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_available_cars IS 
'Retorna autos disponibles para las fechas especificadas.
Valida overlaps con reservas confirmadas o en progreso.
Incluye stats de bookings y rating promedio.
FIX: Corregido para usar price_per_day en lugar de price_per_day_cents.';

