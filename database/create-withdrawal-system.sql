/**
 * Sistema de Retiros (Withdrawals) - AutoRenta
 *
 * Permite a los locadores retirar sus ganancias del wallet a sus cuentas bancarias
 * Integración con Mercado Pago Money Out para transferencias automáticas
 *
 * Flujo:
 * 1. Usuario registra cuenta bancaria (CBU/CVU/Alias)
 * 2. Usuario solicita retiro desde su wallet
 * 3. Sistema valida saldo disponible y límites
 * 4. Admin aprueba retiro (opcional, según configuración)
 * 5. Edge Function procesa transferencia con Mercado Pago
 * 6. Webhook confirma transferencia exitosa
 * 7. Fondos se debitan del wallet del usuario
 */

-- ============================================================================
-- TABLA: bank_accounts
-- Almacena las cuentas bancarias de los usuarios
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de cuenta
  account_type TEXT NOT NULL CHECK (account_type IN ('cbu', 'cvu', 'alias')),

  -- Datos de la cuenta
  account_number TEXT NOT NULL, -- CBU (22 dígitos) o CVU (22 dígitos) o Alias
  account_holder_name TEXT NOT NULL, -- Nombre del titular
  account_holder_document TEXT NOT NULL, -- DNI/CUIT del titular
  bank_name TEXT, -- Nombre del banco (opcional para CVU/alias)

  -- Verificación
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verification_method TEXT, -- 'manual', 'micro_deposit', 'mercadopago'

  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE, -- Cuenta por defecto para retiros

  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_account_per_user UNIQUE (user_id, account_number)
);

CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX idx_bank_accounts_is_default ON bank_accounts(user_id, is_default) WHERE is_default = TRUE;

COMMENT ON TABLE bank_accounts IS 'Cuentas bancarias de los usuarios para retiros';

-- ============================================================================
-- TABLA: withdrawal_requests
-- Solicitudes de retiro de fondos
-- ============================================================================

CREATE TYPE withdrawal_status AS ENUM (
  'pending',           -- Solicitud creada, esperando aprobación
  'approved',          -- Aprobada por admin, lista para procesar
  'processing',        -- En proceso de transferencia
  'completed',         -- Transferencia exitosa
  'failed',            -- Transferencia falló
  'rejected',          -- Rechazada por admin
  'cancelled'          -- Cancelada por usuario
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),

  -- Montos
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ARS',

  -- Comisión por retiro (puede variar según monto/método)
  fee_amount NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2) GENERATED ALWAYS AS (amount - fee_amount) STORED,

  -- Estado
  status withdrawal_status NOT NULL DEFAULT 'pending',

  -- Proveedores de pago
  provider TEXT DEFAULT 'mercadopago', -- 'mercadopago', 'manual', etc.
  provider_transaction_id TEXT, -- ID de transacción del proveedor
  provider_metadata JSONB, -- Metadatos adicionales del proveedor

  -- Aprobación
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Procesamiento
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Relación con wallet transaction
  wallet_transaction_id UUID, -- Se crea cuando se completa el retiro

  -- Notas
  user_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT positive_fee CHECK (fee_amount >= 0)
);

CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);

COMMENT ON TABLE withdrawal_requests IS 'Solicitudes de retiro de fondos del wallet';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Bank Accounts: Los usuarios solo ven sus propias cuentas
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank accounts"
ON bank_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank accounts"
ON bank_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank accounts"
ON bank_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank accounts"
ON bank_accounts FOR DELETE
USING (auth.uid() = user_id);

-- Withdrawal Requests: Los usuarios solo ven sus propias solicitudes
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal requests"
ON withdrawal_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawal requests"
ON withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending withdrawal requests"
ON withdrawal_requests FOR UPDATE
USING (
  auth.uid() = user_id
  AND status IN ('pending', 'approved')
);

-- Admins pueden ver y modificar todas las solicitudes
CREATE POLICY "Admins can view all withdrawal requests"
ON withdrawal_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = TRUE
  )
);

CREATE POLICY "Admins can update all withdrawal requests"
ON withdrawal_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = TRUE
  )
);

