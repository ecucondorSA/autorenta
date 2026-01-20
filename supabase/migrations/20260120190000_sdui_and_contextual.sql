-- ============================================================================
-- SDUI, GENERATIVE UI & CONTEXTUAL PERSONALIZATION SYSTEM
-- Autorentar - 2026-01-20
-- ============================================================================

-- 1. SDUI LAYOUTS TABLE
-- Almacena layouts de páginas controlados por servidor
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sdui_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    environment TEXT NOT NULL DEFAULT 'production',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(page_id, version, environment)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sdui_layouts_page ON public.sdui_layouts(page_id);
CREATE INDEX IF NOT EXISTS idx_sdui_layouts_active ON public.sdui_layouts(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.sdui_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sdui_layouts_read_public" ON public.sdui_layouts;
CREATE POLICY "sdui_layouts_read_public" ON public.sdui_layouts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "sdui_layouts_admin_write" ON public.sdui_layouts;
CREATE POLICY "sdui_layouts_admin_write" ON public.sdui_layouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_sdui_layouts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sdui_layouts_updated_at ON public.sdui_layouts;
CREATE TRIGGER sdui_layouts_updated_at
    BEFORE UPDATE ON public.sdui_layouts
    FOR EACH ROW EXECUTE FUNCTION update_sdui_layouts_timestamp();

-- 2. SDUI ANALYTICS TABLE
-- Tracking de interacciones con componentes SDUI
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sdui_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'view', 'click', 'interaction'
    user_id UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sdui_analytics_component ON public.sdui_analytics(component_id);
CREATE INDEX IF NOT EXISTS idx_sdui_analytics_type ON public.sdui_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_sdui_analytics_date ON public.sdui_analytics(created_at DESC);

-- RLS
ALTER TABLE public.sdui_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sdui_analytics_insert_any" ON public.sdui_analytics;
CREATE POLICY "sdui_analytics_insert_any" ON public.sdui_analytics
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "sdui_analytics_admin_read" ON public.sdui_analytics;
CREATE POLICY "sdui_analytics_admin_read" ON public.sdui_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. SPECIAL EVENTS TABLE
-- Eventos especiales, feriados y promociones
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.special_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('holiday', 'promo', 'seasonal', 'local')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    theme TEXT, -- Tema visual a aplicar
    discount INTEGER, -- Porcentaje de descuento
    message TEXT, -- Mensaje promocional
    countries TEXT[], -- Países aplicables (NULL = todos)
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_special_events_dates ON public.special_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_special_events_type ON public.special_events(type);
CREATE INDEX IF NOT EXISTS idx_special_events_active ON public.special_events(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.special_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "special_events_read_public" ON public.special_events;
CREATE POLICY "special_events_read_public" ON public.special_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "special_events_admin_write" ON public.special_events;
CREATE POLICY "special_events_admin_write" ON public.special_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. AI GENERATED CONTENT CACHE
-- Cache de contenido generado por AI
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_content_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    content_type TEXT NOT NULL, -- 'car_description', 'cta', 'welcome', etc.
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.80,
    language TEXT DEFAULT 'es',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_content_cache_key ON public.ai_content_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_content_cache_type ON public.ai_content_cache(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_content_cache_expires ON public.ai_content_cache(expires_at);

-- RLS
ALTER TABLE public.ai_content_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_content_cache_read_public" ON public.ai_content_cache;
CREATE POLICY "ai_content_cache_read_public" ON public.ai_content_cache
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "ai_content_cache_service_write" ON public.ai_content_cache;
CREATE POLICY "ai_content_cache_service_write" ON public.ai_content_cache
    FOR ALL USING (true); -- Solo edge functions escriben

-- Limpieza automática de cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM public.ai_content_cache
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. DESIGN TOKENS OVERRIDES
-- Overrides de design tokens por contexto
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.design_token_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type TEXT NOT NULL, -- 'country', 'event', 'user_segment', 'time'
    context_value TEXT NOT NULL, -- 'BR', 'black-friday', 'premium', 'night'
    tokens JSONB NOT NULL, -- Tokens a sobrescribir
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(context_type, context_value)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_design_tokens_context ON public.design_token_overrides(context_type, context_value);
CREATE INDEX IF NOT EXISTS idx_design_tokens_active ON public.design_token_overrides(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.design_token_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_tokens_read_public" ON public.design_token_overrides;
CREATE POLICY "design_tokens_read_public" ON public.design_token_overrides
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "design_tokens_admin_write" ON public.design_token_overrides;
CREATE POLICY "design_tokens_admin_write" ON public.design_token_overrides
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. DATOS INICIALES - SDUI Layouts
-- ============================================================================
INSERT INTO public.sdui_layouts (page_id, name, version, components) VALUES
    ('homepage', 'Default Homepage Layout', 1, '[
        {
            "id": "hero-main",
            "type": "hero_banner",
            "props": {
                "title": "Alquila el auto perfecto",
                "subtitle": "Miles de autos te esperan en tu ciudad",
                "ctaText": "Buscar autos",
                "ctaLink": "/marketplace"
            }
        },
        {
            "id": "search-main",
            "type": "search_bar",
            "props": {
                "placeholder": "¿A dónde vas?",
                "showDatePicker": true
            }
        },
        {
            "id": "carousel-popular",
            "type": "car_carousel",
            "props": {
                "title": "Autos populares",
                "source": "popular",
                "limit": 10
            }
        },
        {
            "id": "categories",
            "type": "category_grid",
            "props": {
                "title": "Explora por categoría",
                "categories": ["sedan", "suv", "hatchback", "pickup", "luxury"]
            }
        },
        {
            "id": "testimonials",
            "type": "testimonials",
            "props": {
                "title": "Lo que dicen nuestros usuarios",
                "limit": 3
            }
        }
    ]'::jsonb)
ON CONFLICT (page_id, version, environment) DO NOTHING;

-- 7. DATOS INICIALES - Eventos especiales
-- ============================================================================
INSERT INTO public.special_events (name, type, start_date, end_date, theme, discount, message, countries) VALUES
    ('Verano 2026', 'seasonal', '2026-12-21', '2027-03-20', 'summer', 15, '¡Verano! 15% OFF en autos para la playa', ARRAY['BR', 'AR']),
    ('Carnaval 2026', 'holiday', '2026-02-13', '2026-02-18', 'carnival', 20, '¡Carnaval! 20% OFF en todos los autos', ARRAY['BR']),
    ('Semana del Auto', 'promo', '2026-03-01', '2026-03-07', NULL, 25, 'Semana del Auto - Hasta 25% OFF', NULL)
ON CONFLICT DO NOTHING;

-- 8. DATOS INICIALES - Design Tokens por país
-- ============================================================================
INSERT INTO public.design_token_overrides (context_type, context_value, tokens, priority) VALUES
    ('country', 'AR', '{"colorPrimary": "#0ea5e9", "colorSecondary": "#f97316"}'::jsonb, 1),
    ('country', 'BR', '{"colorPrimary": "#f97316", "colorSecondary": "#22c55e"}'::jsonb, 1),
    ('event', 'black-friday', '{"colorPrimary": "#000000", "colorSecondary": "#fbbf24", "colorBackground": "#18181b"}'::jsonb, 10),
    ('event', 'christmas', '{"colorPrimary": "#dc2626", "colorSecondary": "#16a34a"}'::jsonb, 10),
    ('time', 'night', '{"colorBackground": "#0f172a", "colorSurface": "#1e293b", "colorText": "#f8fafc"}'::jsonb, 5)
ON CONFLICT (context_type, context_value) DO NOTHING;

-- 9. FUNCIÓN RPC - Obtener layout SDUI
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sdui_layout(p_page_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_layout RECORD;
BEGIN
    SELECT * INTO v_layout
    FROM public.sdui_layouts
    WHERE page_id = p_page_id
    AND is_active = true
    ORDER BY version DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'layout_not_found');
    END IF;

    RETURN jsonb_build_object(
        'id', v_layout.id,
        'pageId', v_layout.page_id,
        'name', v_layout.name,
        'version', v_layout.version,
        'components', v_layout.components,
        'metadata', v_layout.metadata
    );
END;
$$;

-- 10. FUNCIÓN RPC - Obtener eventos activos
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_events(p_country TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', id,
                'name', name,
                'type', type,
                'startDate', start_date,
                'endDate', end_date,
                'theme', theme,
                'discount', discount,
                'message', message
            )
        ), '[]'::jsonb)
        FROM public.special_events
        WHERE is_active = true
        AND start_date <= NOW()
        AND end_date >= NOW()
        AND (
            countries IS NULL
            OR p_country IS NULL
            OR p_country = ANY(countries)
        )
    );
END;
$$;

-- 11. FUNCIÓN RPC - Obtener design tokens por contexto
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_design_tokens(
    p_country TEXT DEFAULT NULL,
    p_event TEXT DEFAULT NULL,
    p_time_of_day TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tokens JSONB := '{}'::jsonb;
    v_override RECORD;
BEGIN
    -- Aplicar overrides en orden de prioridad
    FOR v_override IN
        SELECT tokens FROM public.design_token_overrides
        WHERE is_active = true
        AND (
            (context_type = 'country' AND context_value = p_country)
            OR (context_type = 'event' AND context_value = p_event)
            OR (context_type = 'time' AND context_value = p_time_of_day)
        )
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
        ORDER BY priority ASC
    LOOP
        v_tokens := v_tokens || v_override.tokens;
    END LOOP;

    RETURN v_tokens;
END;
$$;

-- Grant permisos
GRANT EXECUTE ON FUNCTION public.get_sdui_layout TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_active_events TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_design_tokens TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_ai_cache TO authenticated;
