-- ================================================================
-- Sistema de Cola de Espera (Waitlist) para Bookings
-- Date: 2025-11-04
-- Description: Permite a usuarios inscribirse en una lista de espera
--              cuando un auto no está disponible. Se notifica automáticamente
--              cuando un booking pending expira o se cancela.
-- ================================================================

BEGIN;

-- ================================================================
-- 1. Crear tabla booking_waitlist
-- ================================================================

CREATE TABLE IF NOT EXISTS public.booking_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Fechas deseadas
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'notified', 'expired', 'cancelled')),
  
  -- Metadata
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CHECK (end_date > start_date),
  UNIQUE(car_id, user_id, start_date, end_date) -- Un usuario solo puede estar una vez por auto/fechas
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_waitlist_car_dates ON public.booking_waitlist(car_id, start_date, end_date)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_waitlist_user_status ON public.booking_waitlist(user_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_waitlist_expires_at ON public.booking_waitlist(expires_at)
  WHERE status = 'active';

-- Trigger para updated_at
CREATE TRIGGER set_waitlist_updated_at
  BEFORE UPDATE ON public.booking_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 2. RLS Policies para booking_waitlist
-- ================================================================

ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propias entradas en waitlist
CREATE POLICY "Users can view own waitlist entries"
ON public.booking_waitlist FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Usuarios pueden crear sus propias entradas en waitlist
CREATE POLICY "Users can create own waitlist entries"
ON public.booking_waitlist FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden actualizar sus propias entradas (cancelar, marcar como notificado)
CREATE POLICY "Users can update own waitlist entries"
ON public.booking_waitlist FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden eliminar sus propias entradas
CREATE POLICY "Users can delete own waitlist entries"
ON public.booking_waitlist FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ================================================================
-- 3. Función: Agregar usuario a waitlist
-- ================================================================

CREATE OR REPLACE FUNCTION public.add_to_waitlist(
  p_car_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS public.booking_waitlist
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waitlist_entry public.booking_waitlist;
BEGIN
  -- Validar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar que las fechas son válidas
  IF p_start_date >= p_end_date THEN
    RAISE EXCEPTION 'La fecha de fin debe ser posterior a la fecha de inicio';
  END IF;

  IF p_start_date < now() THEN
    RAISE EXCEPTION 'No puedes agregar fechas pasadas a la waitlist';
  END IF;

  -- Verificar que el auto existe y está activo
  IF NOT EXISTS (
    SELECT 1 FROM public.cars
    WHERE id = p_car_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Auto no disponible';
  END IF;

  -- Intentar insertar o actualizar si ya existe
  INSERT INTO public.booking_waitlist (
    car_id,
    user_id,
    start_date,
    end_date,
    status,
    expires_at
  ) VALUES (
    p_car_id,
    auth.uid(),
    p_start_date,
    p_end_date,
    'active',
    now() + INTERVAL '30 days'
  )
  ON CONFLICT (car_id, user_id, start_date, end_date)
  DO UPDATE SET
    status = 'active',
    expires_at = now() + INTERVAL '30 days',
    updated_at = now()
  RETURNING * INTO v_waitlist_entry;

  RETURN v_waitlist_entry;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_to_waitlist(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION public.add_to_waitlist IS 
'Agrega un usuario a la lista de espera para un auto en fechas específicas.
Se notificará automáticamente cuando el auto esté disponible.';

-- ================================================================
-- 4. Función: Remover usuario de waitlist
-- ================================================================

CREATE OR REPLACE FUNCTION public.remove_from_waitlist(
  p_waitlist_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Actualizar status a cancelled
  UPDATE public.booking_waitlist
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_waitlist_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada de waitlist no encontrada o no tienes permiso';
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_from_waitlist(UUID) TO authenticated;

COMMENT ON FUNCTION public.remove_from_waitlist IS 
'Remueve una entrada de waitlist (la marca como cancelled).';

-- ================================================================
-- 5. Función: Notificar usuarios en waitlist cuando booking expira/cancela
-- ================================================================

CREATE OR REPLACE FUNCTION public.notify_waitlist_on_booking_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waitlist_entry RECORD;
  v_notification_count INTEGER := 0;
BEGIN
  -- Solo procesar si el booking cambió de status pending a expired o cancelled
  -- O si se eliminó un booking pending
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('expired', 'cancelled'))
     OR (TG_OP = 'DELETE' AND OLD.status = 'pending')
  THEN
    -- Buscar usuarios en waitlist que coincidan con las fechas del booking
    FOR v_waitlist_entry IN
      SELECT w.*
      FROM public.booking_waitlist w
      WHERE w.car_id = COALESCE(NEW.car_id, OLD.car_id)
        AND w.status = 'active'
        AND (w.start_date, w.end_date) OVERLAPS (
          COALESCE(NEW.start_at, OLD.start_at),
          COALESCE(NEW.end_at, OLD.end_at)
        )
        AND w.expires_at > now()
    LOOP
      -- Verificar que el auto está realmente disponible ahora
      IF NOT EXISTS (
        SELECT 1 FROM public.bookings
        WHERE car_id = v_waitlist_entry.car_id
          AND status IN ('pending', 'confirmed', 'in_progress')
          AND (start_at, end_at) OVERLAPS (v_waitlist_entry.start_date, v_waitlist_entry.end_date)
      ) THEN
        -- Auto está disponible, notificar al usuario
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          body,
          cta_link,
          metadata
        ) VALUES (
          v_waitlist_entry.user_id,
          'generic_announcement',
          'Auto disponible',
          'El auto que tenías en lista de espera ahora está disponible para las fechas que seleccionaste.',
          format('/cars/%s?start=%s&end=%s', 
            v_waitlist_entry.car_id,
            v_waitlist_entry.start_date::date,
            v_waitlist_entry.end_date::date
          ),
          jsonb_build_object(
            'waitlist_id', v_waitlist_entry.id,
            'car_id', v_waitlist_entry.car_id,
            'start_date', v_waitlist_entry.start_date,
            'end_date', v_waitlist_entry.end_date
          )
        );

        -- Marcar waitlist entry como notificada
        UPDATE public.booking_waitlist
        SET 
          status = 'notified',
          notified_at = now(),
          updated_at = now()
        WHERE id = v_waitlist_entry.id;

        v_notification_count := v_notification_count + 1;
      END IF;
    END LOOP;

    -- Log para debugging (solo en desarrollo)
    IF v_notification_count > 0 THEN
      RAISE NOTICE 'Notificados % usuarios en waitlist para car_id %', 
        v_notification_count, 
        COALESCE(NEW.car_id, OLD.car_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear trigger que se ejecuta después de actualizar o eliminar bookings
DROP TRIGGER IF EXISTS trigger_notify_waitlist_on_booking_change ON public.bookings;

CREATE TRIGGER trigger_notify_waitlist_on_booking_change
  AFTER UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_waitlist_on_booking_change();

COMMENT ON FUNCTION public.notify_waitlist_on_booking_change IS 
'Notifica automáticamente a usuarios en waitlist cuando un booking pending expira o se cancela.';

-- ================================================================
-- 6. Función: Verificar si hay usuarios en waitlist para un auto
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_waitlist_count(
  p_car_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.booking_waitlist
  WHERE car_id = p_car_id
    AND status = 'active'
    AND (start_date, end_date) OVERLAPS (p_start_date, p_end_date)
    AND expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_waitlist_count(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon;

COMMENT ON FUNCTION public.get_waitlist_count IS 
'Retorna el número de usuarios en waitlist para un auto en fechas específicas.';

-- ================================================================
-- 7. Función: Obtener waitlist del usuario actual
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_my_waitlist()
RETURNS TABLE (
  id UUID,
  car_id UUID,
  car_brand TEXT,
  car_model TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.car_id,
    c.brand as car_brand,
    c.model as car_model,
    w.start_date,
    w.end_date,
    w.status,
    w.notified_at,
    w.created_at
  FROM public.booking_waitlist w
  JOIN public.cars c ON c.id = w.car_id
  WHERE w.user_id = auth.uid()
    AND w.status = 'active'
    AND w.expires_at > now()
  ORDER BY w.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_waitlist() TO authenticated;

COMMENT ON FUNCTION public.get_my_waitlist IS 
'Retorna todas las entradas activas de waitlist del usuario actual.';

-- ================================================================
-- 8. Limpiar waitlist expirada (para ejecutar periódicamente)
-- ================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_waitlist()
RETURNS TABLE(expired_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE public.booking_waitlist
  SET 
    status = 'expired',
    updated_at = now()
  WHERE status = 'active'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_waitlist() TO service_role;

COMMENT ON FUNCTION public.cleanup_expired_waitlist IS 
'Limpia entradas de waitlist expiradas. Debe ejecutarse periódicamente (cron).';

COMMIT;

-- ================================================================
-- RESUMEN
-- ================================================================
-- 
-- Sistema de Cola de Espera (Waitlist) implementado:
--
-- 1. ✅ Tabla booking_waitlist para almacenar usuarios en espera
-- 2. ✅ Función add_to_waitlist() para agregar usuarios
-- 3. ✅ Función remove_from_waitlist() para remover usuarios
-- 4. ✅ Trigger automático que notifica cuando booking expira/cancela
-- 5. ✅ Función get_waitlist_count() para verificar cuántos usuarios esperan
-- 6. ✅ Función get_my_waitlist() para que usuarios vean su waitlist
-- 7. ✅ Función cleanup_expired_waitlist() para limpiar entradas expiradas
--
-- FLUJO:
-- 1. Usuario intenta reservar → Falla por constraint
-- 2. Frontend ofrece opción "Agregar a lista de espera"
-- 3. Usuario se agrega a waitlist → add_to_waitlist()
-- 4. Booking pending expira → Trigger notifica automáticamente
-- 5. Usuario recibe notificación → Puede intentar reservar nuevamente
--
-- PRÓXIMOS PASOS:
-- 1. Actualizar frontend para mostrar opción de waitlist cuando hay conflicto
-- 2. Crear página para ver waitlist del usuario
-- 3. Configurar cron job para cleanup_expired_waitlist()
-- ================================================================

