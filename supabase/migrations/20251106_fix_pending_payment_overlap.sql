-- Fix: Incluir estado 'pending_payment' en validaciones de disponibilidad
-- Fecha: 2025-11-06
-- Problema: Las funciones SQL no consideraban 'pending_payment', causando falsos positivos
-- Solución: Actualizar todas las funciones de validación para incluir este estado

-- ============================================================================
-- 1. Actualizar función is_car_available()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_car_available(
  p_car_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  -- ✅ FIX: Incluir 'pending_payment' en estados que bloquean disponibilidad
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE car_id = p_car_id
      AND status IN ('pending', 'pending_payment', 'confirmed', 'in_progress')
      AND (start_at, end_at) OVERLAPS (p_start_date, p_end_date)
  );
$$;

COMMENT ON FUNCTION public.is_car_available IS
'Verifica si un auto está disponible para un rango de fechas.
Considera bookings en estados: pending, pending_payment, confirmed, in_progress.
Retorna TRUE si está disponible, FALSE si hay conflicto.';

-- ============================================================================
-- 2. Actualizar función request_booking()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_total_price NUMERIC DEFAULT NULL,
  p_driver_age INTEGER DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'wallet'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_car_owner UUID;
  v_booking_id UUID;
  v_daily_price NUMERIC;
  v_calculated_total NUMERIC;
  v_duration_days INTEGER;
  v_user_balance NUMERIC;
  v_user_role TEXT;
  v_car_status TEXT;
  v_result JSON;
BEGIN
  -- Obtener user_id del token JWT
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Validar que las fechas sean futuras
  IF p_start <= NOW() THEN
    RAISE EXCEPTION 'La fecha de inicio debe ser futura';
  END IF;

  IF p_end <= p_start THEN
    RAISE EXCEPTION 'La fecha de fin debe ser posterior a la fecha de inicio';
  END IF;

  -- Obtener información del auto
  SELECT owner_id, daily_price, status
  INTO v_car_owner, v_daily_price, v_car_status
  FROM public.cars
  WHERE id = p_car_id;

  IF v_car_owner IS NULL THEN
    RAISE EXCEPTION 'Auto no encontrado';
  END IF;

  IF v_car_status != 'active' THEN
    RAISE EXCEPTION 'El auto no está disponible para renta';
  END IF;

  -- Validar que el usuario no intente rentar su propio auto
  IF v_user_id = v_car_owner THEN
    RAISE EXCEPTION 'No puedes rentar tu propio auto';
  END IF;

  -- ✅ FIX: Validar disponibilidad incluyendo 'pending_payment'
  IF EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE car_id = p_car_id
      AND status IN ('pending', 'pending_payment', 'confirmed', 'in_progress')
      AND (start_at, end_at) OVERLAPS (p_start, p_end)
  ) THEN
    RAISE EXCEPTION 'Auto no disponible en esas fechas';
  END IF;

  -- Calcular duración en días
  v_duration_days := EXTRACT(EPOCH FROM (p_end - p_start)) / 86400;

  IF v_duration_days < 1 THEN
    v_duration_days := 1;
  END IF;

  -- Calcular precio total si no se proporcionó
  IF p_total_price IS NULL THEN
    v_calculated_total := v_daily_price * v_duration_days;
  ELSE
    v_calculated_total := p_total_price;
  END IF;

  -- Validar balance del usuario si el método de pago es wallet
  IF p_payment_method = 'wallet' THEN
    SELECT balance INTO v_user_balance
    FROM public.wallets
    WHERE user_id = v_user_id;

    IF v_user_balance IS NULL OR v_user_balance < v_calculated_total THEN
      RAISE EXCEPTION 'Balance insuficiente en wallet';
    END IF;
  END IF;

  -- Crear el booking con status 'pending' o 'pending_payment'
  INSERT INTO public.bookings (
    car_id,
    renter_id,
    start_at,
    end_at,
    total_price,
    status,
    driver_age,
    payment_method,
    created_at,
    updated_at
  )
  VALUES (
    p_car_id,
    v_user_id,
    p_start,
    p_end,
    v_calculated_total,
    CASE
      WHEN p_payment_method = 'wallet' THEN 'pending'
      ELSE 'pending_payment'
    END,
    p_driver_age,
    p_payment_method,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_booking_id;

  -- Retornar resultado como JSON
  SELECT json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'total_price', v_calculated_total,
    'status', CASE
      WHEN p_payment_method = 'wallet' THEN 'pending'
      ELSE 'pending_payment'
    END
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.request_booking IS
'Crea un booking después de validar disponibilidad, balance y permisos.
Ahora incluye validación de estado pending_payment en la verificación de overlap.';

-- ============================================================================
-- 3. Actualizar constraint bookings_no_overlap (si existe)
-- ============================================================================
-- Primero eliminar el constraint existente si hay uno
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- Crear exclusion constraint actualizado
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  car_id WITH =,
  tstzrange(start_at, end_at) WITH &&
)
WHERE (status IN ('pending', 'pending_payment', 'confirmed', 'in_progress'));

COMMENT ON CONSTRAINT bookings_no_overlap ON public.bookings IS
'Previene overlaps de bookings para el mismo auto.
Estados considerados: pending, pending_payment, confirmed, in_progress.';

-- ============================================================================
-- 4. Crear/actualizar función get_available_cars (si existe)
-- ============================================================================
-- Esta función puede no existir, pero si existe, actualizarla
DROP FUNCTION IF EXISTS public.get_available_cars(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_available_cars(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  car_id UUID,
  make TEXT,
  model TEXT,
  year INTEGER,
  daily_price NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    c.id AS car_id,
    c.make,
    c.model,
    c.year,
    c.daily_price
  FROM public.cars c
  WHERE c.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.car_id = c.id
        AND b.status IN ('pending', 'pending_payment', 'confirmed', 'in_progress')
        AND (b.start_at, b.end_at) OVERLAPS (p_start_date, p_end_date)
    );
$$;

COMMENT ON FUNCTION public.get_available_cars IS
'Retorna lista de autos disponibles para un rango de fechas.
Excluye autos con bookings en estados: pending, pending_payment, confirmed, in_progress.';

-- ============================================================================
-- 5. Crear índice para optimizar queries de overlap
-- ============================================================================
-- Índice para mejorar performance de queries de overlap por car_id y fechas
CREATE INDEX IF NOT EXISTS idx_bookings_car_overlap
ON public.bookings (car_id, status, start_at, end_at)
WHERE status IN ('pending', 'pending_payment', 'confirmed', 'in_progress');

COMMENT ON INDEX idx_bookings_car_overlap IS
'Optimiza queries de validación de overlap de bookings.
Incluye estados que bloquean disponibilidad.';

-- ============================================================================
-- 6. Verificación post-migración
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '📋 Funciones actualizadas: is_car_available, request_booking, get_available_cars';
  RAISE NOTICE '🔒 Constraint actualizado: bookings_no_overlap';
  RAISE NOTICE '⚡ Índice creado: idx_bookings_car_overlap';
  RAISE NOTICE '📝 Estado pending_payment ahora bloquea disponibilidad correctamente';
END $$;
