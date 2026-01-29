-- ============================================================================
-- REMOTE CONFIG & FEATURE FLAGS SYSTEM (CORREGIDO)
-- Autorentar - 2026-01-20
-- ============================================================================

-- 1. REMOTE CONFIG TABLE
-- Configuración dinámica de la app sin necesidad de deploy
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    environment TEXT NOT NULL DEFAULT 'production',
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(key, environment)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_app_config_env ON public.app_config(environment);
CREATE INDEX IF NOT EXISTS idx_app_config_category ON public.app_config(category);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON public.app_config(key);

-- RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Lectura pública (las configs son públicas)
DROP POLICY IF EXISTS "app_config_read_public" ON public.app_config;
CREATE POLICY "app_config_read_public" ON public.app_config
    FOR SELECT USING (true);

-- Solo admins pueden modificar
DROP POLICY IF EXISTS "app_config_admin_write" ON public.app_config;
CREATE POLICY "app_config_admin_write" ON public.app_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_app_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_config_updated_at ON public.app_config;
CREATE TRIGGER app_config_updated_at
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW EXECUTE FUNCTION update_app_config_timestamp();

-- 2. AGREGAR COLUMNA KEY A FEATURE_FLAGS SI NO EXISTE
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feature_flags' AND column_name = 'key'
    ) THEN
        ALTER TABLE public.feature_flags ADD COLUMN key TEXT;
        -- Generar key basado en name para registros existentes
        UPDATE public.feature_flags SET key = LOWER(REPLACE(name, ' ', '_')) WHERE key IS NULL;
        -- Hacer unique
        ALTER TABLE public.feature_flags ADD CONSTRAINT feature_flags_key_unique UNIQUE (key);
    END IF;
END $$;

-- Agregar otras columnas si no existen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feature_flags' AND column_name = 'targeting_rules'
    ) THEN
        ALTER TABLE public.feature_flags ADD COLUMN targeting_rules JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feature_flags' AND column_name = 'variants'
    ) THEN
        ALTER TABLE public.feature_flags ADD COLUMN variants JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feature_flags' AND column_name = 'environment'
    ) THEN
        ALTER TABLE public.feature_flags ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feature_flags' AND column_name = 'category'
    ) THEN
        ALTER TABLE public.feature_flags ADD COLUMN category TEXT DEFAULT 'feature';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feature_flags' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.feature_flags ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Índices para feature_flags
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON public.feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(enabled);

-- 3. FEATURE FLAG OVERRIDES (por usuario)
-- La tabla ya existe con feature_flag_id, agregamos columnas faltantes
-- ============================================================================
DO $$
BEGIN
    -- Agregar columna variant si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feature_flag_overrides' AND column_name = 'variant'
    ) THEN
        ALTER TABLE public.feature_flag_overrides ADD COLUMN variant TEXT;
    END IF;

    -- Agregar columna expires_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'feature_flag_overrides' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.feature_flag_overrides ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Índices (usando feature_flag_id que es el nombre real de la columna)
CREATE INDEX IF NOT EXISTS idx_flag_overrides_user ON public.feature_flag_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_flag_overrides_flag ON public.feature_flag_overrides(feature_flag_id);

-- RLS
ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flag_overrides_read_own" ON public.feature_flag_overrides;
CREATE POLICY "flag_overrides_read_own" ON public.feature_flag_overrides
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "flag_overrides_admin_all" ON public.feature_flag_overrides;
CREATE POLICY "flag_overrides_admin_all" ON public.feature_flag_overrides
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. FEATURE FLAG ANALYTICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feature_flag_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id UUID REFERENCES public.feature_flags(id) ON DELETE SET NULL,
    flag_name TEXT,
    user_id UUID REFERENCES auth.users(id),
    anonymous_id TEXT,
    enabled BOOLEAN NOT NULL,
    variant TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para analytics
CREATE INDEX IF NOT EXISTS idx_flag_events_flag ON public.feature_flag_events(flag_id);
CREATE INDEX IF NOT EXISTS idx_flag_events_created ON public.feature_flag_events(created_at);
CREATE INDEX IF NOT EXISTS idx_flag_events_user ON public.feature_flag_events(user_id);

