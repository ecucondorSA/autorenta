-- ================================================================
-- FUNCIÓN: get_available_cars
-- Filtra autos disponibles según fechas de alquiler
-- Previene doble reserva validando overlaps
-- ================================================================

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

-- ================================================================
-- COMENTARIOS Y PERMISOS
-- ================================================================

COMMENT ON FUNCTION get_available_cars IS 
'Retorna autos disponibles para las fechas especificadas.
Valida overlaps con reservas confirmadas o en progreso.
Incluye stats de bookings y rating promedio.';

-- Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_available_cars TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_cars TO anon;

-- ================================================================
-- ÍNDICES PARA PERFORMANCE
-- ================================================================

-- Índice para búsquedas por overlap de fechas
CREATE INDEX IF NOT EXISTS idx_bookings_overlap 
ON bookings USING GIST (
  tstzrange(start_at, end_at)
);

-- Índice compuesto para filtros comunes
CREATE INDEX IF NOT EXISTS idx_bookings_car_status_dates
ON bookings(car_id, status, start_at, end_at)
WHERE status IN ('confirmed', 'in_progress');

-- Índice para autos activos
CREATE INDEX IF NOT EXISTS idx_cars_active_status
ON cars(status)
WHERE status = 'active';

-- ================================================================
-- FUNCIÓN AUXILIAR: Verificar disponibilidad de un auto específico
-- ================================================================

CREATE OR REPLACE FUNCTION is_car_available(
  p_car_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM bookings
    WHERE car_id = p_car_id
      AND status IN ('confirmed', 'in_progress')
      AND (start_at, end_at) OVERLAPS (p_start_date, p_end_date)
  );
$$;

COMMENT ON FUNCTION is_car_available IS 
'Verifica si un auto específico está disponible para las fechas dadas.
Retorna TRUE si está disponible, FALSE si no.';

GRANT EXECUTE ON FUNCTION is_car_available TO authenticated;
GRANT EXECUTE ON FUNCTION is_car_available TO anon;
