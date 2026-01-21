-- ============================================================================
-- INSTANT BOOKING SYSTEM
-- Autorentar - 2026-01-20
-- ============================================================================

-- 1. AGREGAR CAMPOS A CARS
-- ============================================================================
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS instant_booking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS instant_booking_min_score INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS instant_booking_require_verified BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.cars.instant_booking_enabled IS 'Si el owner permite reservas instantáneas';
COMMENT ON COLUMN public.cars.instant_booking_min_score IS 'Puntaje mínimo de riesgo requerido (0-100)';
COMMENT ON COLUMN public.cars.instant_booking_require_verified IS 'Si requiere que el renter esté verificado';

-- Índice para búsqueda de autos con instant booking
CREATE INDEX IF NOT EXISTS idx_cars_instant_booking ON public.cars(instant_booking_enabled)
WHERE instant_booking_enabled = true;

-- 2. AGREGAR CAMPOS DE RISK SCORE A PROFILES
-- ============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS risk_score_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_rentals_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_rentals_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS disputes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;

COMMENT ON COLUMN public.profiles.risk_score IS 'Puntaje de riesgo del renter (0-100, mayor = mejor)';
COMMENT ON COLUMN public.profiles.completed_rentals_count IS 'Cantidad de alquileres completados';
COMMENT ON COLUMN public.profiles.cancelled_rentals_count IS 'Cantidad de alquileres cancelados por el renter';
COMMENT ON COLUMN public.profiles.disputes_count IS 'Cantidad de disputas como renter';

-- 3. TABLA DE HISTORIAL DE RISK SCORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.risk_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    old_score INTEGER,
    new_score INTEGER NOT NULL,
    reason TEXT NOT NULL,
    factors JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_score_history_user ON public.risk_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_score_history_date ON public.risk_score_history(created_at DESC);

-- RLS
ALTER TABLE public.risk_score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own risk history" ON public.risk_score_history;
CREATE POLICY "Users can view own risk history" ON public.risk_score_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert risk history" ON public.risk_score_history;
CREATE POLICY "System can insert risk history" ON public.risk_score_history
    FOR INSERT WITH CHECK (true);

-- 4. FUNCIÓN: CALCULAR RISK SCORE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_renter_risk_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_score INTEGER := 50; -- Base score
    v_verification_score INTEGER := 0;
    v_history_score INTEGER := 0;
    v_rating_score INTEGER := 0;
    v_factors JSONB;
BEGIN
    -- Obtener perfil
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- 1. VERIFICACIÓN (máx +30 puntos)
    IF v_profile.email_verified = true THEN
        v_verification_score := v_verification_score + 5;
    END IF;

    IF v_profile.phone_verified = true THEN
        v_verification_score := v_verification_score + 5;
    END IF;

    IF v_profile.identity_verified = true THEN
        v_verification_score := v_verification_score + 10;
    END IF;

    IF v_profile.license_verified = true THEN
        v_verification_score := v_verification_score + 10;
    END IF;

    -- 2. HISTORIAL (máx +30 puntos, mín -30)
    -- Rentals completados: +2 por cada uno (máx +20)
    v_history_score := LEAST(v_profile.completed_rentals_count * 2, 20);

    -- Cancelaciones: -5 por cada una (máx -15)
    v_history_score := v_history_score - LEAST(v_profile.cancelled_rentals_count * 5, 15);

    -- Disputas: -10 por cada una (máx -15)
    v_history_score := v_history_score - LEAST(v_profile.disputes_count * 10, 15);

    -- Bonus por antigüedad
    IF v_profile.created_at < NOW() - INTERVAL '6 months' THEN
        v_history_score := v_history_score + 5;
    END IF;
    IF v_profile.created_at < NOW() - INTERVAL '1 year' THEN
        v_history_score := v_history_score + 5;
    END IF;

    -- 3. RATING (máx +20 puntos)
    IF v_profile.average_rating >= 4.8 THEN
        v_rating_score := 20;
    ELSIF v_profile.average_rating >= 4.5 THEN
        v_rating_score := 15;
    ELSIF v_profile.average_rating >= 4.0 THEN
        v_rating_score := 10;
    ELSIF v_profile.average_rating >= 3.5 THEN
        v_rating_score := 5;
    ELSIF v_profile.average_rating > 0 AND v_profile.average_rating < 3.0 THEN
        v_rating_score := -10;
    END IF;

    -- Calcular score final (0-100)
    v_score := v_score + v_verification_score + v_history_score + v_rating_score;
    v_score := GREATEST(0, LEAST(100, v_score));

    -- Guardar factores para debug
    v_factors := jsonb_build_object(
        'base', 50,
        'verification', v_verification_score,
        'history', v_history_score,
        'rating', v_rating_score,
        'email_verified', v_profile.email_verified,
        'phone_verified', v_profile.phone_verified,
        'identity_verified', v_profile.identity_verified,
        'license_verified', v_profile.license_verified,
        'completed_rentals', v_profile.completed_rentals_count,
        'cancelled_rentals', v_profile.cancelled_rentals_count,
        'disputes', v_profile.disputes_count,
        'average_rating', v_profile.average_rating
    );

    -- Actualizar score en profile si cambió
    IF v_profile.risk_score IS DISTINCT FROM v_score THEN
        -- Guardar historial
        INSERT INTO public.risk_score_history (user_id, old_score, new_score, reason, factors)
        VALUES (p_user_id, v_profile.risk_score, v_score, 'recalculation', v_factors);

        -- Actualizar profile
        UPDATE public.profiles
        SET risk_score = v_score, risk_score_updated_at = NOW()
        WHERE id = p_user_id;
    END IF;

    RETURN v_score;
