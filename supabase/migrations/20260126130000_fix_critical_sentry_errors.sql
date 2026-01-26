-- Fix: Detección de fraude fallaba por acceso incorrecto a owner_id en triggers
-- y falta de políticas RLS en owner_usage_limits
-- Fecha: 2026-01-26

-- 1. FIX: Corregir función de detección de fraude (P0 - Trigger Error)
-- El error era que buscaba NEW.owner_id en bookings, pero esa columna no existe.
-- Se debe buscar el owner_id a través de la relación con cars.

CREATE OR REPLACE FUNCTION public.trigger_check_fraud_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_analysis JSONB;
    v_score INTEGER;
    v_owner_id UUID;
BEGIN
    -- Obtener owner_id desde la tabla cars
    SELECT owner_id INTO v_owner_id
    FROM public.cars
    WHERE id = NEW.car_id;

    -- Si no se encuentra el auto (raro pero posible), salir sin error
    IF v_owner_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Ejecutar análisis de colusión
    v_analysis := public.analyze_collusion_risk(NEW.renter_id, v_owner_id);
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
            v_owner_id,
            'collusion',
            v_score,
            v_analysis->'details'
        );
    END IF;

    RETURN NEW;
END;
$$;

-- 2. FIX: Agregar RLS faltante para owner_usage_limits (P0 - RLS Error)
-- Este error impedía la creación de reservas si el sistema intentaba registrar límites
-- y no existía una política explícita para INSERT.

DO $$
BEGIN
    -- Solo crear la política si no existe para evitar errores en re-runs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'owner_usage_limits' 
        AND policyname = 'Allow system insert on booking'
    ) THEN
        CREATE POLICY "Allow system insert on booking"
        ON public.owner_usage_limits
        FOR INSERT
        WITH CHECK (true); -- Permitimos insert genérico (necesario para triggers/funciones)
    END IF;
END
$$;

-- 3. Notificar corrección
DO $$
BEGIN
  RAISE NOTICE 'Fix aplicado: trigger_check_fraud_on_booking corregido y RLS agregado a owner_usage_limits';
END $$;