-- RLS
ALTER TABLE public.feature_flag_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flag_events_insert_any" ON public.feature_flag_events;
CREATE POLICY "flag_events_insert_any" ON public.feature_flag_events
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "flag_events_admin_read" ON public.feature_flag_events;
CREATE POLICY "flag_events_admin_read" ON public.feature_flag_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. DATOS INICIALES - Remote Config
-- ============================================================================
INSERT INTO public.app_config (key, value, description, category, environment) VALUES
    -- Configuración de negocio
    ('OWNER_COMMISSION_RATE', '0.15', 'Comisión del propietario (15%)', 'business', 'production'),
    ('PLATFORM_FEE_RATE', '0.10', 'Fee de la plataforma (10%)', 'business', 'production'),
    ('MIN_BOOKING_HOURS', '24', 'Mínimo de horas para reserva', 'booking', 'production'),
    ('MAX_BOOKING_DAYS', '30', 'Máximo de días para reserva', 'booking', 'production'),
    ('DEPOSIT_PERCENTAGE', '0.20', 'Porcentaje de depósito (20%)', 'booking', 'production'),

    -- Configuración de UI
    ('HERO_TITLE', '"Alquila el auto perfecto"', 'Título del hero en homepage', 'ui', 'production'),
    ('HERO_SUBTITLE', '"Miles de autos te esperan"', 'Subtítulo del hero', 'ui', 'production'),
    ('SHOW_PROMO_BANNER', 'true', 'Mostrar banner promocional', 'ui', 'production'),
    ('PROMO_BANNER_TEXT', '"¡20% OFF en tu primera reserva!"', 'Texto del banner promo', 'ui', 'production'),

    -- Configuración de pagos
    ('MERCADOPAGO_ENABLED', 'true', 'Habilitar MercadoPago', 'payments', 'production'),
    ('PAYPAL_ENABLED', 'false', 'Habilitar PayPal', 'payments', 'production'),
    ('WALLET_ENABLED', 'true', 'Habilitar billetera virtual', 'payments', 'production'),

    -- Configuración por país
    ('DEFAULT_CURRENCY_AR', '"ARS"', 'Moneda por defecto Argentina', 'geo', 'production'),
    ('DEFAULT_CURRENCY_BR', '"BRL"', 'Moneda por defecto Brasil', 'geo', 'production'),
    ('SUPPORTED_COUNTRIES', '["AR", "BR"]', 'Países soportados', 'geo', 'production'),

    -- Límites
    ('MAX_CARS_PER_OWNER', '10', 'Máximo de autos por propietario', 'limits', 'production'),
    ('MAX_PHOTOS_PER_CAR', '15', 'Máximo de fotos por auto', 'limits', 'production'),
    ('SEARCH_RADIUS_KM', '50', 'Radio de búsqueda por defecto (km)', 'search', 'production')
ON CONFLICT (key, environment) DO NOTHING;

-- 6. FUNCIÓN RPC PARA OBTENER CONFIG COMPLETA
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_app_config(p_environment TEXT DEFAULT 'production')
RETURNS TABLE (key TEXT, value JSONB, category TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT ac.key, ac.value, ac.category
    FROM public.app_config ac
    WHERE ac.environment = p_environment;
END;
$$;

-- 7. FUNCIÓN RPC PARA EVALUAR FEATURE FLAG
-- ============================================================================
CREATE OR REPLACE FUNCTION public.evaluate_feature_flag(
    p_flag_name TEXT,
    p_user_id UUID DEFAULT NULL,
    p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_flag RECORD;
    v_override RECORD;
    v_enabled BOOLEAN;
    v_variant TEXT;
    v_hash INTEGER;
BEGIN
    -- Obtener el flag
    SELECT * INTO v_flag FROM public.feature_flags WHERE name = p_flag_name;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('enabled', false, 'reason', 'flag_not_found');
    END IF;

    -- Verificar expiración
    IF v_flag.expires_at IS NOT NULL AND v_flag.expires_at < NOW() THEN
        RETURN jsonb_build_object('enabled', false, 'reason', 'flag_expired');
    END IF;

    -- Verificar override por usuario
    IF p_user_id IS NOT NULL THEN
        SELECT * INTO v_override
        FROM public.feature_flag_overrides
        WHERE feature_flag_id = v_flag.id
        AND user_id = p_user_id
        AND (expires_at IS NULL OR expires_at > NOW());

        IF FOUND THEN
            RETURN jsonb_build_object(
                'enabled', v_override.enabled,
                'variant', v_override.variant,
                'reason', 'user_override'
            );
        END IF;
    END IF;

    -- Si el flag está deshabilitado globalmente
    IF NOT v_flag.enabled THEN
        RETURN jsonb_build_object('enabled', false, 'reason', 'flag_disabled');
    END IF;

    -- Evaluar rollout percentage
    IF v_flag.rollout_percentage < 100 THEN
        IF p_user_id IS NOT NULL THEN
            v_hash := abs(hashtext(p_user_id::text || v_flag.name)) % 100;
        ELSE
            v_hash := floor(random() * 100)::integer;
        END IF;

        v_enabled := v_hash < v_flag.rollout_percentage;
    ELSE
        v_enabled := true;
    END IF;

    -- Seleccionar variante si hay A/B test
    IF v_enabled AND v_flag.variants IS NOT NULL AND jsonb_array_length(v_flag.variants) > 0 THEN
        v_variant := v_flag.variants->(abs(hashtext(COALESCE(p_user_id::text, 'anon') || v_flag.name)) % jsonb_array_length(v_flag.variants))->>'name';
    END IF;

    -- Registrar evento
    INSERT INTO public.feature_flag_events (flag_id, flag_name, user_id, enabled, variant, context)
    VALUES (v_flag.id, v_flag.name, p_user_id, v_enabled, v_variant, p_context);

    RETURN jsonb_build_object(
        'enabled', v_enabled,
        'variant', v_variant,
        'rollout_percentage', v_flag.rollout_percentage,
        'reason', CASE WHEN v_enabled THEN 'rollout_match' ELSE 'rollout_miss' END
    );
END;
$$;

-- 8. FUNCIÓN RPC PARA OBTENER TODOS LOS FLAGS DE UN USUARIO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_feature_flags(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_flags JSONB := '{}'::jsonb;
    v_flag RECORD;
    v_result JSONB;
BEGIN
    FOR v_flag IN SELECT name FROM public.feature_flags LOOP
        v_result := public.evaluate_feature_flag(v_flag.name, p_user_id);
        v_flags := v_flags || jsonb_build_object(v_flag.name, v_result->'enabled');
    END LOOP;

    RETURN v_flags;
END;
$$;

-- Grant permisos
GRANT EXECUTE ON FUNCTION public.get_app_config TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_feature_flag TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_feature_flags TO authenticated, anon;
