-- ============================================================================
-- AUTORENTAR WALLET LEDGER SYSTEM - Doble Partida
-- ============================================================================
-- Migración del sistema actual de wallets a un sistema de contabilidad
-- de doble partida con ledger atómico y fondo de cobertura para franquicias
-- ============================================================================

-- 1. TIPOS ENUM
-- ============================================================================

-- Tipos de movimientos en el ledger
DO $$ BEGIN
  CREATE TYPE ledger_kind AS ENUM (
    'deposit',           -- Depósito externo (PSP → Usuario)
    'transfer_out',      -- Transferencia saliente (Usuario → Usuario)
    'transfer_in',       -- Transferencia entrante (Usuario → Usuario)
    'rental_charge',     -- Cargo por alquiler (Usuario → Sistema)
    'rental_payment',    -- Pago a locador (Sistema → Locador)
    'refund',            -- Reembolso (Sistema → Usuario)
    'franchise_user',    -- Franquicia pagada por usuario
    'franchise_fund',    -- Franquicia pagada por fondo
    'withdrawal',        -- Retiro a cuenta bancaria
    'adjustment',        -- Ajuste manual (admin)
    'bonus',             -- Bonificación/promoción
    'fee'                -- Comisión de plataforma
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. TABLA PRINCIPAL: WALLET LEDGER (Libro Mayor)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamp y usuario
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Tipo y monto
  kind ledger_kind NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),  -- Siempre positivo

  -- Idempotencia y referencia
  ref VARCHAR(128) NOT NULL,  -- Idempotency key único

  -- Metadata (JSON flexible)
  meta JSONB NOT NULL DEFAULT '{}',

  -- Relación con tablas existentes
  transaction_id UUID REFERENCES wallet_transactions(id),
  booking_id UUID REFERENCES bookings(id),

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_ledger_ref ON wallet_ledger(ref);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_ts ON wallet_ledger(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_kind ON wallet_ledger(kind);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_booking ON wallet_ledger(booking_id) WHERE booking_id IS NOT NULL;

-- 3. TABLA: TRANSFERENCIAS INTERNAS (Resumen P2P)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  from_user UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  to_user UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),

  -- Idempotencia
  ref VARCHAR(128) NOT NULL,

  -- Estado
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),

  -- Metadata
  meta JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraint: no auto-transferencias
  CHECK (from_user != to_user)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transfers_ref ON wallet_transfers(ref);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_from ON wallet_transfers(from_user, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_to ON wallet_transfers(to_user, created_at DESC);

-- 4. TABLA: FONDO DE COBERTURA (Para franquicias)
-- ============================================================================

CREATE TABLE IF NOT EXISTS coverage_fund (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),  -- Fila única (singleton)

  balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),

  -- Auditoría
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata (estadísticas, configuración)
  meta JSONB NOT NULL DEFAULT '{}'
);

