-- =====================================================
-- TABLA: wallet_transactions
-- DESCRIPCIÓN: Tabla principal del sistema de wallet
-- AUTOR: Claude Code
-- FECHA: 2025-10-17
-- =====================================================

-- Drop table if exists (solo para desarrollo)
DROP TABLE IF EXISTS wallet_transactions CASCADE;

-- Crear tabla wallet_transactions
CREATE TABLE wallet_transactions (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Tipo y estado de transacción
  type TEXT NOT NULL CHECK (type IN (
    'deposit',      -- Depósito de fondos
    'lock',         -- Bloqueo de fondos para garantía
    'unlock',       -- Desbloqueo de fondos
    'charge',       -- Cargo efectivo de fondos
    'refund',       -- Devolución de fondos
    'bonus'         -- Bonificación/regalo
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- En proceso
    'completed',    -- Completada exitosamente
    'failed',       -- Falló
    'refunded'      -- Reembolsada
  )),

  -- Montos y moneda
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'UYU')),

  -- Referencias a otras entidades
  reference_type TEXT CHECK (reference_type IN ('booking', 'deposit', 'reward')),
  reference_id UUID,  -- booking_id, deposit_id, etc.

  -- Información del proveedor de pago
  provider TEXT CHECK (provider IN (
    'mercadopago',
    'stripe',
    'bank_transfer',
    'internal'      -- Para transferencias internas o bonos
  )),
  provider_transaction_id TEXT,  -- ID de transacción en el proveedor externo
  provider_metadata JSONB,       -- Metadata del proveedor (webhooks, etc.)

  -- Descripción y notas
  description TEXT,
  admin_notes TEXT,  -- Notas internas para admins

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,  -- Fecha de completación

  -- Constraints adicionales
  CONSTRAINT valid_reference CHECK (
    (reference_type IS NULL AND reference_id IS NULL) OR
    (reference_type IS NOT NULL AND reference_id IS NOT NULL)
  )
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para búsquedas por usuario (más común)
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);

-- Índice compuesto para balance queries (user_id + status)
CREATE INDEX idx_wallet_transactions_user_status ON wallet_transactions(user_id, status);

-- Índice para búsquedas por booking
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);

-- Índice para búsquedas por proveedor
CREATE INDEX idx_wallet_transactions_provider ON wallet_transactions(provider, provider_transaction_id);

-- Índice para ordenamiento por fecha
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- Índice para transacciones pendientes (monitoreo)
CREATE INDEX idx_wallet_transactions_pending ON wallet_transactions(status) WHERE status = 'pending';

-- =====================================================
-- TRIGGER: updated_at automático
-- =====================================================

CREATE OR REPLACE FUNCTION update_wallet_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Si cambia a completed, actualizar completed_at
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_transactions_updated_at
  BEFORE UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_transactions_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Los usuarios solo pueden ver sus propias transacciones
CREATE POLICY wallet_transactions_select_own
  ON wallet_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Los usuarios pueden insertar sus propias transacciones (depósitos)
CREATE POLICY wallet_transactions_insert_own
  ON wallet_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Solo el sistema puede actualizar transacciones (vía RPC functions)
-- Esto previene que usuarios modifiquen manualmente sus transacciones
CREATE POLICY wallet_transactions_update_system
  ON wallet_transactions
  FOR UPDATE
  USING (false);  -- Nadie puede UPDATE directo, solo via funciones

-- Policy 4: Admins pueden ver todas las transacciones
CREATE POLICY wallet_transactions_admin_all
  ON wallet_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE wallet_transactions IS 'Tabla principal del sistema de wallet para gestionar depósitos, bloqueos y cargos de fondos';
COMMENT ON COLUMN wallet_transactions.type IS 'Tipo de transacción: deposit, lock, unlock, charge, refund, bonus';
COMMENT ON COLUMN wallet_transactions.status IS 'Estado de la transacción: pending, completed, failed, refunded';
COMMENT ON COLUMN wallet_transactions.amount IS 'Monto de la transacción (siempre positivo)';
COMMENT ON COLUMN wallet_transactions.reference_type IS 'Tipo de referencia: booking, deposit, reward';
COMMENT ON COLUMN wallet_transactions.reference_id IS 'ID de la entidad referenciada (ej: booking_id)';
COMMENT ON COLUMN wallet_transactions.provider IS 'Proveedor de pago: mercadopago, stripe, bank_transfer, internal';
COMMENT ON COLUMN wallet_transactions.provider_transaction_id IS 'ID de transacción en el sistema externo del proveedor';
COMMENT ON COLUMN wallet_transactions.provider_metadata IS 'Metadata JSON del proveedor (webhooks, responses, etc)';

-- =====================================================
-- GRANTS (permisos)
-- =====================================================

-- Usuarios autenticados pueden SELECT/INSERT (limitado por RLS)
GRANT SELECT, INSERT ON wallet_transactions TO authenticated;

-- Servicio puede hacer UPDATE/DELETE (para funciones RPC)
GRANT UPDATE, DELETE ON wallet_transactions TO service_role;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
