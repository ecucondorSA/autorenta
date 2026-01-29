-- ============================================================================
-- RECOMMENDATIONS TRACKING SYSTEM
-- Autorentar - 2026-01-20
-- ============================================================================

-- 1. CAR VIEWS - Historial de vistas de autos
-- La tabla ya existe con viewer_id, agregamos columnas faltantes
-- ============================================================================
DO $$
BEGIN
    -- Agregar columna view_duration_seconds si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'car_views' AND column_name = 'view_duration_seconds'
    ) THEN
        ALTER TABLE public.car_views ADD COLUMN view_duration_seconds INTEGER;
    END IF;

    -- Agregar columna source si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'car_views' AND column_name = 'source'
    ) THEN
        ALTER TABLE public.car_views ADD COLUMN source TEXT;
    END IF;
END $$;

-- Índices adicionales (la tabla ya tiene algunos)
CREATE INDEX IF NOT EXISTS idx_car_views_viewer ON public.car_views(viewer_id);

-- RLS ya habilitado, agregar políticas si no existen
DROP POLICY IF EXISTS "car_views_insert_any" ON public.car_views;
CREATE POLICY "car_views_insert_any" ON public.car_views
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "car_views_read_own" ON public.car_views;
CREATE POLICY "car_views_read_own" ON public.car_views
    FOR SELECT USING (viewer_id = auth.uid());

-- 2. SEARCH HISTORY - Historial de búsquedas
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_params JSONB NOT NULL,
    results_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_date ON public.search_history(created_at DESC);

-- RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_history_insert_own" ON public.search_history
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "search_history_read_own" ON public.search_history
    FOR SELECT USING (user_id = auth.uid());

-- Limitar historial a últimos 100 por usuario (trigger)
CREATE OR REPLACE FUNCTION limit_search_history()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.search_history
    WHERE user_id = NEW.user_id
    AND id NOT IN (
        SELECT id FROM public.search_history
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        LIMIT 100
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS limit_search_history_trigger ON public.search_history;
CREATE TRIGGER limit_search_history_trigger
    AFTER INSERT ON public.search_history
    FOR EACH ROW EXECUTE FUNCTION limit_search_history();

-- 3. RECOMMENDATION CLICKS - Tracking de clics en recomendaciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recommendation_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL, -- 'similar', 'personalized', 'popular', 'nearby'
    position INTEGER, -- Posición en la lista
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rec_clicks_user ON public.recommendation_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_clicks_type ON public.recommendation_clicks(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_rec_clicks_date ON public.recommendation_clicks(created_at DESC);

-- RLS
ALTER TABLE public.recommendation_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rec_clicks_insert_any" ON public.recommendation_clicks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "rec_clicks_admin_read" ON public.recommendation_clicks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. FUNCIÓN: Obtener autos cercanos (PostGIS simplificado)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_cars_nearby(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km INTEGER DEFAULT 50,
    p_limit INTEGER DEFAULT 10
)
RETURNS SETOF public.cars
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.*
    FROM public.cars c
    WHERE c.status = 'active'
    AND c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
    -- Fórmula Haversine simplificada (aproximación para distancias cortas)
    AND (
        6371 * acos(
            cos(radians(p_lat)) * cos(radians(c.latitude)) *
            cos(radians(c.longitude) - radians(p_lng)) +
            sin(radians(p_lat)) * sin(radians(c.latitude))
        )
    ) <= p_radius_km
    ORDER BY
        (
            6371 * acos(
                cos(radians(p_lat)) * cos(radians(c.latitude)) *
                cos(radians(c.longitude) - radians(p_lng)) +
                sin(radians(p_lat)) * sin(radians(c.latitude))
            )
        ) ASC,
        c.rating DESC
    LIMIT p_limit;
END;
$$;

-- 5. FUNCIÓN: Obtener métricas de recomendaciones (admin)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_recommendation_metrics(
    p_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Verificar admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN jsonb_build_object('error', 'unauthorized');
    END IF;

    SELECT jsonb_build_object(
        'total_views', (
            SELECT COUNT(*) FROM public.car_views
            WHERE viewed_at > NOW() - (p_days || ' days')::interval
        ),
        'unique_users', (
            SELECT COUNT(DISTINCT viewer_id) FROM public.car_views
            WHERE viewed_at > NOW() - (p_days || ' days')::interval
        ),
        'clicks_by_type', (
            SELECT jsonb_object_agg(recommendation_type, cnt)
            FROM (
                SELECT recommendation_type, COUNT(*) as cnt
                FROM public.recommendation_clicks
                WHERE created_at > NOW() - (p_days || ' days')::interval
                GROUP BY recommendation_type
            ) t
        ),
        'top_viewed_cars', (
            SELECT jsonb_agg(
                jsonb_build_object('car_id', car_id, 'views', views)
            )
            FROM (
                SELECT car_id, COUNT(*) as views
                FROM public.car_views
                WHERE viewed_at > NOW() - (p_days || ' days')::interval
                GROUP BY car_id
                ORDER BY views DESC
                LIMIT 10
            ) t
        ),
        'conversion_rate', (
            SELECT ROUND(
                (COUNT(DISTINCT b.renter_id)::numeric /
                 NULLIF(COUNT(DISTINCT v.viewer_id), 0)::numeric) * 100, 2
            )
            FROM public.car_views v
            LEFT JOIN public.bookings b ON b.car_id = v.car_id
            AND b.renter_id = v.viewer_id
            AND b.created_at > v.viewed_at
            WHERE v.viewed_at > NOW() - (p_days || ' days')::interval
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant permisos
GRANT EXECUTE ON FUNCTION public.get_cars_nearby TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_recommendation_metrics TO authenticated;

-- 6. Agregar columna total_bookings a cars si no existe
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cars' AND column_name = 'total_bookings'
    ) THEN
        ALTER TABLE public.cars ADD COLUMN total_bookings INTEGER DEFAULT 0;
    END IF;
END $$;

-- Actualizar contador de bookings
CREATE OR REPLACE FUNCTION update_car_booking_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        UPDATE public.cars SET total_bookings = total_bookings + 1 WHERE id = NEW.car_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_car_booking_count_trigger ON public.bookings;
CREATE TRIGGER update_car_booking_count_trigger
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_car_booking_count();
