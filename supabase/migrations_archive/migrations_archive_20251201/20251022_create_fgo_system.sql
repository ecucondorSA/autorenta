-- ============================================================================
-- AUTORENTAR - SISTEMA DE FONDO DE GARANTÍA OPERATIVA (FGO)
-- ============================================================================
-- Implementación contable del FGO según política v1.0
--
-- OBJETIVO:
-- Separar y rastrear el dinero del FGO de la operación general, asegurando:
-- - Trazabilidad completa de aportes y usos
-- - Cálculo automático de métricas (RC, LR)
-- - Segregación en subfondos (Liquidez, Capitalización, Rentabilidad)
-- - Auditoría en tiempo real
-- ============================================================================

-- 1. CREAR TABLA DE SUBFONDOS DEL FGO
-- ============================================================================

CREATE TABLE IF NOT EXISTS fgo_subfunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de subfondo
  subfund_type TEXT NOT NULL CHECK (subfund_type IN ('liquidity', 'capitalization', 'profitability')),

  -- Saldos (en centavos)
  balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),

  -- Metadata y configuración
  meta JSONB NOT NULL DEFAULT '{}',

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Solo un registro por tipo de subfondo
  UNIQUE(subfund_type)
);

-- Insertar los tres subfondos iniciales
INSERT INTO fgo_subfunds (subfund_type, balance_cents, meta)
VALUES
  ('liquidity', 0, '{"description": "Pagos inmediatos, siniestros, devoluciones", "purpose": "Efectivo disponible"}'::jsonb),
  ('capitalization', 0, '{"description": "Compras de autos, inversiones temporales", "purpose": "Activo productivo"}'::jsonb),
  ('profitability', 0, '{"description": "Intereses o excedentes", "purpose": "Resultado diferido"}'::jsonb)
ON CONFLICT (subfund_type) DO NOTHING;

-- 2. CREAR TABLA DE MOVIMIENTOS DEL FGO
-- ============================================================================

CREATE TABLE IF NOT EXISTS fgo_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamp
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Tipo de movimiento
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'user_contribution',    -- Aporte de usuario (α%)
    'siniestro_payment',    -- Pago de siniestro
    'franchise_payment',    -- Pago de franquicia
    'capitalization',       -- Transferencia a capitalización
    'return_to_user',       -- Devolución a usuario
    'interest_earned',      -- Intereses ganados
    'adjustment'            -- Ajuste manual (admin)
  )),

  -- Subfondo afectado
  subfund_type TEXT NOT NULL REFERENCES fgo_subfunds(subfund_type),

  -- Monto (en centavos, siempre positivo)
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),

  -- Tipo de operación (crédito o débito)
  operation TEXT NOT NULL CHECK (operation IN ('credit', 'debit')),

  -- Usuario relacionado (si aplica)
  user_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Booking relacionado (si aplica)
  booking_id UUID REFERENCES bookings(id),

  -- Transacción de wallet relacionada (si aplica)
  wallet_ledger_id UUID REFERENCES wallet_ledger(id),

  -- Referencia única (idempotencia)
  ref VARCHAR(128) NOT NULL UNIQUE,

  -- Metadata
  meta JSONB NOT NULL DEFAULT '{}',

  -- Auditoría
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_fgo_movements_ts ON fgo_movements(ts DESC);
CREATE INDEX IF NOT EXISTS idx_fgo_movements_subfund ON fgo_movements(subfund_type, ts DESC);
CREATE INDEX IF NOT EXISTS idx_fgo_movements_type ON fgo_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_fgo_movements_user ON fgo_movements(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fgo_movements_booking ON fgo_movements(booking_id) WHERE booking_id IS NOT NULL;

-- 3. CREAR TABLA DE MÉTRICAS DEL FGO
-- ============================================================================

CREATE TABLE IF NOT EXISTS fgo_metrics (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),  -- Fila única (singleton)

  -- Parámetros configurables
  alpha_percentage DECIMAL(5,2) NOT NULL DEFAULT 15.00 CHECK (alpha_percentage >= 0 AND alpha_percentage <= 100),
  target_months_coverage INT NOT NULL DEFAULT 12 CHECK (target_months_coverage > 0),

  -- Métricas calculadas (actualizadas por trigger)
  total_contributions_cents BIGINT NOT NULL DEFAULT 0,
  total_siniestros_paid_cents BIGINT NOT NULL DEFAULT 0,
  total_siniestros_count INT NOT NULL DEFAULT 0,

  -- Ratio de Cobertura (RC) = Total FGO / (12 × siniestros mensuales promedio)
  coverage_ratio DECIMAL(10,4),

  -- Loss Ratio (LR) = Siniestros pagados / Total aportes
  loss_ratio DECIMAL(10,4),

  -- Meta de saldo (calculada)
  target_balance_cents BIGINT,

  -- Estado del fondo
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical')),

  -- Última actualización
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  meta JSONB NOT NULL DEFAULT '{}'
);

