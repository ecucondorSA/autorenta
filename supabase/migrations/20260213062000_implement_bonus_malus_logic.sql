-- ============================================================================
-- AUTORENTA - Implement Bonus-Malus Logic
-- ============================================================================
-- Reemplaza el stub de calculate_user_bonus_malus con lógica real
-- Basado en el comportamiento esperado por BonusMalusService y v_user_stats
-- ============================================================================

-- Asegurar que la tabla existe (por si acaso no fue migrada correctamente)
CREATE TABLE IF NOT EXISTS public.user_bonus_malus (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_factor NUMERIC NOT NULL DEFAULT 0, -- Factor final (-0.15 a +0.20)
    tier TEXT NOT NULL DEFAULT 'standard', -- standard, trusted, elite
    metrics JSONB NOT NULL DEFAULT '{}'::JSONB, -- Snapshot de métricas usadas
    breakdown JSONB NOT NULL DEFAULT '{}'::JSONB, -- Detalle de factores calculados
    next_recalculation_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.user_bonus_malus ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can view own bonus-malus" ON public.user_bonus_malus;
CREATE POLICY "Users can view own bonus-malus" ON public.user_bonus_malus
    FOR SELECT USING (auth.uid() = user_id);

-- RPC: calculate_user_bonus_malus
CREATE OR REPLACE FUNCTION public.calculate_user_bonus_malus(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_completed_rentals INTEGER;
    v_avg_rating NUMERIC;
    v_cancellation_rate NUMERIC;
    v_total_bookings INTEGER;
    
    -- Factores
    v_rating_factor NUMERIC := 0;
    v_exp_factor NUMERIC := 0;
    v_canc_factor NUMERIC := 0;
    v_verif_bonus NUMERIC := 0;
    v_total_factor NUMERIC := 0;
    
    v_tier TEXT := 'standard';
    v_result JSONB;
BEGIN
    -- 1. Determinar usuario
    v_user_id := COALESCE(p_user_id, auth.uid());
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No user provided');
    END IF;

    -- 2. Obtener datos básicos del perfil
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;

    -- 3. Calcular métricas desde bookings
    SELECT 
        COUNT(*) FILTER (WHERE status = 'completed'),
        COALESCE(AVG(rating_avg) FILTER (WHERE rating_avg > 0), 4.0), -- rating_avg debería ser el campo de rating del booking o similar
        COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by_role = 'renter'),
        COUNT(*)
    INTO 
        v_completed_rentals,
        v_avg_rating,
        v_total_bookings, -- para tasa de cancelación
        v_total_bookings
    FROM public.bookings
    WHERE renter_id = v_user_id;

    -- Nota: v_avg_rating es aproximado aquí, lo ideal es usar reviews
    SELECT COALESCE(rating_avg, 4.0) INTO v_avg_rating FROM public.profiles WHERE id = v_user_id;

    -- 4. Cálculo de Factores
    
    -- Rating Factor: Bonus si > 4.5, Malus si < 3.5
    IF v_avg_rating >= 4.8 THEN v_rating_factor := -0.05;
    ELSIF v_avg_rating >= 4.5 THEN v_rating_factor := -0.02;
    ELSIF v_avg_rating < 3.0 THEN v_rating_factor := 0.15;
    ELSIF v_avg_rating < 3.5 THEN v_rating_factor := 0.08;
    END IF;

    -- Experience Factor: Bonus por fidelidad
    IF v_completed_rentals >= 20 THEN v_exp_factor := -0.05;
    ELSIF v_completed_rentals >= 5 THEN v_exp_factor := -0.02;
    END IF;

    -- Cancellation Factor: Malus por cancelar
    v_total_bookings := COALESCE(NULLIF(v_total_bookings, 0), 1);
    v_cancellation_rate := (SELECT COUNT(*) FROM public.bookings WHERE renter_id = v_user_id AND status = 'cancelled')::NUMERIC / v_total_bookings;
    
    IF v_cancellation_rate > 0.2 THEN v_canc_factor := 0.10;
    ELSIF v_cancellation_rate > 0.1 THEN v_canc_factor := 0.05;
    END IF;

    -- Verification Bonus
    IF v_profile.id_verified IS TRUE THEN
        v_verif_bonus := -0.03;
    END IF;

    -- 5. Total y Tier
    v_total_factor := v_rating_factor + v_exp_factor + v_canc_factor + v_verif_bonus;
    
    -- Cap límites
    v_total_factor := LEAST(0.20, GREATEST(-0.15, v_total_factor));

    -- Determinar Tier
    IF v_profile.id_verified IS TRUE AND v_total_factor <= -0.05 THEN
        v_tier := 'elite';
    ELSIF v_profile.id_verified IS TRUE AND v_total_factor <= 0.0 THEN
        v_tier := 'trusted';
    ELSE
        v_tier := 'standard';
    END IF;

    -- 6. Guardar Resultados
    v_result := jsonb_build_object(
        'total_factor', v_total_factor,
        'tier', v_tier,
        'discount_or_surcharge', CASE 
            WHEN v_total_factor < 0 THEN 'BONUS (Descuento)'
            WHEN v_total_factor > 0 THEN 'MALUS (Recargo)'
            ELSE 'NEUTRAL'
        END,
        'metrics', jsonb_build_object(
            'average_rating', v_avg_rating,
            'completed_rentals', v_completed_rentals,
            'cancellation_rate', v_cancellation_rate,
            'is_verified', v_profile.id_verified
        ),
        'breakdown', jsonb_build_object(
            'rating_factor', v_rating_factor,
            'experience_factor', v_exp_factor,
            'cancellation_factor', v_canc_factor,
            'verification_bonus', v_verif_bonus
        ),
        'next_recalculation_at', (NOW() + INTERVAL '7 days')
    );

    INSERT INTO public.user_bonus_malus (
        user_id,
        total_factor,
        tier,
        metrics,
        breakdown,
        next_recalculation_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_total_factor,
        v_tier,
        v_result->'metrics',
        v_result->'breakdown',
        (v_result->>'next_recalculation_at')::TIMESTAMPTZ,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_factor = EXCLUDED.total_factor,
        tier = EXCLUDED.tier,
        metrics = EXCLUDED.metrics,
        breakdown = EXCLUDED.breakdown,
        next_recalculation_at = EXCLUDED.next_recalculation_at,
        updated_at = NOW();

    RETURN v_result;
END;
$$;

-- Obtener factor (helper)
CREATE OR REPLACE FUNCTION public.get_user_bonus_malus(
    p_user_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_factor NUMERIC;
BEGIN
    SELECT total_factor INTO v_factor 
    FROM public.user_bonus_malus 
    WHERE user_id = p_user_id;
    
    IF v_factor IS NULL THEN
        -- Calcular si no existe
        SELECT (public.calculate_user_bonus_malus(p_user_id)->>'total_factor')::NUMERIC INTO v_factor;
    END IF;
    
    RETURN COALESCE(v_factor, 0);
END;
$$;