-- Insertar fila única con saldo inicial 0
INSERT INTO coverage_fund (id, balance_cents, meta)
VALUES (TRUE, 0, '{"initial_balance": 0, "created_at": "2025-10-21"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5. FUNCIÓN: APLICAR ASIENTO DEL LEDGER (Trigger)
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_ledger_entry()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance BIGINT;
BEGIN
  -- Validar que el usuario tiene wallet
  IF NOT EXISTS (SELECT 1 FROM user_wallets WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Wallet not found for user %', NEW.user_id;
  END IF;

  -- ASIENTOS QUE INCREMENTAN EL SALDO DEL USUARIO
  IF NEW.kind IN ('deposit', 'transfer_in', 'refund', 'rental_payment', 'bonus') THEN
    UPDATE user_wallets
    SET
      available_balance = available_balance + NEW.amount_cents,
      updated_at = NOW()
    WHERE user_id = NEW.user_id
    RETURNING available_balance INTO current_balance;

    RAISE NOTICE 'User % balance increased by % (kind: %). New balance: %',
      NEW.user_id, NEW.amount_cents, NEW.kind, current_balance;

  -- ASIENTOS QUE DECREMENTAN EL SALDO DEL USUARIO
  ELSIF NEW.kind IN ('transfer_out', 'rental_charge', 'franchise_user', 'withdrawal', 'adjustment', 'fee') THEN
    -- Verificar saldo suficiente
    SELECT available_balance INTO current_balance
    FROM user_wallets
    WHERE user_id = NEW.user_id
    FOR UPDATE;  -- Lock pesimista

    IF current_balance < NEW.amount_cents THEN
      RAISE EXCEPTION 'Insufficient balance for user %. Balance: %, Required: %',
        NEW.user_id, current_balance, NEW.amount_cents;
    END IF;

    UPDATE user_wallets
    SET
      available_balance = available_balance - NEW.amount_cents,
      locked_balance = CASE
        WHEN NEW.kind = 'rental_charge' THEN locked_balance + NEW.amount_cents
        ELSE locked_balance
      END,
      updated_at = NOW()
    WHERE user_id = NEW.user_id
    RETURNING available_balance INTO current_balance;

    RAISE NOTICE 'User % balance decreased by % (kind: %). New balance: %',
      NEW.user_id, NEW.amount_cents, NEW.kind, current_balance;

  -- ASIENTOS QUE AFECTAN EL FONDO DE COBERTURA
  ELSIF NEW.kind = 'franchise_fund' THEN
    UPDATE coverage_fund
    SET
      balance_cents = balance_cents - NEW.amount_cents,  -- Fondo paga la franquicia
      updated_at = NOW()
    WHERE id = TRUE;

    RAISE NOTICE 'Coverage fund decreased by % (franchise payment). Ref: %',
      NEW.amount_cents, NEW.ref;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: aplicar asiento después de cada inserción
DROP TRIGGER IF EXISTS tg_apply_ledger ON wallet_ledger;
CREATE TRIGGER tg_apply_ledger
  AFTER INSERT ON wallet_ledger
  FOR EACH ROW
  EXECUTE FUNCTION apply_ledger_entry();

-- 6. FUNCIÓN RPC: TRANSFERENCIA INTERNA
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_transfer(
  p_from_user UUID,
  p_to_user UUID,
  p_amount_cents BIGINT,
  p_ref VARCHAR,
  p_meta JSONB DEFAULT '{}'
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_transfer_id UUID;
  v_from_balance BIGINT;
BEGIN
  -- Validaciones
  IF p_from_user = p_to_user THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM wallet_transfers WHERE ref = p_ref) THEN
    -- Ya existe, devolver la transferencia existente
    SELECT id INTO v_transfer_id FROM wallet_transfers WHERE ref = p_ref;
    RETURN jsonb_build_object(
      'ok', true,
      'transfer_id', v_transfer_id,
      'ref', p_ref,
      'status', 'duplicate'
    );
  END IF;

  -- Iniciar transacción atómica
  BEGIN
    -- Verificar saldo con lock
    SELECT available_balance INTO v_from_balance
    FROM user_wallets
    WHERE user_id = p_from_user
    FOR UPDATE;

    IF v_from_balance < p_amount_cents THEN
      RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_from_balance, p_amount_cents;
    END IF;

    -- Crear registro de transferencia
    INSERT INTO wallet_transfers (from_user, to_user, amount_cents, ref, status, meta, completed_at)
    VALUES (p_from_user, p_to_user, p_amount_cents, p_ref, 'completed', p_meta, NOW())
    RETURNING id INTO v_transfer_id;

    -- Asiento saliente (FROM)
    INSERT INTO wallet_ledger (user_id, kind, amount_cents, ref, meta)
    VALUES (p_from_user, 'transfer_out', p_amount_cents, p_ref || '-out',
            jsonb_build_object('to_user', p_to_user, 'transfer_id', v_transfer_id));

    -- Asiento entrante (TO)
    INSERT INTO wallet_ledger (user_id, kind, amount_cents, ref, meta)
    VALUES (p_to_user, 'transfer_in', p_amount_cents, p_ref || '-in',
            jsonb_build_object('from_user', p_from_user, 'transfer_id', v_transfer_id));

    RETURN jsonb_build_object(
      'ok', true,
      'transfer_id', v_transfer_id,
      'ref', p_ref,
      'status', 'completed',
      'from_user', p_from_user,
      'to_user', p_to_user,
      'amount_cents', p_amount_cents
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Registrar transferencia fallida
      INSERT INTO wallet_transfers (from_user, to_user, amount_cents, ref, status, meta)
      VALUES (p_from_user, p_to_user, p_amount_cents, p_ref, 'failed',
              jsonb_build_object('error', SQLERRM));

      RAISE;
  END;
END;
$$;

-- 7. FUNCIÓN RPC: DEPOSITO (Webhook PSP)
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_deposit_ledger(
  p_user_id UUID,
  p_amount_cents BIGINT,
  p_ref VARCHAR,
  p_provider TEXT DEFAULT 'mercadopago',
  p_meta JSONB DEFAULT '{}'
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM wallet_ledger WHERE ref = p_ref) THEN
    SELECT id INTO v_ledger_id FROM wallet_ledger WHERE ref = p_ref;
    RETURN jsonb_build_object(
      'ok', true,
      'ledger_id', v_ledger_id,
      'ref', p_ref,
      'status', 'duplicate'
    );
  END IF;

  -- Crear asiento de depósito
  INSERT INTO wallet_ledger (user_id, kind, amount_cents, ref, meta)
  VALUES (p_user_id, 'deposit', p_amount_cents, p_ref,
          jsonb_build_object('provider', p_provider) || p_meta)
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'ref', p_ref,
    'status', 'completed',
    'user_id', p_user_id,
    'amount_cents', p_amount_cents
  );
END;
$$;

-- 8. FUNCIÓN RPC: CARGO POR ALQUILER
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_charge_rental(
  p_user_id UUID,
  p_booking_id UUID,
  p_amount_cents BIGINT,
  p_ref VARCHAR,
  p_meta JSONB DEFAULT '{}'
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ledger_id UUID;
  v_current_balance BIGINT;
BEGIN
  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM wallet_ledger WHERE ref = p_ref) THEN
    SELECT id INTO v_ledger_id FROM wallet_ledger WHERE ref = p_ref;
    RETURN jsonb_build_object('ok', true, 'ref', p_ref, 'status', 'duplicate');
  END IF;

  -- Verificar saldo
  SELECT balance INTO v_current_balance FROM user_wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_current_balance < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance for rental charge';
  END IF;

  -- Crear asiento de cargo
  INSERT INTO wallet_ledger (user_id, kind, amount_cents, ref, booking_id, meta)
  VALUES (p_user_id, 'rental_charge', p_amount_cents, p_ref, p_booking_id, p_meta)
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'ref', p_ref,
    'booking_id', p_booking_id,
    'amount_cents', p_amount_cents
  );
END;
$$;

-- 9. RLS POLICIES
-- ============================================================================

ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_fund ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver su propio ledger
CREATE POLICY "Users can view own ledger entries"
  ON wallet_ledger FOR SELECT
  USING (user_id = auth.uid());

-- Usuarios pueden ver sus transferencias
CREATE POLICY "Users can view own transfers"
  ON wallet_transfers FOR SELECT
  USING (from_user = auth.uid() OR to_user = auth.uid());

-- Solo admins pueden ver el fondo de cobertura
CREATE POLICY "Only admins can view coverage fund"
  ON coverage_fund FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- Inserciones solo desde service role (Edge Functions)
-- No policies para INSERT - solo service_role puede insertar

-- 10. VISTAS ÚTILES
-- ============================================================================

-- Vista: Historial completo del usuario
CREATE OR REPLACE VIEW v_user_ledger_history AS
SELECT
  l.id,
  l.ts,
  l.user_id,
  l.kind,
  l.amount_cents,
  CASE
    WHEN l.kind IN ('deposit', 'transfer_in', 'refund', 'rental_payment', 'bonus') THEN l.amount_cents
    ELSE -l.amount_cents
  END as balance_change_cents,
  l.ref,
  l.meta,
  l.booking_id,
  l.transaction_id,
  l.created_at,
  -- Agregar información relacionada
  b.car_id,
  b.status as booking_status
FROM wallet_ledger l
LEFT JOIN bookings b ON l.booking_id = b.id
ORDER BY l.ts DESC;

-- Vista: Resumen de transferencias
CREATE OR REPLACE VIEW v_wallet_transfers_summary AS
SELECT
  t.id,
  t.from_user,
  pf.full_name as from_user_name,
  t.to_user,
  pt.full_name as to_user_name,
  t.amount_cents,
  t.status,
  t.ref,
  t.created_at,
  t.completed_at
FROM wallet_transfers t
LEFT JOIN profiles pf ON t.from_user = pf.id
LEFT JOIN profiles pt ON t.to_user = pt.id;

-- 11. ÍNDICES ADICIONALES PARA REPORTES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ledger_ts_kind ON wallet_ledger(ts DESC, kind);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON wallet_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON wallet_transfers(status) WHERE status != 'completed';

-- 12. GRANTS (Permisos)
-- ============================================================================

-- Service role puede hacer todo
GRANT ALL ON wallet_ledger TO service_role;
GRANT ALL ON wallet_transfers TO service_role;
GRANT ALL ON coverage_fund TO service_role;

-- Authenticated users solo pueden leer su data
GRANT SELECT ON wallet_ledger TO authenticated;
GRANT SELECT ON wallet_transfers TO authenticated;
GRANT SELECT ON v_user_ledger_history TO authenticated;
GRANT SELECT ON v_wallet_transfers_summary TO authenticated;

-- Ejecutar RPCs
GRANT EXECUTE ON FUNCTION wallet_transfer TO authenticated;
GRANT EXECUTE ON FUNCTION wallet_deposit_ledger TO service_role;
GRANT EXECUTE ON FUNCTION wallet_charge_rental TO service_role;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- COMENTARIOS FINALES
COMMENT ON TABLE wallet_ledger IS 'Libro mayor de todas las transacciones wallet (doble partida)';
COMMENT ON TABLE wallet_transfers IS 'Resumen de transferencias P2P entre usuarios';
COMMENT ON TABLE coverage_fund IS 'Fondo de cobertura para franquicias y seguros';
COMMENT ON FUNCTION apply_ledger_entry IS 'Trigger que aplica asientos del ledger a los saldos de wallets';
COMMENT ON FUNCTION wallet_transfer IS 'RPC para realizar transferencias internas entre usuarios';
COMMENT ON FUNCTION wallet_deposit_ledger IS 'RPC para registrar depósitos desde PSP (solo service_role)';
COMMENT ON FUNCTION wallet_charge_rental IS 'RPC para cobrar alquileres desde el wallet (solo service_role)';