-- ============================================================================
-- FUNCIÓN: Calcular comisión de retiro
-- Según el monto, la comisión puede variar
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_withdrawal_fee(
  p_amount NUMERIC
)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- Comisión fija de Mercado Pago Money Out (ejemplo: 1.5%)
  -- Ajustar según las tarifas reales de MP
  RETURN ROUND(p_amount * 0.015, 2);

  -- Alternativa: Comisión escalonada
  -- IF p_amount <= 1000 THEN
  --   RETURN 15.00; -- Mínimo $15
  -- ELSIF p_amount <= 10000 THEN
  --   RETURN ROUND(p_amount * 0.015, 2); -- 1.5%
  -- ELSE
  --   RETURN ROUND(p_amount * 0.01, 2); -- 1% para montos grandes
  -- END IF;
END;
$$;

COMMENT ON FUNCTION calculate_withdrawal_fee IS
'Calcula la comisión por retiro según el monto (1.5% por defecto)';

-- ============================================================================
-- FUNCIÓN RPC: wallet_request_withdrawal
-- Crea una solicitud de retiro
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_request_withdrawal(
  p_bank_account_id UUID,
  p_amount NUMERIC,
  p_user_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  request_id UUID,
  fee_amount NUMERIC,
  net_amount NUMERIC,
  new_available_balance NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_current_balance NUMERIC;
  v_fee NUMERIC;
  v_request_id UUID;
  v_bank_account RECORD;
  v_non_withdrawable_floor NUMERIC := 0;
  v_withdrawable_balance NUMERIC := 0;
BEGIN
  -- Obtener user_id del usuario autenticado
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Usuario no autenticado', NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validar monto mínimo ($100 ARS)
  IF p_amount < 100 THEN
    RETURN QUERY SELECT FALSE, 'El monto mínimo de retiro es $100 ARS', NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validar cuenta bancaria
  SELECT * INTO v_bank_account
  FROM bank_accounts
  WHERE id = p_bank_account_id
    AND user_id = v_user_id
    AND is_active = TRUE;

  IF v_bank_account IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Cuenta bancaria no encontrada o inactiva', NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Obtener balance actual
  SELECT available_balance, non_withdrawable_floor
  INTO v_current_balance, v_non_withdrawable_floor
  FROM user_wallets
  WHERE user_id = v_user_id;

  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  IF v_non_withdrawable_floor IS NULL THEN
    v_non_withdrawable_floor := 0;
  END IF;

  v_withdrawable_balance := GREATEST(v_current_balance - v_non_withdrawable_floor, 0);

  -- Calcular comisión
  v_fee := calculate_withdrawal_fee(p_amount);

  -- Validar saldo suficiente (monto + comisión)
  IF v_withdrawable_balance < (p_amount + v_fee) THEN
    RETURN QUERY SELECT
      FALSE,
      'Saldo retirabile insuficiente. Disponible para retiro: $' || v_withdrawable_balance || ', Necesario: $' || (p_amount + v_fee) || ' (incluye comisión de $' || v_fee || ')',
      NULL::UUID,
      v_fee,
      (p_amount - v_fee),
      v_current_balance;
    RETURN;
  END IF;

  -- Crear solicitud de retiro
  INSERT INTO withdrawal_requests (
    user_id,
    bank_account_id,
    amount,
    fee_amount,
    status,
    user_notes
  ) VALUES (
    v_user_id,
    p_bank_account_id,
    p_amount,
    v_fee,
    'pending',
    p_user_notes
  ) RETURNING id INTO v_request_id;

  -- Retornar éxito
  RETURN QUERY SELECT
    TRUE,
    'Solicitud de retiro creada exitosamente. Será procesada en breve.',
    v_request_id,
    v_fee,
    (p_amount - v_fee),
    v_current_balance;
END;
$$;

COMMENT ON FUNCTION wallet_request_withdrawal IS
'Crea una solicitud de retiro validando saldo y comisiones';

-- ============================================================================
-- FUNCIÓN RPC: wallet_approve_withdrawal
-- Aprueba una solicitud de retiro (admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_approve_withdrawal(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  provider TEXT,
  amount NUMERIC,
  recipient TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
  v_bank_account RECORD;
BEGIN
  -- Verificar que el usuario sea admin
  v_admin_id := auth.uid();

  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RETURN QUERY SELECT FALSE, 'No tienes permisos para aprobar retiros', NULL::TEXT, 0::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;

  -- Obtener solicitud
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Solicitud no encontrada', NULL::TEXT, 0::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, 'La solicitud no está en estado pendiente (estado actual: ' || v_request.status || ')', NULL::TEXT, 0::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;

  -- Obtener datos de cuenta bancaria
  SELECT * INTO v_bank_account
  FROM bank_accounts
  WHERE id = v_request.bank_account_id;

  -- Actualizar estado a aprobado
  UPDATE withdrawal_requests
  SET
    status = 'approved',
    approved_by = v_admin_id,
    approved_at = NOW(),
    admin_notes = p_admin_notes,
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Retornar datos para procesar con Edge Function
  RETURN QUERY SELECT
    TRUE,
    'Solicitud aprobada. Procesando transferencia...',
    v_request.provider,
    v_request.net_amount,
    v_bank_account.account_number;
END;
$$;

COMMENT ON FUNCTION wallet_approve_withdrawal IS
'Aprueba una solicitud de retiro (solo admins). Prepara datos para Edge Function.';

-- ============================================================================
-- FUNCIÓN RPC: wallet_complete_withdrawal
-- Completa un retiro después de que la transferencia fue exitosa
-- Llamada por Edge Function después del webhook de MP
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_complete_withdrawal(
  p_request_id UUID,
  p_provider_transaction_id TEXT,
  p_provider_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  wallet_transaction_id UUID
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request RECORD;
  v_transaction_id UUID;
  v_total_debit NUMERIC;
BEGIN
  -- Obtener solicitud
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Solicitud no encontrada', NULL::UUID;
    RETURN;
  END IF;

  IF v_request.status NOT IN ('approved', 'processing') THEN
    RETURN QUERY SELECT FALSE, 'La solicitud no puede completarse (estado: ' || v_request.status || ')', NULL::UUID;
    RETURN;
  END IF;

  -- Calcular total a debitar (monto + comisión)
  v_total_debit := v_request.amount + v_request.fee_amount;

  -- Crear transacción de wallet (debitar fondos)
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    reference_type,
    reference_id,
    provider,
    provider_transaction_id,
    provider_metadata
  ) VALUES (
    v_request.user_id,
    'withdrawal',
    v_total_debit,
    v_request.currency,
    'completed',
    'Retiro a cuenta bancaria: $' || v_request.net_amount || ' (comisión: $' || v_request.fee_amount || ')',
    'deposit',
    p_request_id,
    v_request.provider,
    p_provider_transaction_id,
    p_provider_metadata
  ) RETURNING id INTO v_transaction_id;

  -- Debitar fondos del wallet
  UPDATE user_wallets
  SET
    available_balance = available_balance - v_total_debit,
    updated_at = NOW()
  WHERE user_id = v_request.user_id;

  -- Actualizar solicitud a completada
  UPDATE withdrawal_requests
  SET
    status = 'completed',
    wallet_transaction_id = v_transaction_id,
    provider_transaction_id = p_provider_transaction_id,
    provider_metadata = p_provider_metadata,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN QUERY SELECT
    TRUE,
    'Retiro completado exitosamente. $' || v_request.net_amount || ' transferido.',
    v_transaction_id;
END;
$$;

COMMENT ON FUNCTION wallet_complete_withdrawal IS
'Completa un retiro después de transferencia exitosa. Debita fondos del wallet.';

-- ============================================================================
-- FUNCIÓN RPC: wallet_fail_withdrawal
-- Marca un retiro como fallido
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_fail_withdrawal(
  p_request_id UUID,
  p_failure_reason TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE withdrawal_requests
  SET
    status = 'failed',
    failure_reason = p_failure_reason,
    failed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Retiro marcado como fallido: ' || p_failure_reason;
  ELSE
    RETURN QUERY SELECT FALSE, 'Solicitud no encontrada';
  END IF;
END;
$$;

COMMENT ON FUNCTION wallet_fail_withdrawal IS
'Marca un retiro como fallido cuando la transferencia no se pudo procesar';

-- ============================================================================
-- FUNCIÓN: Actualizar default bank account
-- ============================================================================

CREATE OR REPLACE FUNCTION set_default_bank_account(
  p_bank_account_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Quitar default de todas las cuentas del usuario
  UPDATE bank_accounts
  SET is_default = FALSE
  WHERE user_id = v_user_id;

  -- Marcar la cuenta seleccionada como default
  UPDATE bank_accounts
  SET is_default = TRUE
  WHERE id = p_bank_account_id AND user_id = v_user_id;

  RETURN FOUND;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at en bank_accounts
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bank_accounts_updated_at
BEFORE UPDATE ON bank_accounts
FOR EACH ROW
EXECUTE FUNCTION update_bank_accounts_updated_at();

-- Trigger para actualizar updated_at en withdrawal_requests
CREATE OR REPLACE FUNCTION update_withdrawal_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_withdrawal_requests_updated_at
BEFORE UPDATE ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION update_withdrawal_requests_updated_at();
