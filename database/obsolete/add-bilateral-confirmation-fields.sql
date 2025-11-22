/**
 * Migration: Sistema de Confirmación Bilateral para Liberación de Fondos
 *
 * Modelo de negocio:
 * - Después de devolver el auto, AMBAS partes deben confirmar
 * - Locador confirma: "Vehículo entregado con éxito" (puede reportar daños)
 * - Locatario confirma: "Liberar pago del locador"
 * - Solo cuando AMBOS confirman → se liberan los fondos automáticamente
 *
 * Esto previene:
 * - Fraude del propietario (recibir pago sin confirmar devolución)
 * - Fraude del usuario (reportar daños falsos después de recibir garantía)
 */

-- Agregar campos de confirmación bilateral a bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS owner_confirmed_delivery BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS owner_confirmation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS owner_reported_damages BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS owner_damage_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_damage_description TEXT,
ADD COLUMN IF NOT EXISTS renter_confirmed_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS renter_confirmation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS funds_released_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completion_status TEXT DEFAULT 'active';
-- 'active', 'returned', 'pending_owner', 'pending_renter', 'pending_both', 'ready_to_release', 'funds_released'

-- Comentarios
COMMENT ON COLUMN bookings.returned_at IS 'Fecha en que el auto fue devuelto físicamente';
COMMENT ON COLUMN bookings.owner_confirmed_delivery IS 'Propietario confirmó que recibió el auto en buenas condiciones (o reportó daños)';
COMMENT ON COLUMN bookings.owner_confirmation_at IS 'Fecha de confirmación del propietario';
COMMENT ON COLUMN bookings.owner_reported_damages IS 'Propietario reportó daños al vehículo';
COMMENT ON COLUMN bookings.owner_damage_amount IS 'Monto de daños reportados por el propietario';
COMMENT ON COLUMN bookings.owner_damage_description IS 'Descripción de daños reportados';
COMMENT ON COLUMN bookings.renter_confirmed_payment IS 'Usuario confirmó liberar el pago al propietario';
COMMENT ON COLUMN bookings.renter_confirmation_at IS 'Fecha de confirmación del usuario';
COMMENT ON COLUMN bookings.funds_released_at IS 'Fecha en que se liberaron los fondos automáticamente';
COMMENT ON COLUMN bookings.completion_status IS 'Estado del proceso de finalización: active, returned, pending_owner, pending_renter, pending_both, ready_to_release, funds_released';

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_bookings_completion_status ON bookings(completion_status);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_confirmed ON bookings(owner_confirmed_delivery);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_confirmed ON bookings(renter_confirmed_payment);
CREATE INDEX IF NOT EXISTS idx_bookings_returned_at ON bookings(returned_at);

-- Función para marcar auto como devuelto
CREATE OR REPLACE FUNCTION booking_mark_as_returned(
  p_booking_id UUID,
  p_returned_by UUID -- user_id del que marca como devuelto (puede ser renter o owner)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  completion_status TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_renter_id UUID;
  v_owner_id UUID;
  v_booking_status TEXT;
BEGIN
  -- Obtener datos del booking
  SELECT b.renter_id, c.owner_id, b.status
  INTO v_renter_id, v_owner_id, v_booking_status
  FROM bookings b
  JOIN cars c ON b.car_id = c.id
  WHERE b.id = p_booking_id;

  IF v_renter_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Booking no encontrado', 'error';
    RETURN;
  END IF;

  -- Verificar que el booking esté activo o confirmado
  IF v_booking_status NOT IN ('confirmed', 'active') THEN
    RETURN QUERY SELECT FALSE,
      'El booking debe estar en estado confirmed o active. Estado actual: ' || v_booking_status,
      'error';
    RETURN;
  END IF;

  -- Marcar como devuelto
  UPDATE bookings
  SET
    returned_at = NOW(),
    completion_status = 'returned',
    status = 'returned'
  WHERE id = p_booking_id;

  RETURN QUERY SELECT TRUE,
    'Auto marcado como devuelto. Esperando confirmaciones de ambas partes.',
    'returned'::TEXT;
END;
$$;

COMMENT ON FUNCTION booking_mark_as_returned IS
'Marca un booking como devuelto físicamente. No libera fondos, espera confirmaciones bilaterales.';