END;
$$;

-- 5. FUNCIÓN: VERIFICAR SI PUEDE HACER INSTANT BOOKING
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_instant_book(
    p_car_id UUID,
    p_renter_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_car RECORD;
    v_renter RECORD;
    v_score INTEGER;
BEGIN
    -- Obtener datos del auto
    SELECT * INTO v_car FROM public.cars WHERE id = p_car_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'car_not_found');
    END IF;

    -- Verificar si instant booking está habilitado
    IF NOT v_car.instant_booking_enabled THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'instant_booking_disabled');
    END IF;

    -- No puede reservar su propio auto
    IF v_car.owner_id = p_renter_id THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'cannot_book_own_car');
    END IF;

    -- Obtener datos del renter
    SELECT * INTO v_renter FROM public.profiles WHERE id = p_renter_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'renter_not_found');
    END IF;

    -- Verificar si requiere verificación completa
    IF v_car.instant_booking_require_verified THEN
        IF NOT COALESCE(v_renter.identity_verified, false) THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'identity_not_verified',
                'message', 'Debes verificar tu identidad para reservar instantáneamente'
            );
        END IF;
        IF NOT COALESCE(v_renter.license_verified, false) THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'license_not_verified',
                'message', 'Debes verificar tu licencia de conducir para reservar instantáneamente'
            );
        END IF;
    END IF;

    -- Calcular/obtener risk score actualizado
    v_score := calculate_renter_risk_score(p_renter_id);

    -- Verificar score mínimo
    IF v_score < v_car.instant_booking_min_score THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'insufficient_score',
            'current_score', v_score,
            'required_score', v_car.instant_booking_min_score,
            'message', 'Tu puntaje de confianza no alcanza el mínimo requerido'
        );
    END IF;

    -- Puede hacer instant booking
    RETURN jsonb_build_object(
        'allowed', true,
        'score', v_score,
        'message', 'Puedes reservar instantáneamente'
    );
END;
$$;

