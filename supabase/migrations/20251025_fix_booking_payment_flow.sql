-- ============================================================================
-- Migration: Fix Booking Payment Flow
-- Date: 2025-10-25
-- Description: Corrige el flujo de pagos y reservas:
--   1. Asegura que risk_snapshot_booking_id sea la columna usada
--   2. Limpia columnas duplicadas o incorrectas  
--   3. Documenta el flujo correcto
-- ============================================================================

-- 1. Remover columna risk_snapshot_id si existe (incorrecta)
-- Esta columna intenta hacer FK a booking_risk_snapshot(id) que no existe
-- La PK de booking_risk_snapshot es booking_id, no id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'risk_snapshot_id'
  ) THEN
    ALTER TABLE bookings DROP COLUMN risk_snapshot_id;
    RAISE NOTICE 'Dropped incorrect column: bookings.risk_snapshot_id';
  END IF;
END $$;

-- 2. Asegurar que risk_snapshot_booking_id existe y es correcto
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS risk_snapshot_booking_id UUID;

-- 3. Agregar FK constraint si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_bookings_risk_snapshot'
    AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_risk_snapshot
    FOREIGN KEY (risk_snapshot_booking_id)
    REFERENCES booking_risk_snapshot(booking_id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Added FK constraint: fk_bookings_risk_snapshot';
  END IF;
END $$;

-- 4. Asegurar que payment_mode existe
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_mode TEXT CHECK (payment_mode IN ('card', 'wallet'));

-- 5. Agregar índice para mejorar queries
CREATE INDEX IF NOT EXISTS idx_bookings_risk_snapshot 
ON bookings(risk_snapshot_booking_id);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_mode 
ON bookings(payment_mode);

-- ============================================================================
-- DOCUMENTACIÓN DEL FLUJO CORRECTO
-- ============================================================================

COMMENT ON COLUMN bookings.risk_snapshot_booking_id IS 
'FK a booking_risk_snapshot(booking_id). Se crea DESPUÉS de insertar el booking, no antes.';

COMMENT ON COLUMN bookings.payment_mode IS 
'Modo de pago seleccionado: "card" (hold en tarjeta) o "wallet" (créditos/depósito)';

COMMENT ON TABLE booking_risk_snapshot IS 
'Snapshot de riesgo por booking. Se crea DESPUÉS del booking. 
La PK es booking_id (no tiene id separado).
Flujo correcto:
1. Crear booking en estado "pending"
2. Crear risk_snapshot con booking_id
3. Actualizar booking.risk_snapshot_booking_id = booking_id
4. Procesar pago según payment_mode';

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- Estados válidos de booking_status:
--   - pending: Esperando pago o aprobación
--   - confirmed: Pago completado y confirmado
--   - in_progress: Vehículo entregado
--   - completed: Reserva finalizada
--   - cancelled: Cancelada
--   - no_show: Cliente no se presentó
--   - expired: Expirada por timeout

-- NO USAR pending_confirmation - no existe en el enum

-- Campos de bookings (columnas reales):
--   - id, car_id, renter_id
--   - start_at, end_at (NO start_date/end_date)  
--   - status (booking_status enum)
--   - total_amount, currency
--   - payment_mode
--   - risk_snapshot_booking_id
--   - created_at, updated_at
--   - días_count, rate_per_day, platform_fee, owner_payout, etc.

-- NO USAR:
--   - user_id (es renter_id)
--   - total_price_usd (es total_amount en currency)
--   - risk_snapshot_id (es risk_snapshot_booking_id)
