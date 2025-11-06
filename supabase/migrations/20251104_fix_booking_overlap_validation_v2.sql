-- ================================================================
-- FIX: Booking Overlap Validation - Include 'pending' status
-- Date: 2025-11-04
-- Version: 2 (Compatible with existing request_booking that returns JSON)
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
-- Mantiene el tipo de retorno JSON existente
-- ================================================================

CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_user_id UUID;
  v_car RECORD;
  v_booking_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_total_amount NUMERIC;
  v_deposit_amount NUMERIC := 0;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validate dates
  v_start_date := p_start::DATE;
  v_end_date := p_end::DATE;

  IF v_end_date <= v_start_date THEN
    RAISE EXCEPTION 'La fecha de fin debe ser posterior a la de inicio';
  END IF;

  IF v_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'No se pueden hacer reservas en el pasado';
  END IF;

  -- Get car details
  SELECT id, owner_id, price_per_day, status, deposit_required, deposit_amount
  INTO v_car
  FROM public.cars
  WHERE id = p_car_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auto no encontrado';
  END IF;

  IF v_car.status != 'active' THEN
    RAISE EXCEPTION 'Auto no disponible para alquilar';
  END IF;

  -- Validate user is not owner
  IF v_car.owner_id = v_user_id THEN
    RAISE EXCEPTION 'No puedes reservar tu propio auto';
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

  -- Calculate total amount INCLUDING deposit
  v_total_amount := (v_end_date - v_start_date) * v_car.price_per_day;

  -- Add deposit if required
  IF v_car.deposit_required AND v_car.deposit_amount IS NOT NULL THEN
    v_deposit_amount := v_car.deposit_amount;
    v_total_amount := v_total_amount + v_deposit_amount;
  END IF;

  -- Create booking with pending status
  INSERT INTO public.bookings (
    car_id,
    renter_id,
    start_at,
    end_at,
    status,
    total_amount,
    currency,
    expires_at
  ) VALUES (
    p_car_id,
    v_user_id,
    p_start,
    p_end,
    'pending',
    v_total_amount,
    'USD', -- TODO: Get from car currency
    NOW() + INTERVAL '30 minutes'
  )
  RETURNING id INTO v_booking_id;

  -- Return booking details
  RETURN json_build_object(
    'booking_id', v_booking_id,
    'status', 'pending',
    'total_amount', v_total_amount,
    'deposit_amount', v_deposit_amount,
    'created_at', NOW()
  );
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
-- ✅ is_car_available() - Ahora incluye 'pending'
-- ✅ request_booking() - Ahora incluye 'pending' (mantiene retorno JSON)
-- ✅ get_available_cars() - Ahora incluye 'pending'
--
-- RESULTADO:
-- Ahora las validaciones coinciden con el constraint, evitando
-- race conditions y mejorando la experiencia del usuario con
-- mensajes de error más claros.
-- ================================================================



