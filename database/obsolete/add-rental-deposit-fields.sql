/**
 * Migration: Agregar campos separados para rental payment y security deposit
 *
 * Modelo de negocio:
 * - rental_amount: Monto del alquiler que se TRANSFIERE al propietario
 * - deposit_amount: Garantía que se DEVUELVE al usuario (o se usa para daños)
 *
 * Ejemplo:
 * - Alquiler 3 días x $100 = $300 (rental_amount)
 * - Garantía = $250 (deposit_amount)
 * - Total bloqueado = $550
 *
 * Al finalizar sin daños:
 * - $300 → Propietario
 * - $250 → Vuelve al usuario (a su wallet)
 */

-- Agregar nuevos campos a bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS rental_amount_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_amount_cents INTEGER DEFAULT 250 * 100, -- Default $250 USD
ADD COLUMN IF NOT EXISTS rental_lock_transaction_id UUID REFERENCES wallet_transactions(id),
ADD COLUMN IF NOT EXISTS deposit_lock_transaction_id UUID REFERENCES wallet_transactions(id),
ADD COLUMN IF NOT EXISTS rental_payment_transaction_id UUID REFERENCES wallet_transactions(id),
ADD COLUMN IF NOT EXISTS deposit_release_transaction_id UUID REFERENCES wallet_transactions(id),
ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'none'; -- 'none', 'locked', 'released', 'partially_charged', 'fully_charged'

-- Comentarios para documentación
COMMENT ON COLUMN bookings.rental_amount_cents IS 'Monto del alquiler en centavos que se transfiere al propietario';
COMMENT ON COLUMN bookings.deposit_amount_cents IS 'Monto de la garantía en centavos que se devuelve al usuario (o se usa para daños)';
COMMENT ON COLUMN bookings.rental_lock_transaction_id IS 'ID de la transacción que bloqueó el pago del alquiler';
COMMENT ON COLUMN bookings.deposit_lock_transaction_id IS 'ID de la transacción que bloqueó la garantía';
COMMENT ON COLUMN bookings.rental_payment_transaction_id IS 'ID de la transacción que pagó al propietario';
COMMENT ON COLUMN bookings.deposit_release_transaction_id IS 'ID de la transacción que liberó la garantía al usuario';
COMMENT ON COLUMN bookings.deposit_status IS 'Estado de la garantía: none, locked, released, partially_charged, fully_charged';

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_bookings_rental_lock_tx ON bookings(rental_lock_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_lock_tx ON bookings(deposit_lock_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_status ON bookings(deposit_status);

-- Extender enum de transaction types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_transaction_type') THEN
    CREATE TYPE wallet_transaction_type AS ENUM (
      'deposit', 'withdrawal', 'payment', 'refund',
      'lock', 'unlock',
      'rental_payment_lock', 'rental_payment_transfer',
      'security_deposit_lock', 'security_deposit_release', 'security_deposit_charge'
    );
  ELSE
    -- Agregar nuevos valores al enum existente
    ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'rental_payment_lock';
    ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'rental_payment_transfer';
    ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'security_deposit_lock';
    ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'security_deposit_release';
    ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'security_deposit_charge';
  END IF;
END $$;

-- Migrar datos existentes (si hay bookings con wallet_amount_cents)
-- Asumimos que wallet_amount_cents anterior era para garantía
UPDATE bookings
SET
  deposit_amount_cents = wallet_amount_cents,
  rental_lock_transaction_id = wallet_lock_transaction_id,
  deposit_status = CASE
    WHEN wallet_status = 'locked' THEN 'locked'
    WHEN wallet_status = 'refunded' THEN 'released'
    ELSE 'none'
  END
WHERE wallet_amount_cents > 0 AND rental_amount_cents = 0;

-- Limpiar campos antiguos para evitar confusión
-- (opcional, comentar si quieres mantener los datos antiguos)
-- UPDATE bookings SET wallet_amount_cents = 0, wallet_status = NULL WHERE rental_amount_cents > 0;