-- Insertar fila única con valores iniciales
INSERT INTO fgo_metrics (id, alpha_percentage, target_months_coverage, meta)
VALUES (TRUE, 15.00, 12, '{"initial_date": "2025-10-22", "policy_version": "v1.0"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. FUNCIÓN: APLICAR MOVIMIENTO DEL FGO (Trigger)
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_fgo_movement()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance BIGINT;
BEGIN
  -- CRÉDITO: Incrementar saldo del subfondo
  IF NEW.operation = 'credit' THEN
    UPDATE fgo_subfunds
    SET
      balance_cents = balance_cents + NEW.amount_cents,
      updated_at = NOW()
    WHERE subfund_type = NEW.subfund_type
    RETURNING balance_cents INTO current_balance;

    RAISE NOTICE 'FGO subfund % credited % cents. New balance: %',
      NEW.subfund_type, NEW.amount_cents, current_balance;

  -- DÉBITO: Decrementar saldo del subfondo
  ELSIF NEW.operation = 'debit' THEN
    -- Verificar saldo suficiente
    SELECT balance_cents INTO current_balance
    FROM fgo_subfunds
    WHERE subfund_type = NEW.subfund_type
    FOR UPDATE;  -- Lock pesimista

    IF current_balance < NEW.amount_cents THEN
      RAISE EXCEPTION 'Insufficient balance in FGO subfund %. Balance: %, Required: %',
        NEW.subfund_type, current_balance, NEW.amount_cents;
    END IF;

    UPDATE fgo_subfunds
    SET
      balance_cents = balance_cents - NEW.amount_cents,
      updated_at = NOW()
    WHERE subfund_type = NEW.subfund_type
    RETURNING balance_cents INTO current_balance;

    RAISE NOTICE 'FGO subfund % debited % cents. New balance: %',
      NEW.subfund_type, NEW.amount_cents, current_balance;
  END IF;

  -- Actualizar balance total del coverage_fund (compatibilidad)
  UPDATE coverage_fund
  SET
    balance_cents = (SELECT SUM(balance_cents) FROM fgo_subfunds),
    updated_at = NOW()
  WHERE id = TRUE;

  RETURN NEW;
END;
$$;

-- Trigger: aplicar movimiento después de cada inserción
DROP TRIGGER IF EXISTS tg_apply_fgo_movement ON fgo_movements;
CREATE TRIGGER tg_apply_fgo_movement
  AFTER INSERT ON fgo_movements
  FOR EACH ROW
  EXECUTE FUNCTION apply_fgo_movement();

-- 5. FUNCIÓN: CALCULAR MÉTRICAS DEL FGO
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_fgo_metrics()
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_contributions BIGINT;
  v_total_siniestros_paid BIGINT;
  v_total_siniestros_count INT;
  v_avg_siniestro_cents BIGINT;
  v_target_balance BIGINT;
  v_current_balance BIGINT;
  v_coverage_ratio DECIMAL(10,4);
  v_loss_ratio DECIMAL(10,4);
  v_status TEXT;
  v_target_months INT;
BEGIN
  -- Obtener parámetros
  SELECT target_months_coverage INTO v_target_months
  FROM fgo_metrics
  WHERE id = TRUE;

  -- Calcular total de aportes
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_contributions
  FROM fgo_movements
  WHERE movement_type = 'user_contribution' AND operation = 'credit';

  -- Calcular total de siniestros pagados
  SELECT
    COALESCE(SUM(amount_cents), 0),
    COUNT(*)
  INTO v_total_siniestros_paid, v_total_siniestros_count
  FROM fgo_movements
  WHERE movement_type IN ('siniestro_payment', 'franchise_payment') AND operation = 'debit';

  -- Calcular promedio de siniestro
  IF v_total_siniestros_count > 0 THEN
    v_avg_siniestro_cents := v_total_siniestros_paid / v_total_siniestros_count;
  ELSE
    v_avg_siniestro_cents := 0;
  END IF;

  -- Calcular meta de saldo (12 meses × promedio de siniestros)
  v_target_balance := v_avg_siniestro_cents * v_target_months;

  -- Obtener saldo actual total del FGO
  SELECT COALESCE(SUM(balance_cents), 0) INTO v_current_balance
  FROM fgo_subfunds;

  -- Calcular Coverage Ratio (RC)
  IF v_target_balance > 0 THEN
    v_coverage_ratio := v_current_balance::DECIMAL / v_target_balance::DECIMAL;
  ELSE
    v_coverage_ratio := NULL;  -- No hay suficiente historial
  END IF;

  -- Calcular Loss Ratio (LR)
  IF v_total_contributions > 0 THEN
    v_loss_ratio := v_total_siniestros_paid::DECIMAL / v_total_contributions::DECIMAL;
  ELSE
    v_loss_ratio := 0;
  END IF;

  -- Determinar estado del fondo
  IF v_coverage_ratio IS NULL THEN
    v_status := 'healthy';  -- No hay suficiente historial
  ELSIF v_coverage_ratio >= 1.0 THEN
    v_status := 'healthy';
  ELSIF v_coverage_ratio >= 0.7 THEN
    v_status := 'warning';
  ELSE
    v_status := 'critical';
  END IF;

  -- Actualizar métricas
  UPDATE fgo_metrics
  SET
    total_contributions_cents = v_total_contributions,
    total_siniestros_paid_cents = v_total_siniestros_paid,
    total_siniestros_count = v_total_siniestros_count,
    coverage_ratio = v_coverage_ratio,
    loss_ratio = v_loss_ratio,
    target_balance_cents = v_target_balance,
    status = v_status,
    last_calculated_at = NOW(),
    updated_at = NOW()
  WHERE id = TRUE;

  -- Retornar resumen
  RETURN jsonb_build_object(
    'current_balance_cents', v_current_balance,
    'target_balance_cents', v_target_balance,
    'total_contributions_cents', v_total_contributions,
    'total_siniestros_paid_cents', v_total_siniestros_paid,
    'total_siniestros_count', v_total_siniestros_count,
    'coverage_ratio', v_coverage_ratio,
    'loss_ratio', v_loss_ratio,
    'status', v_status,
    'last_calculated_at', NOW()
  );
END;
$$;

-- 6. FUNCIÓN RPC: APORTAR AL FGO (desde depósito de usuario)
-- ============================================================================

CREATE OR REPLACE FUNCTION fgo_contribute_from_deposit(
  p_user_id UUID,
  p_deposit_amount_cents BIGINT,
  p_wallet_ledger_id UUID,
  p_ref VARCHAR DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_alpha DECIMAL(5,2);
  v_contribution_cents BIGINT;
  v_movement_id UUID;
  v_ref VARCHAR(128);
BEGIN
  -- Obtener α actual
  SELECT alpha_percentage INTO v_alpha
  FROM fgo_metrics
  WHERE id = TRUE;

  -- Calcular aporte (α% del depósito)
  v_contribution_cents := FLOOR(p_deposit_amount_cents * v_alpha / 100);

  -- Generar referencia única si no se proporcionó
  IF p_ref IS NULL THEN
    v_ref := 'fgo-contrib-' || p_wallet_ledger_id;
  ELSE
    v_ref := p_ref;
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM fgo_movements WHERE ref = v_ref) THEN
    SELECT id INTO v_movement_id FROM fgo_movements WHERE ref = v_ref;
    RETURN jsonb_build_object(
      'ok', true,
      'movement_id', v_movement_id,
      'ref', v_ref,
      'status', 'duplicate'
    );
  END IF;

  -- Registrar movimiento al subfondo de liquidez
  INSERT INTO fgo_movements (
    movement_type,
    subfund_type,
    amount_cents,
    operation,
    user_id,
    wallet_ledger_id,
    ref,
    meta
  )
  VALUES (
    'user_contribution',
    'liquidity',
    v_contribution_cents,
    'credit',
    p_user_id,
    p_wallet_ledger_id,
    v_ref,
    jsonb_build_object(
      'deposit_amount_cents', p_deposit_amount_cents,
      'alpha_percentage', v_alpha
    )
  )
  RETURNING id INTO v_movement_id;

  -- Recalcular métricas
  PERFORM calculate_fgo_metrics();

  RETURN jsonb_build_object(
    'ok', true,
    'movement_id', v_movement_id,
    'ref', v_ref,
    'contribution_cents', v_contribution_cents,
    'alpha_percentage', v_alpha,
    'deposit_amount_cents', p_deposit_amount_cents
  );
END;
$$;

-- 7. FUNCIÓN RPC: PAGAR SINIESTRO DESDE FGO
-- ============================================================================

CREATE OR REPLACE FUNCTION fgo_pay_siniestro(
  p_booking_id UUID,
  p_amount_cents BIGINT,
  p_description TEXT,
  p_ref VARCHAR DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_movement_id UUID;
  v_ref VARCHAR(128);
  v_current_balance BIGINT;
BEGIN
  -- Generar referencia única si no se proporcionó
  IF p_ref IS NULL THEN
    v_ref := 'fgo-siniestro-' || p_booking_id || '-' || gen_random_uuid();
  ELSE
    v_ref := p_ref;
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM fgo_movements WHERE ref = v_ref) THEN
    SELECT id INTO v_movement_id FROM fgo_movements WHERE ref = v_ref;
    RETURN jsonb_build_object(
      'ok', true,
      'movement_id', v_movement_id,
      'ref', v_ref,
      'status', 'duplicate'
    );
  END IF;

  -- Verificar saldo suficiente en liquidez
  SELECT balance_cents INTO v_current_balance
  FROM fgo_subfunds
  WHERE subfund_type = 'liquidity';

  IF v_current_balance < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance in FGO liquidity subfund. Balance: %, Required: %',
      v_current_balance, p_amount_cents;
  END IF;

  -- Registrar pago de siniestro (débito del subfondo de liquidez)
  INSERT INTO fgo_movements (
    movement_type,
    subfund_type,
    amount_cents,
    operation,
    booking_id,
    ref,
    meta
  )
  VALUES (
    'siniestro_payment',
    'liquidity',
    p_amount_cents,
    'debit',
    p_booking_id,
    v_ref,
    jsonb_build_object('description', p_description)
  )
  RETURNING id INTO v_movement_id;

  -- Recalcular métricas
  PERFORM calculate_fgo_metrics();

  RETURN jsonb_build_object(
    'ok', true,
    'movement_id', v_movement_id,
    'ref', v_ref,
    'amount_cents', p_amount_cents,
    'previous_balance', v_current_balance,
    'new_balance', v_current_balance - p_amount_cents
  );
END;
$$;

-- 8. FUNCIÓN RPC: TRANSFERIR ENTRE SUBFONDOS
-- ============================================================================

CREATE OR REPLACE FUNCTION fgo_transfer_between_subfunds(
  p_from_subfund TEXT,
  p_to_subfund TEXT,
  p_amount_cents BIGINT,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ref VARCHAR(128);
  v_debit_id UUID;
  v_credit_id UUID;
BEGIN
  -- Validaciones
  IF p_from_subfund = p_to_subfund THEN
    RAISE EXCEPTION 'Cannot transfer to same subfund';
  END IF;

  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Verificar que el admin es realmente admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Only admins can transfer between subfunds';
  END IF;

  -- Generar referencia única
  v_ref := 'fgo-transfer-' || gen_random_uuid();

  -- Débito del subfondo origen
  INSERT INTO fgo_movements (
    movement_type,
    subfund_type,
    amount_cents,
    operation,
    ref,
    meta,
    created_by
  )
  VALUES (
    'adjustment',
    p_from_subfund,
    p_amount_cents,
    'debit',
    v_ref || '-out',
    jsonb_build_object(
      'reason', p_reason,
      'to_subfund', p_to_subfund
    ),
    p_admin_id
  )
  RETURNING id INTO v_debit_id;

  -- Crédito al subfondo destino
  INSERT INTO fgo_movements (
    movement_type,
    subfund_type,
    amount_cents,
    operation,
    ref,
    meta,
    created_by
  )
  VALUES (
    'adjustment',
    p_to_subfund,
    p_amount_cents,
    'credit',
    v_ref || '-in',
    jsonb_build_object(
      'reason', p_reason,
      'from_subfund', p_from_subfund
    ),
    p_admin_id
  )
  RETURNING id INTO v_credit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ref', v_ref,
    'debit_movement_id', v_debit_id,
    'credit_movement_id', v_credit_id,
    'from_subfund', p_from_subfund,
    'to_subfund', p_to_subfund,
    'amount_cents', p_amount_cents
  );
END;
$$;

-- 9. VISTAS ÚTILES
-- ============================================================================

-- Vista: Estado completo del FGO
CREATE OR REPLACE VIEW v_fgo_status AS
SELECT
  -- Subfondos
  (SELECT balance_cents FROM fgo_subfunds WHERE subfund_type = 'liquidity') as liquidity_balance_cents,
  (SELECT balance_cents FROM fgo_subfunds WHERE subfund_type = 'capitalization') as capitalization_balance_cents,
  (SELECT balance_cents FROM fgo_subfunds WHERE subfund_type = 'profitability') as profitability_balance_cents,
  -- Total
  (SELECT SUM(balance_cents) FROM fgo_subfunds) as total_fgo_balance_cents,
  -- Métricas
  m.alpha_percentage,
  m.target_months_coverage,
  m.total_contributions_cents,
  m.total_siniestros_paid_cents,
  m.total_siniestros_count,
  m.coverage_ratio,
  m.loss_ratio,
  m.target_balance_cents,
  m.status,
  m.last_calculated_at,
  m.updated_at
FROM fgo_metrics m
WHERE m.id = TRUE;

-- Vista: Historial de movimientos del FGO con detalles
CREATE OR REPLACE VIEW v_fgo_movements_detailed AS
SELECT
  fm.id,
  fm.ts,
  fm.movement_type,
  fm.subfund_type,
  fm.amount_cents,
  fm.operation,
  CASE
    WHEN fm.operation = 'credit' THEN fm.amount_cents
    ELSE -fm.amount_cents
  END as balance_change_cents,
  fm.ref,
  fm.user_id,
  p.full_name as user_name,
  fm.booking_id,
  b.car_id,
  fm.wallet_ledger_id,
  fm.created_by,
  admin.full_name as created_by_name,
  fm.meta,
  fm.created_at
FROM fgo_movements fm
LEFT JOIN profiles p ON fm.user_id = p.id
LEFT JOIN profiles admin ON fm.created_by = admin.id
LEFT JOIN bookings b ON fm.booking_id = b.id
ORDER BY fm.ts DESC;

-- Vista: Resumen mensual del FGO
CREATE OR REPLACE VIEW v_fgo_monthly_summary AS
SELECT
  DATE_TRUNC('month', ts) as month,
  movement_type,
  subfund_type,
  COUNT(*) as movement_count,
  SUM(CASE WHEN operation = 'credit' THEN amount_cents ELSE 0 END) as total_credits_cents,
  SUM(CASE WHEN operation = 'debit' THEN amount_cents ELSE 0 END) as total_debits_cents,
  SUM(CASE WHEN operation = 'credit' THEN amount_cents ELSE -amount_cents END) as net_change_cents
FROM fgo_movements
GROUP BY DATE_TRUNC('month', ts), movement_type, subfund_type
ORDER BY month DESC, subfund_type, movement_type;

-- 10. RLS POLICIES
-- ============================================================================

ALTER TABLE fgo_subfunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE fgo_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE fgo_metrics ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver subfondos
CREATE POLICY "Only admins can view FGO subfunds"
  ON fgo_subfunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- Solo admins pueden ver movimientos del FGO
CREATE POLICY "Only admins can view FGO movements"
  ON fgo_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- Solo admins pueden ver métricas del FGO
CREATE POLICY "Only admins can view FGO metrics"
  ON fgo_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- 11. GRANTS (Permisos)
-- ============================================================================

-- Service role puede hacer todo
GRANT ALL ON fgo_subfunds TO service_role;
GRANT ALL ON fgo_movements TO service_role;
GRANT ALL ON fgo_metrics TO service_role;

-- Authenticated users con rol admin pueden leer
GRANT SELECT ON fgo_subfunds TO authenticated;
GRANT SELECT ON fgo_movements TO authenticated;
GRANT SELECT ON fgo_metrics TO authenticated;
GRANT SELECT ON v_fgo_status TO authenticated;
GRANT SELECT ON v_fgo_movements_detailed TO authenticated;
GRANT SELECT ON v_fgo_monthly_summary TO authenticated;

-- Ejecutar RPCs
GRANT EXECUTE ON FUNCTION calculate_fgo_metrics TO service_role;
GRANT EXECUTE ON FUNCTION fgo_contribute_from_deposit TO service_role;
GRANT EXECUTE ON FUNCTION fgo_pay_siniestro TO service_role;
GRANT EXECUTE ON FUNCTION fgo_transfer_between_subfunds TO authenticated;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

COMMENT ON TABLE fgo_subfunds IS 'Subfondos del FGO: Liquidez, Capitalización, Rentabilidad';
COMMENT ON TABLE fgo_movements IS 'Movimientos contables del FGO con trazabilidad completa';
COMMENT ON TABLE fgo_metrics IS 'Métricas calculadas del FGO (RC, LR, estado)';
COMMENT ON FUNCTION calculate_fgo_metrics IS 'Recalcula métricas del FGO (RC, LR, estado)';
COMMENT ON FUNCTION fgo_contribute_from_deposit IS 'Registra aporte al FGO desde depósito de usuario (α%)';
COMMENT ON FUNCTION fgo_pay_siniestro IS 'Paga siniestro desde subfondo de liquidez';
COMMENT ON FUNCTION fgo_transfer_between_subfunds IS 'Transfiere fondos entre subfondos (solo admins)';
