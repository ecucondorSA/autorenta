-- ================================================================
-- MIGRATION: Add region_id to get_available_cars function
-- ================================================================
--
-- PROBLEMA: La función get_available_cars no retorna region_id,
-- lo cual impide que el frontend calcule precios dinámicos.
--
-- SOLUCIÓN: Agregar region_id al RETURNS TABLE y al SELECT
-- ================================================================

-- ✅ DROP FUNCTION primero porque estamos cambiando el tipo de retorno
DROP FUNCTION IF EXISTS get_available_cars(timestamp with time zone, timestamp with time zone, integer, integer);

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
  price_per_day_cents INT,
  currency CHAR(3),
  status TEXT,
  location JSONB,
  images TEXT[],
  features JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  region_id UUID, -- ✅ NUEVO: Para precios dinámicos
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
    c.brand,
    c.model,
    c.year,
    c.plate,
    c.price_per_day_cents,
    c.currency,
    c.status,
    c.location,
    c.images,
    c.features,
    c.created_at,
    c.updated_at,
    c.region_id, -- ✅ NUEVO: Incluir region_id
    -- Agregados
    COUNT(DISTINCT b.id) as total_bookings,
    COALESCE(AVG(r.rating), 0)::NUMERIC as avg_rating
  FROM cars c
  LEFT JOIN bookings b ON b.car_id = c.id
  LEFT JOIN reviews r ON r.booking_id = b.id
  WHERE
    -- Solo autos activos
    c.status = 'active'
    -- Sin reservas confirmadas que se solapen con las fechas solicitadas
    AND NOT EXISTS (
      SELECT 1
      FROM bookings b2
      WHERE b2.car_id = c.id
        AND b2.status IN ('confirmed', 'in_progress')
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
✅ ACTUALIZADO: Incluye region_id para precios dinámicos.';
