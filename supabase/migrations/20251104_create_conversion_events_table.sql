-- ================================================
-- MIGRATION: Create Conversion Events Tracking Table
-- Date: 2025-11-04
-- Description: Tabla para trackear eventos de conversión (analytics interno)
--              Complementa Google Analytics 4 con datos propios
-- ================================================

-- Crear tabla conversion_events
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event Info
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT event_type_not_empty CHECK (char_length(event_type) > 0)
);

-- Índices para optimizar queries
CREATE INDEX idx_conversion_events_car_id ON public.conversion_events(car_id);
CREATE INDEX idx_conversion_events_user_id ON public.conversion_events(user_id);
CREATE INDEX idx_conversion_events_event_type ON public.conversion_events(event_type);
CREATE INDEX idx_conversion_events_created_at ON public.conversion_events(created_at DESC);

-- Índice compuesto para análisis por auto y tipo de evento
CREATE INDEX idx_conversion_events_car_event ON public.conversion_events(car_id, event_type);

-- Índice GIN para búsquedas en JSONB
CREATE INDEX idx_conversion_events_data ON public.conversion_events USING gin(event_data);

-- ================================================
-- RLS (Row Level Security)
-- ================================================

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

-- Policy: Cualquier usuario autenticado puede insertar eventos
CREATE POLICY "Authenticated users can insert their events"
  ON public.conversion_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- El user_id debe ser null O coincidir con el usuario autenticado
    user_id IS NULL OR user_id = auth.uid()
  );

-- Policy: Usuarios pueden ver solo sus propios eventos
CREATE POLICY "Users can view their own events"
  ON public.conversion_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Service role puede ver todos los eventos (para analytics)
CREATE POLICY "Service role can view all events"
  ON public.conversion_events
  FOR SELECT
  TO service_role
  USING (true);

-- Policy: Service role puede insertar cualquier evento (para backend)
CREATE POLICY "Service role can insert all events"
  ON public.conversion_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ================================================
-- Función auxiliar para obtener estadísticas de eventos
-- ================================================

CREATE OR REPLACE FUNCTION public.get_conversion_stats(
  p_car_id UUID DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT now() - interval '30 days',
  p_to_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT,
  unique_users BIGINT,
  first_event TIMESTAMPTZ,
  last_event TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT ce.user_id) AS unique_users,
    MIN(ce.created_at) AS first_event,
    MAX(ce.created_at) AS last_event
  FROM public.conversion_events ce
  WHERE
    (p_car_id IS NULL OR ce.car_id = p_car_id)
    AND (p_event_type IS NULL OR ce.event_type = p_event_type)
    AND ce.created_at >= p_from_date
    AND ce.created_at <= p_to_date
  GROUP BY ce.event_type
  ORDER BY event_count DESC;
END;
$$;

-- Comentario en la función
COMMENT ON FUNCTION public.get_conversion_stats IS
  'Obtiene estadísticas agregadas de eventos de conversión. ' ||
  'Filtrable por car_id, event_type y rango de fechas.';

-- ================================================
-- Comentarios en la tabla y columnas
-- ================================================

COMMENT ON TABLE public.conversion_events IS
  'Eventos de conversión para analytics interno. ' ||
  'Complementa Google Analytics 4 con datos propios.';

COMMENT ON COLUMN public.conversion_events.event_type IS
  'Tipo de evento: date_preset_clicked, cta_clicked, booking_initiated, etc.';

COMMENT ON COLUMN public.conversion_events.event_data IS
  'Datos adicionales del evento en formato JSON (preset_type, days_count, total_price, etc.)';

-- ================================================
-- Grant permissions
-- ================================================

-- Authenticated users pueden insertar y leer sus eventos
GRANT INSERT, SELECT ON public.conversion_events TO authenticated;

-- Service role tiene acceso completo
GRANT ALL ON public.conversion_events TO service_role;

-- ================================================
-- Success message
-- ================================================

DO $$
BEGIN
  RAISE NOTICE 'Conversion events table created successfully!';
  RAISE NOTICE 'Analytics tracking ready for GA4 + Supabase dual tracking.';
END $$;
