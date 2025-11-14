-- =====================================================
-- FUNCIÓN OPTIMIZADA: booking_location_tracking_broadcast_trigger
-- Reducción de payload y broadcasts innecesarios
-- =====================================================

-- ✅ VERSIÓN OPTIMIZADA
CREATE OR REPLACE FUNCTION public.booking_location_tracking_broadcast_trigger()
RETURNS TRIGGER AS $$
DECLARE
  location_changed boolean;
  status_changed boolean;
BEGIN
  -- Solo aplicable a UPDATE (no INSERT/DELETE)
  IF (TG_OP != 'UPDATE') THEN
    RETURN NEW;
  END IF;

  -- Detectar si cambió la ubicación (columna crítica para tracking)
  location_changed := (
    OLD.current_location IS DISTINCT FROM NEW.current_location
    OR OLD.current_lat IS DISTINCT FROM NEW.current_lat
    OR OLD.current_lng IS DISTINCT FROM NEW.current_lng
  );

  -- Detectar si cambió el estado (relevante para UI)
  status_changed := (OLD.status IS DISTINCT FROM NEW.status);

  -- Solo broadcast si cambió algo relevante
  IF location_changed OR status_changed THEN
    PERFORM pg_notify(
      'booking_location:' || NEW.id::text,  -- Topic granular por booking
      json_build_object(
        'id', NEW.id,
        'event', 'location_update',
        'location', COALESCE(NEW.current_location,
                             CASE
                               WHEN NEW.current_lat IS NOT NULL AND NEW.current_lng IS NOT NULL
                               THEN point(NEW.current_lng, NEW.current_lat)::text
                               ELSE NULL
                             END),
        'lat', NEW.current_lat,
        'lng', NEW.current_lng,
        'status', NEW.status,
        'updated_at', EXTRACT(EPOCH FROM NEW.updated_at)::bigint
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RECREAR TRIGGER (solo si no existe o necesitas actualizar)
-- =====================================================

-- Primero eliminar el trigger viejo si existe
DROP TRIGGER IF EXISTS booking_location_tracking_trigger ON bookings;

-- Crear trigger optimizado (solo UPDATE)
CREATE TRIGGER booking_location_tracking_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.booking_location_tracking_broadcast_trigger();

-- =====================================================
-- VALIDACIÓN: Probar que funciona
-- =====================================================

-- Prueba 1: Update de location (debe disparar broadcast)
-- UPDATE bookings SET current_lat = -34.603722, current_lng = -58.381592
-- WHERE id = 'test-booking-id';

-- Prueba 2: Update de otro campo (NO debe disparar broadcast)
-- UPDATE bookings SET notes = 'Test note'
-- WHERE id = 'test-booking-id';

-- =====================================================
-- MEJORAS IMPLEMENTADAS:
-- =====================================================
-- ✅ Solo broadcast en UPDATE (no INSERT/DELETE)
-- ✅ Solo si cambió location o status
-- ✅ Payload mínimo (<500 bytes vs 5+ KB)
-- ✅ Topic granular (booking_location:ID)
-- ✅ Usa pg_notify (más eficiente que realtime.send para este caso)
-- ✅ No hace JOINs innecesarios
-- ✅ Compatible con nombres de columnas actuales de bookings