-- 6. FUNCIÓN: PROCESAR INSTANT BOOKING
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_instant_booking(
    p_car_id UUID,
    p_renter_id UUID,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_pickup_location_id UUID DEFAULT NULL,
    p_dropoff_location_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_can_book JSONB;
    v_car RECORD;
    v_booking_id UUID;
    v_total_days INTEGER;
    v_total_price DECIMAL;
BEGIN
    -- Verificar si puede hacer instant booking
    v_can_book := can_instant_book(p_car_id, p_renter_id);

    IF NOT (v_can_book->>'allowed')::boolean THEN
        RETURN v_can_book;
    END IF;

    -- Obtener datos del auto
    SELECT * INTO v_car FROM public.cars WHERE id = p_car_id;

    -- Calcular días y precio
    v_total_days := GREATEST(1, EXTRACT(DAY FROM p_end_at - p_start_at)::INTEGER);
    v_total_price := v_car.price_per_day * v_total_days;

    -- Verificar disponibilidad
    IF EXISTS (
        SELECT 1 FROM public.bookings
        WHERE car_id = p_car_id
        AND status NOT IN ('cancelled', 'rejected', 'completed')
        AND (
            (start_at, end_at) OVERLAPS (p_start_at, p_end_at)
        )
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'car_not_available',
            'message', 'El vehículo no está disponible en las fechas seleccionadas'
        );
    END IF;

    -- Crear booking directamente confirmado (sin pending_owner_approval)
    INSERT INTO public.bookings (
        car_id,
        renter_id,
        owner_id,
        start_at,
        end_at,
        status,
        total_days,
        daily_rate,
        subtotal,
        service_fee,
        owner_fee,
        insurance_fee,
        total_price,
        is_instant_booking,
        pickup_location_id,
        dropoff_location_id,
        created_at
    ) VALUES (
        p_car_id,
        p_renter_id,
        v_car.owner_id,
        p_start_at,
        p_end_at,
        'pending_payment', -- Va directo a pago, sin aprobación
        v_total_days,
        v_car.price_per_day,
        v_total_price,
        v_total_price * 0.10, -- 10% service fee
        v_total_price * 0.15, -- 15% owner fee
        v_total_price * 0.05, -- 5% insurance
        v_total_price * 1.15, -- Total con fees
        true, -- Marcado como instant booking
        p_pickup_location_id,
        p_dropoff_location_id,
        NOW()
    )
    RETURNING id INTO v_booking_id;

    -- Retornar éxito
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'status', 'pending_payment',
        'is_instant', true,
        'message', 'Reserva instantánea creada. Procede al pago.'
    );
END;
$$;

-- 7. FUNCIÓN: ACTUALIZAR ESTADÍSTICAS DE RENTER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_renter_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Actualizar stats cuando un booking cambia de estado
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN

        -- Booking completado
        IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
            UPDATE public.profiles
            SET completed_rentals_count = completed_rentals_count + 1
            WHERE id = NEW.renter_id;

            -- Recalcular risk score
            PERFORM calculate_renter_risk_score(NEW.renter_id);
        END IF;

        -- Booking cancelado por renter
        IF NEW.status = 'cancelled' AND NEW.cancelled_by = NEW.renter_id THEN
            UPDATE public.profiles
            SET cancelled_rentals_count = cancelled_rentals_count + 1
            WHERE id = NEW.renter_id;

            -- Recalcular risk score
            PERFORM calculate_renter_risk_score(NEW.renter_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger para actualizar stats
DROP TRIGGER IF EXISTS booking_stats_update ON public.bookings;
CREATE TRIGGER booking_stats_update
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_renter_stats();

-- 8. FUNCIÓN: ACTUALIZAR RATING PROMEDIO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_renter_average_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
BEGIN
    -- Calcular rating promedio del renter (is_renter_review=false significa review del owner al renter)
    SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating
    FROM public.reviews
    WHERE reviewee_id = NEW.reviewee_id
    AND is_renter_review = false;

    -- Actualizar profile
    UPDATE public.profiles
    SET average_rating = v_avg_rating
    WHERE id = NEW.reviewee_id;

    -- Recalcular risk score
    PERFORM calculate_renter_risk_score(NEW.reviewee_id);

    RETURN NEW;
END;
$$;

-- Trigger para actualizar rating
DROP TRIGGER IF EXISTS review_rating_update ON public.reviews;
CREATE TRIGGER review_rating_update
    AFTER INSERT OR UPDATE ON public.reviews
    FOR EACH ROW
    WHEN (NEW.is_renter_review = false)
    EXECUTE FUNCTION update_renter_average_rating();

-- 9. AGREGAR CAMPO is_instant_booking A BOOKINGS SI NO EXISTE
-- ============================================================================
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_instant_booking BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bookings_instant ON public.bookings(is_instant_booking)
WHERE is_instant_booking = true;

-- 10. GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.calculate_renter_risk_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_instant_book TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_instant_booking TO authenticated;

-- 11. VISTA: AUTOS CON INSTANT BOOKING
-- ============================================================================
CREATE OR REPLACE VIEW public.v_instant_booking_cars AS
SELECT
    c.id,
    c.title,
    c.brand,
    c.model,
    c.year,
    c.price_per_day,
    c.city,
    c.province,
    c.instant_booking_enabled,
    c.instant_booking_min_score,
    c.instant_booking_require_verified,
    p.full_name as owner_name,
    p.avatar_url as owner_avatar
FROM public.cars c
JOIN public.profiles p ON p.id = c.owner_id
WHERE c.instant_booking_enabled = true
AND c.status = 'active';

GRANT SELECT ON public.v_instant_booking_cars TO authenticated, anon;
