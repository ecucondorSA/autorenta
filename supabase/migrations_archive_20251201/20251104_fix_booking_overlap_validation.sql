-- ================================================================
-- FIX: Booking Overlap Validation - Include 'pending' status
-- Date: 2025-11-04
-- Description: Fix race condition where two users could pass availability
--              check but fail on exclusion constraint. The constraint
--              bookings_no_overlap includes 'pending' bookings, but
--              validation functions only checked 'confirmed' and 'in_progress'.
-- ================================================================

BEGIN;

-- ================================================================
-- 1. Update is_car_available() to include 'pending' status
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
  -- ✅ FIX: Incluir 'pending' para coincidir con constraint bookings_no_overlap
  -- El constraint previene overlaps de bookings con status: pending, confirmed, in_progress
  -- Por lo tanto, la validación debe incluir también 'pending'
  SELECT NOT EXISTS (
    SELECT 1
    FROM bookings
    WHERE car_id = p_car_id
      AND status IN ('pending', 'confirmed', 'in_progress')
      AND (start_at, end_at) OVERLAPS (p_start_date, p_end_date)
  );
$$;

COMMENT ON FUNCTION is_car_available IS 
'Verifica si un auto específico está disponible para las fechas dadas.
Retorna TRUE si está disponible, FALSE si no.
✅ FIX 2025-11-04: Ahora incluye bookings con status "pending" para evitar race conditions.';

-- ================================================================
-- 2. Update request_booking() to include 'pending' status
-- ================================================================

-- Primero hacer DROP si existe para permitir cambio de tipo de retorno
DROP FUNCTION IF EXISTS public.request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_total NUMERIC(10, 2);
  v_car public.cars;
  v_days INTEGER;
BEGIN
  -- Validar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar que las fechas son válidas
  IF p_start >= p_end THEN
    RAISE EXCEPTION 'La fecha de fin debe ser posterior a la fecha de inicio';
  END IF;

  IF p_start < now() THEN
    RAISE EXCEPTION 'No podés reservar en el pasado';
  END IF;

  -- Obtener información del auto
  SELECT * INTO v_car
  FROM public.cars
  WHERE id = p_car_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auto no disponible';
  END IF;

  -- Validar que el usuario no es el dueño del auto
  IF v_car.owner_id = auth.uid() THEN
    RAISE EXCEPTION 'No podés reservar tu propio auto';
  END IF;

  -- ✅ FIX: Validar disponibilidad incluyendo 'pending' para coincidir con constraint bookings_no_overlap
  -- El constraint bookings_no_overlap previene overlaps de bookings con status: pending, confirmed, in_progress
  -- Por lo tanto, la validación debe incluir también 'pending' para evitar race conditions
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE car_id = p_car_id
    AND status IN ('pending', 'confirmed', 'in_progress')
    AND (start_at, end_at) OVERLAPS (p_start, p_end)
  ) THEN
    RAISE EXCEPTION 'Auto no disponible en esas fechas';
  END IF;

  -- Calcular días y total
  v_days := EXTRACT(DAY FROM (p_end - p_start));
  IF v_days < 1 THEN
    v_days := 1;
  END IF;

  v_total := v_car.price_per_day * v_days;

  -- Crear booking
  INSERT INTO public.bookings (
    car_id,
    renter_id,
    start_at,
    end_at,
    status,
    total_amount,
    currency
  ) VALUES (
    p_car_id,
    auth.uid(),
    p_start,
    p_end,
    'pending',
    v_total,
    v_car.currency
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

COMMENT ON FUNCTION public.request_booking IS 
'Crea una nueva reserva para un auto.
✅ FIX 2025-11-04: Validación de disponibilidad ahora incluye bookings "pending" para evitar race conditions.';

-- ================================================================
-- 3. Update get_available_cars() to include 'pending' status
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
    COUNT(DISTINCT b.id) as total_bookings,
    COALESCE(AVG(r.rating), 0)::NUMERIC as avg_rating
  FROM cars c
  LEFT JOIN bookings b ON b.car_id = c.id
  LEFT JOIN reviews r ON r.booking_id = b.id
  WHERE 
    -- Solo autos activos
    c.status = 'active'
    -- ✅ FIX: Incluir 'pending' para coincidir con constraint bookings_no_overlap
    -- Sin reservas (pending, confirmed, in_progress) que se solapen con las fechas solicitadas
    AND NOT EXISTS (
      SELECT 1 
      FROM bookings b2
      WHERE b2.car_id = c.id
        AND b2.status IN ('pending', 'confirmed', 'in_progress')
        AND (b2.start_at, b2.end_at) OVERLAPS (p_start_date, p_end_date)
    )
  GROUP BY c.id
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_available_cars IS 
'Retorna autos disponibles para las fechas especificadas.
Valida overlaps con reservas pending, confirmed o en progreso.
✅ FIX 2025-11-04: Ahora incluye bookings "pending" para evitar race conditions.';

COMMIT;

-- ================================================================
-- RESUMEN DEL FIX
-- ================================================================
-- 
-- PROBLEMA:
-- El constraint bookings_no_overlap previene overlaps de bookings con
-- status: pending, confirmed, in_progress. Sin embargo, las funciones
-- de validación (is_car_available, request_booking, get_available_cars)
-- solo verificaban bookings con status 'confirmed' e 'in_progress',
-- excluyendo 'pending'.
--
-- Esto causaba race conditions:
-- 1. Usuario A pasa validación (no hay bookings confirmed/in_progress)
-- 2. Usuario B pasa validación (no hay bookings confirmed/in_progress)
-- 3. Usuario A crea booking 'pending' → ✅ Exitoso
-- 4. Usuario B intenta crear booking 'pending' → ❌ Falla por constraint
--
-- SOLUCIÓN:
-- Actualizar todas las funciones de validación para incluir también
-- 'pending' en las verificaciones de overlap, para que coincidan
-- con el constraint bookings_no_overlap.
--
-- FUNCIONES ACTUALIZADAS:
-- ✅ is_car_available()
-- ✅ request_booking()
-- ✅ get_available_cars()
--
-- RESULTADO:
-- Ahora las validaciones coinciden con el constraint, evitando
-- race conditions y mejorando la experiencia del usuario con
-- mensajes de error más claros.
-- ================================================================

