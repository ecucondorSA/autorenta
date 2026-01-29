-- Detección de Fraude y Patrones Sospechosos (Colusión)
-- Fecha: 2025-12-11

-- 1. Tabla para registrar eventos de riesgo detectados
CREATE TABLE IF NOT EXISTS public.risk_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    booking_id UUID REFERENCES public.bookings(id),
    renter_id UUID REFERENCES auth.users(id),
    owner_id UUID REFERENCES auth.users(id),
    risk_type TEXT NOT NULL, -- 'collusion', 'device_sharing', 'payment_anomaly'
    risk_score INTEGER DEFAULT 0, -- 0-100
    details JSONB,
    status TEXT DEFAULT 'pending_review' -- 'pending_review', 'cleared', 'confirmed'
);

-- Habilitar RLS
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo admins pueden ver eventos de riesgo
CREATE POLICY "Admins can view risk events" ON public.risk_events
    FOR SELECT
    USING (public.is_admin(auth.uid()));

-- 2. Función para analizar colusión basada en historial
CREATE OR REPLACE FUNCTION public.analyze_collusion_risk(
    p_renter_id UUID,
    p_owner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_previous_bookings_count INTEGER;
    v_risk_score INTEGER := 0;
    v_risk_level TEXT := 'low';
    v_details JSONB;
BEGIN
    -- Contar reservas previas completadas entre estas dos partes en los últimos 180 días
    SELECT COUNT(*)
    INTO v_previous_bookings_count
    FROM public.bookings
    WHERE renter_id = p_renter_id
    AND owner_id = p_owner_id
    AND status = 'completed'
    AND created_at > (NOW() - INTERVAL '180 days');

    -- Lógica de puntuación
    IF v_previous_bookings_count >= 2 THEN
        v_risk_score := 30;
        v_risk_level := 'medium';
    END IF;

    IF v_previous_bookings_count >= 5 THEN
        v_risk_score := 80;
        v_risk_level := 'high';
    END IF;

    v_details := jsonb_build_object(
        'previous_bookings_180d', v_previous_bookings_count,
        'risk_level', v_risk_level
    );

    RETURN jsonb_build_object(
        'score', v_risk_score,
        'details', v_details
    );
END;
$$;

-- 3. Trigger para ejecutar el análisis al crear una reserva
CREATE OR REPLACE FUNCTION public.trigger_check_fraud_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_analysis JSONB;
    v_score INTEGER;
BEGIN
    -- Ejecutar análisis de colusión
    v_analysis := public.analyze_collusion_risk(NEW.renter_id, NEW.owner_id);
    v_score := (v_analysis->>'score')::INTEGER;

    -- Si el riesgo es considerable (> 20), registrar el evento
    IF v_score > 20 THEN
        INSERT INTO public.risk_events (
            booking_id,
            renter_id,
            owner_id,
            risk_type,
            risk_score,
            details
        ) VALUES (
            NEW.id,
            NEW.renter_id,
            NEW.owner_id,
            'collusion',
            v_score,
            v_analysis->'details'
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if exists to avoid duplication errors on re-run
DROP TRIGGER IF EXISTS check_fraud_on_booking_trigger ON public.bookings;

CREATE TRIGGER check_fraud_on_booking_trigger
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_check_fraud_on_booking();

COMMENT ON FUNCTION public.analyze_collusion_risk IS 'Analiza el historial de reservas entre dos usuarios para detectar posible colusión.';
