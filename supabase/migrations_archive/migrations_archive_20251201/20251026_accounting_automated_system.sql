-- =====================================================
-- SISTEMA CONTABLE CÍCLICO AUTOMATIZADO - AUTORENTAR
-- Basado en NIIF 15 (Reconocimiento de ingresos) y NIIF 37 (Provisiones)
-- =====================================================

-- 1. PLAN DE CUENTAS AUTOMATIZADO
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
  sub_type VARCHAR(100) NOT NULL,
  is_control_account BOOLEAN DEFAULT false,
  parent_account_id UUID REFERENCES accounting_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LIBRO DIARIO (JOURNAL) - Partida Doble
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_type VARCHAR(100) NOT NULL,
  reference_id UUID,
  reference_table VARCHAR(100),
  description TEXT NOT NULL,
  total_debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,
  status VARCHAR(20) DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'VOIDED')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ
);

-- 3. LIBRO MAYOR (LEDGER) - Detalle de Movimientos
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES accounting_journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounting_accounts(id),
  entry_date TIMESTAMPTZ NOT NULL,
  transaction_type VARCHAR(100) NOT NULL,
  description TEXT,
  debit_amount DECIMAL(15, 2) DEFAULT 0,
  credit_amount DECIMAL(15, 2) DEFAULT 0,
  reference_id UUID,
  reference_table VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROVISIONES (NIIF 37) - FGO, Depósitos, Siniestros
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_provisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provision_type VARCHAR(50) NOT NULL CHECK (provision_type IN ('FGO_RESERVE', 'SECURITY_DEPOSIT', 'CLAIMS_RESERVE', 'WALLET_LIABILITY')),
  reference_id UUID,
  reference_table VARCHAR(100),
  provision_amount DECIMAL(15, 2) NOT NULL,
  utilized_amount DECIMAL(15, 2) DEFAULT 0,
  released_amount DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) GENERATED ALWAYS AS (provision_amount - utilized_amount - released_amount) STORED,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UTILIZED', 'RELEASED', 'EXPIRED')),
  provision_date TIMESTAMPTZ DEFAULT NOW(),
  release_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BALANCES PERIÓDICOS (Snapshot Mensual)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_period_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period VARCHAR(7) NOT NULL, -- YYYY-MM
  account_id UUID NOT NULL REFERENCES accounting_accounts(id),
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  period_debits DECIMAL(15, 2) DEFAULT 0,
  period_credits DECIMAL(15, 2) DEFAULT 0,
  closing_balance DECIMAL(15, 2) DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period, account_id)
);

-- =====================================================
-- INSERTAR PLAN DE CUENTAS NIIF
-- =====================================================

INSERT INTO accounting_accounts (code, name, account_type, sub_type, is_control_account) VALUES
-- ACTIVOS
('1100', 'Caja y Bancos', 'ASSET', 'ACTIVO_CORRIENTE', true),
('1101', 'Cuenta Corriente Banco', 'ASSET', 'ACTIVO_CORRIENTE', false),
('1102', 'MercadoPago - Cuenta Disponible', 'ASSET', 'ACTIVO_CORRIENTE', false),
('1103', 'MercadoPago - Cuenta Retenida', 'ASSET', 'ACTIVO_CORRIENTE', false),
('1200', 'Cuentas por Cobrar', 'ASSET', 'ACTIVO_CORRIENTE', true),
('1201', 'Comisiones por Cobrar', 'ASSET', 'ACTIVO_CORRIENTE', false),

-- PASIVOS
('2100', 'Pasivos por Contratos con Clientes', 'LIABILITY', 'PASIVO_CORRIENTE', true),
('2101', 'Depósitos de Clientes (Billetera)', 'LIABILITY', 'PASIVO_CORRIENTE', false),
('2102', 'Depósitos de Garantía (Franquicias)', 'LIABILITY', 'PASIVO_CORRIENTE', false),
('2200', 'Provisiones (NIIF 37)', 'LIABILITY', 'PASIVO_CORRIENTE', true),
('2201', 'Provisión FGO - Fondo de Garantía', 'LIABILITY', 'PASIVO_CORRIENTE', false),
('2202', 'Provisión para Siniestros', 'LIABILITY', 'PASIVO_CORRIENTE', false),
('2300', 'Cuentas por Pagar', 'LIABILITY', 'PASIVO_CORRIENTE', true),
('2301', 'Por Pagar a Propietarios', 'LIABILITY', 'PASIVO_CORRIENTE', false),
('2302', 'Comisiones MercadoPago por Pagar', 'LIABILITY', 'PASIVO_CORRIENTE', false),

-- PATRIMONIO
('3100', 'Capital Social', 'EQUITY', 'PATRIMONIO', false),
('3200', 'Reservas', 'EQUITY', 'PATRIMONIO', true),
('3201', 'Reserva Legal', 'EQUITY', 'PATRIMONIO', false),
('3300', 'Resultados Acumulados', 'EQUITY', 'PATRIMONIO', false),
('3400', 'Resultado del Ejercicio', 'EQUITY', 'PATRIMONIO', false),

-- INGRESOS (Solo comisiones según NIIF 15 - Agente)
('4100', 'Ingresos por Comisiones', 'INCOME', 'INGRESO_OPERACIONAL', true),
('4101', 'Comisión por Alquiler', 'INCOME', 'INGRESO_OPERACIONAL', false),
('4102', 'Comisión por Seguro', 'INCOME', 'INGRESO_OPERACIONAL', false),
('4200', 'Otros Ingresos', 'INCOME', 'INGRESO_NO_OPERACIONAL', true),
('4201', 'Intereses Generados', 'INCOME', 'INGRESO_NO_OPERACIONAL', false),
('4202', 'Penalidades Cobradas', 'INCOME', 'INGRESO_NO_OPERACIONAL', false),

-- GASTOS
('5100', 'Gastos Operacionales', 'EXPENSE', 'GASTO_OPERACIONAL', true),
('5101', 'Comisiones Pagadas (MercadoPago)', 'EXPENSE', 'GASTO_OPERACIONAL', false),
('5102', 'Gastos de Verificación', 'EXPENSE', 'GASTO_OPERACIONAL', false),
('5103', 'Gastos de Marketing', 'EXPENSE', 'GASTO_OPERACIONAL', false),
('5200', 'Gastos Administrativos', 'EXPENSE', 'GASTO_OPERACIONAL', true),
('5201', 'Salarios y Honorarios', 'EXPENSE', 'GASTO_OPERACIONAL', false),
('5202', 'Servicios Cloud (Supabase, etc)', 'EXPENSE', 'GASTO_OPERACIONAL', false),
('5300', 'Gastos por Siniestros', 'EXPENSE', 'GASTO_OPERACIONAL', true),
('5301', 'Siniestros Cubiertos por FGO', 'EXPENSE', 'GASTO_OPERACIONAL', false)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- FUNCIÓN: CREAR ASIENTO CONTABLE AUTOMÁTICO
-- =====================================================

CREATE OR REPLACE FUNCTION create_journal_entry(
  p_transaction_type VARCHAR,
  p_reference_id UUID,
  p_reference_table VARCHAR,
  p_description TEXT,
  p_entries JSONB -- [{ account_code, debit, credit, description }]
) RETURNS UUID AS $$
DECLARE
  v_journal_id UUID;
  v_entry_number VARCHAR;
  v_total_debit DECIMAL(15, 2) := 0;
  v_total_credit DECIMAL(15, 2) := 0;
  v_entry JSONB;
  v_account_id UUID;
BEGIN
  -- Generar número de asiento
  v_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0');

  -- Calcular totales
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_total_debit := v_total_debit + COALESCE((v_entry->>'debit')::DECIMAL, 0);
    v_total_credit := v_total_credit + COALESCE((v_entry->>'credit')::DECIMAL, 0);
  END LOOP;

  -- Validar balance
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Asiento desbalanceado: Debe % != Haber %', v_total_debit, v_total_credit;
  END IF;

  -- Crear entrada en journal
  INSERT INTO accounting_journal_entries (
    entry_number, transaction_type, reference_id, reference_table,
    description, total_debit, total_credit, status, posted_at
  ) VALUES (
    v_entry_number, p_transaction_type, p_reference_id, p_reference_table,
    p_description, v_total_debit, v_total_credit, 'POSTED', NOW()
  ) RETURNING id INTO v_journal_id;

  -- Crear líneas en ledger
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    -- Obtener account_id
    SELECT id INTO v_account_id
    FROM accounting_accounts
    WHERE code = (v_entry->>'account_code')
    AND is_active = true;

    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'Cuenta no encontrada: %', (v_entry->>'account_code');
    END IF;

    INSERT INTO accounting_ledger (
      journal_entry_id, account_id, entry_date, transaction_type,
      description, debit_amount, credit_amount, reference_id, reference_table
    ) VALUES (
      v_journal_id, v_account_id, NOW(), p_transaction_type,
      COALESCE(v_entry->>'description', p_description),
      COALESCE((v_entry->>'debit')::DECIMAL, 0),
      COALESCE((v_entry->>'credit')::DECIMAL, 0),
      p_reference_id, p_reference_table
    );
  END LOOP;

  RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secuencia para números de asiento
CREATE SEQUENCE IF NOT EXISTS journal_entry_seq START 1;

-- =====================================================
-- TRIGGERS AUTOMÁTICOS PARA CONTABILIZACIÓN
-- =====================================================

-- 1. TRIGGER: Depositar en Billetera (PASIVO)
CREATE OR REPLACE FUNCTION trigger_accounting_wallet_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_entries JSONB;
BEGIN
  -- NIIF 15: Pasivo por contrato (deuda con usuario)
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '1102',  -- MercadoPago Disponible (ACTIVO)
      'debit', NEW.amount,
      'description', 'Ingreso de fondos a billetera'
    ),
    jsonb_build_object(
      'account_code', '2101',  -- Depósitos de Clientes (PASIVO)
      'credit', NEW.amount,
      'description', 'Pasivo por depósito en billetera'
    )
  );

  PERFORM create_journal_entry(
    'WALLET_DEPOSIT',
    NEW.id,
    'wallet_transactions',
    'Depósito en billetera: ' || NEW.user_id::TEXT,
    v_entries
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounting_wallet_deposit_trigger
AFTER INSERT ON wallet_transactions
FOR EACH ROW
WHEN (NEW.transaction_type = 'DEPOSIT' AND NEW.status = 'COMPLETED')
EXECUTE FUNCTION trigger_accounting_wallet_deposit();

-- 2. TRIGGER: Bloquear Depósito de Garantía (Franquicia)
CREATE OR REPLACE FUNCTION trigger_accounting_security_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_entries JSONB;
BEGIN
  -- NIIF: Depósito de garantía es PASIVO
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '2101',  -- Billetera (reducción pasivo)
      'debit', NEW.deposit_amount,
      'description', 'Bloqueo de garantía'
    ),
    jsonb_build_object(
      'account_code', '2102',  -- Depósitos de Garantía (nuevo pasivo)
      'credit', NEW.deposit_amount,
      'description', 'Franquicia bloqueada'
    )
  );

  PERFORM create_journal_entry(
    'SECURITY_DEPOSIT_BLOCK',
    NEW.id,
    'bookings',
    'Bloqueo de depósito - Booking: ' || NEW.id::TEXT,
    v_entries
  );

  -- Crear provisión
  INSERT INTO accounting_provisions (
    provision_type, reference_id, reference_table,
    provision_amount, status
  ) VALUES (
    'SECURITY_DEPOSIT', NEW.id, 'bookings',
    NEW.deposit_amount, 'ACTIVE'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounting_security_deposit_trigger
AFTER INSERT ON bookings
FOR EACH ROW
WHEN (NEW.deposit_amount > 0 AND NEW.status IN ('CONFIRMED', 'ACTIVE'))
EXECUTE FUNCTION trigger_accounting_security_deposit();

-- 3. TRIGGER: Reconocer Ingreso por Comisión (NIIF 15 - Agente)
CREATE OR REPLACE FUNCTION trigger_accounting_commission_income()
RETURNS TRIGGER AS $$
DECLARE
  v_entries JSONB;
  v_commission DECIMAL(15, 2);
  v_owner_payment DECIMAL(15, 2);
  v_mp_fee DECIMAL(15, 2);
BEGIN
  -- Solo reconocer al completar el servicio
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    
    -- Calcular montos
    v_commission := NEW.platform_commission;
    v_owner_payment := NEW.base_price - v_commission;
    v_mp_fee := NEW.total_price * 0.05; -- 5% aprox MP

    -- NIIF 15: Como agente, solo reconocer comisión
    v_entries := jsonb_build_array(
      -- Reducir pasivo billetera
      jsonb_build_object(
        'account_code', '2101',
        'debit', NEW.total_price,
        'description', 'Procesamiento de pago'
      ),
      -- Reconocer ingreso por comisión
      jsonb_build_object(
        'account_code', '4101',
        'credit', v_commission,
        'description', 'Ingreso por comisión'
      ),
      -- Registrar pago a propietario
      jsonb_build_object(
        'account_code', '2301',
        'credit', v_owner_payment,
        'description', 'Por pagar a propietario'
      ),
      -- Registrar gasto comisión MP
      jsonb_build_object(
        'account_code', '5101',
        'debit', v_mp_fee,
        'description', 'Comisión MercadoPago'
      ),
      jsonb_build_object(
        'account_code', '2302',
        'credit', v_mp_fee,
        'description', 'Por pagar a MercadoPago'
      )
    );

    PERFORM create_journal_entry(
      'RENTAL_COMPLETION',
      NEW.id,
      'bookings',
      'Finalización de alquiler - Booking: ' || NEW.id::TEXT,
      v_entries
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounting_commission_income_trigger
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_accounting_commission_income();

-- 4. TRIGGER: Liberar Depósito de Garantía
CREATE OR REPLACE FUNCTION trigger_accounting_release_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_entries JSONB;
BEGIN
  IF NEW.deposit_released AND NOT OLD.deposit_released THEN
    
    v_entries := jsonb_build_array(
      jsonb_build_object(
        'account_code', '2102',  -- Depósito de garantía
        'debit', NEW.deposit_amount,
        'description', 'Liberación de garantía'
      ),
      jsonb_build_object(
        'account_code', '2101',  -- Billetera
        'credit', NEW.deposit_amount,
        'description', 'Devolución a billetera'
      )
    );

    PERFORM create_journal_entry(
      'SECURITY_DEPOSIT_RELEASE',
      NEW.id,
      'bookings',
      'Liberación de depósito - Booking: ' || NEW.id::TEXT,
      v_entries
    );

    -- Actualizar provisión
    UPDATE accounting_provisions
    SET status = 'RELEASED', release_date = NOW(), released_amount = provision_amount
    WHERE reference_id = NEW.id AND provision_type = 'SECURITY_DEPOSIT';

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounting_release_deposit_trigger
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_accounting_release_deposit();

-- 5. TRIGGER: Aporte al FGO (NIIF 37)
CREATE OR REPLACE FUNCTION trigger_accounting_fgo_contribution()
RETURNS TRIGGER AS $$
DECLARE
  v_entries JSONB;
BEGIN
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '2101',  -- Billetera
      'debit', NEW.amount,
      'description', 'Aporte a FGO'
    ),
    jsonb_build_object(
      'account_code', '2201',  -- Provisión FGO
      'credit', NEW.amount,
      'description', 'Provisión para garantía operativa'
    )
  );

  PERFORM create_journal_entry(
    'FGO_CONTRIBUTION',
    NEW.id,
    'fgo_contributions',
    'Aporte FGO - Usuario: ' || NEW.user_id::TEXT,
    v_entries
  );

  -- Crear provisión
  INSERT INTO accounting_provisions (
    provision_type, reference_id, reference_table,
    provision_amount, status
  ) VALUES (
    'FGO_RESERVE', NEW.id, 'fgo_contributions',
    NEW.amount, 'ACTIVE'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounting_fgo_contribution_trigger
AFTER INSERT ON fgo_contributions
FOR EACH ROW
WHEN (NEW.status = 'COMPLETED')
EXECUTE FUNCTION trigger_accounting_fgo_contribution();

-- 6. TRIGGER: Uso del FGO para Siniestro
CREATE OR REPLACE FUNCTION trigger_accounting_fgo_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_entries JSONB;
BEGIN
  IF NEW.status = 'APPROVED' AND NEW.fgo_amount > 0 THEN
    
    v_entries := jsonb_build_array(
      jsonb_build_object(
        'account_code', '2201',  -- Provisión FGO
        'debit', NEW.fgo_amount,
        'description', 'Uso de FGO para siniestro'
      ),
      jsonb_build_object(
        'account_code', '5301',  -- Gasto por siniestro
        'debit', NEW.total_claim_amount - NEW.fgo_amount,
        'description', 'Gasto adicional siniestro'
      ),
      jsonb_build_object(
        'account_code', '1102',  -- MercadoPago
        'credit', NEW.total_claim_amount,
        'description', 'Pago de siniestro'
      )
    );

    PERFORM create_journal_entry(
      'FGO_CLAIM_USAGE',
      NEW.id,
      'claims',
      'Uso de FGO - Reclamo: ' || NEW.id::TEXT,
      v_entries
    );

    -- Actualizar provisión
    UPDATE accounting_provisions
    SET utilized_amount = utilized_amount + NEW.fgo_amount
    WHERE provision_type = 'FGO_RESERVE'
    AND status = 'ACTIVE'
    LIMIT 1; -- FIFO

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Nota: Este trigger requiere tabla 'claims' que deberás crear

-- =====================================================
-- VISTAS MATERIALIZADAS PARA REPORTES RÁPIDOS
-- =====================================================

-- Balance General (Estado de Situación Financiera)
CREATE MATERIALIZED VIEW IF NOT EXISTS accounting_balance_sheet AS
SELECT 
  a.code,
  a.name,
  a.account_type,
  a.sub_type,
  COALESCE(SUM(l.debit_amount - l.credit_amount), 0) AS balance
FROM accounting_accounts a
LEFT JOIN accounting_ledger l ON l.account_id = a.id
WHERE a.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
AND a.is_active = true
GROUP BY a.id, a.code, a.name, a.account_type, a.sub_type
ORDER BY a.code;

CREATE UNIQUE INDEX ON accounting_balance_sheet(code);

-- Estado de Resultados (P&L)
CREATE MATERIALIZED VIEW IF NOT EXISTS accounting_income_statement AS
SELECT 
  TO_CHAR(l.entry_date, 'YYYY-MM') AS period,
  a.code,
  a.name,
  a.account_type,
  SUM(CASE 
    WHEN a.account_type = 'INCOME' THEN l.credit_amount - l.debit_amount
    WHEN a.account_type = 'EXPENSE' THEN l.debit_amount - l.credit_amount
    ELSE 0
  END) AS amount
FROM accounting_ledger l
JOIN accounting_accounts a ON a.id = l.account_id
WHERE a.account_type IN ('INCOME', 'EXPENSE')
AND a.is_active = true
GROUP BY period, a.id, a.code, a.name, a.account_type
ORDER BY period DESC, a.code;

CREATE INDEX ON accounting_income_statement(period, code);

-- Dashboard Ejecutivo
CREATE MATERIALIZED VIEW IF NOT EXISTS accounting_dashboard AS
SELECT
  (SELECT COALESCE(SUM(balance), 0) FROM accounting_balance_sheet WHERE account_type = 'ASSET') AS total_assets,
  (SELECT COALESCE(SUM(balance), 0) FROM accounting_balance_sheet WHERE account_type = 'LIABILITY') AS total_liabilities,
  (SELECT COALESCE(SUM(balance), 0) FROM accounting_balance_sheet WHERE account_type = 'EQUITY') AS total_equity,
  (SELECT COALESCE(SUM(amount), 0) FROM accounting_income_statement WHERE account_type = 'INCOME' AND period = TO_CHAR(NOW(), 'YYYY-MM')) AS monthly_income,
  (SELECT COALESCE(SUM(amount), 0) FROM accounting_income_statement WHERE account_type = 'EXPENSE' AND period = TO_CHAR(NOW(), 'YYYY-MM')) AS monthly_expenses,
  (SELECT COALESCE(SUM(amount), 0) FROM accounting_income_statement WHERE account_type = 'INCOME' AND period = TO_CHAR(NOW(), 'YYYY-MM')) -
  (SELECT COALESCE(SUM(amount), 0) FROM accounting_income_statement WHERE account_type = 'EXPENSE' AND period = TO_CHAR(NOW(), 'YYYY-MM')) AS monthly_profit,
  (SELECT balance FROM accounting_balance_sheet WHERE code = '2101') AS wallet_liability,
  (SELECT balance FROM accounting_balance_sheet WHERE code = '2201') AS fgo_provision,
  (SELECT balance FROM accounting_balance_sheet WHERE code = '2102') AS active_security_deposits;

-- Conciliación Wallet
CREATE MATERIALIZED VIEW IF NOT EXISTS accounting_wallet_reconciliation AS
SELECT
  'Total en Billeteras (Sistema)' AS source,
  COALESCE(SUM(balance), 0) AS amount
FROM wallets
WHERE status = 'ACTIVE'
UNION ALL
SELECT
  'Pasivo Contable (Depósitos Clientes)' AS source,
  COALESCE((SELECT balance FROM accounting_balance_sheet WHERE code = '2101'), 0) AS amount
UNION ALL
SELECT
  'Diferencia (Debe ser 0)' AS source,
  COALESCE(SUM(balance), 0) - COALESCE((SELECT balance FROM accounting_balance_sheet WHERE code = '2101'), 0) AS amount
FROM wallets
WHERE status = 'ACTIVE';

-- Reporte de Comisiones
CREATE MATERIALIZED VIEW IF NOT EXISTS accounting_commissions_report AS
SELECT
  TO_CHAR(completed_at, 'YYYY-MM') AS period,
  COUNT(*) AS total_bookings,
  SUM(platform_commission) AS total_commissions,
  AVG(platform_commission) AS avg_commission
FROM bookings
WHERE status = 'COMPLETED'
GROUP BY period
ORDER BY period DESC;

-- Reporte de Provisiones
CREATE MATERIALIZED VIEW IF NOT EXISTS accounting_provisions_report AS
SELECT * FROM accounting_provisions WHERE status = 'ACTIVE';

-- =====================================================
-- FUNCIÓN: REFRESCAR TODOS LOS BALANCES (Ejecutar diariamente)
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_accounting_balances()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY accounting_balance_sheet;
  REFRESH MATERIALIZED VIEW CONCURRENTLY accounting_income_statement;
  REFRESH MATERIALIZED VIEW accounting_dashboard;
  REFRESH MATERIALIZED VIEW accounting_wallet_reconciliation;
  REFRESH MATERIALIZED VIEW accounting_commissions_report;
  REFRESH MATERIALIZED VIEW accounting_provisions_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: CIERRE DE PERÍODO MENSUAL (Automatizado)
-- =====================================================

CREATE OR REPLACE FUNCTION close_accounting_period(p_period VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_account RECORD;
  v_opening_balance DECIMAL(15, 2);
  v_period_debits DECIMAL(15, 2);
  v_period_credits DECIMAL(15, 2);
  v_closing_balance DECIMAL(15, 2);
BEGIN
  -- Para cada cuenta, calcular balance del período
  FOR v_account IN
    SELECT id, code, name, account_type
    FROM accounting_accounts
    WHERE is_active = true
  LOOP
    -- Balance inicial (cierre del período anterior)
    SELECT COALESCE(closing_balance, 0) INTO v_opening_balance
    FROM accounting_period_balances
    WHERE account_id = v_account.id
    AND period = TO_CHAR(TO_DATE(p_period || '-01', 'YYYY-MM-DD') - INTERVAL '1 month', 'YYYY-MM')
    ORDER BY created_at DESC
    LIMIT 1;

    -- Movimientos del período
    SELECT
      COALESCE(SUM(debit_amount), 0),
      COALESCE(SUM(credit_amount), 0)
    INTO v_period_debits, v_period_credits
    FROM accounting_ledger
    WHERE account_id = v_account.id
    AND TO_CHAR(entry_date, 'YYYY-MM') = p_period;

    -- Calcular cierre
    IF v_account.account_type IN ('ASSET', 'EXPENSE') THEN
      v_closing_balance := v_opening_balance + v_period_debits - v_period_credits;
    ELSE -- LIABILITY, EQUITY, INCOME
      v_closing_balance := v_opening_balance + v_period_credits - v_period_debits;
    END IF;

    -- Insertar balance del período
    INSERT INTO accounting_period_balances (
      period, account_id, opening_balance, period_debits, period_credits, closing_balance, is_closed
    ) VALUES (
      p_period, v_account.id, v_opening_balance, v_period_debits, v_period_credits, v_closing_balance, true
    )
    ON CONFLICT (period, account_id) DO UPDATE
    SET
      opening_balance = v_opening_balance,
      period_debits = v_period_debits,
      period_credits = v_period_credits,
      closing_balance = v_closing_balance,
      is_closed = true,
      closed_at = NOW();
  END LOOP;

  -- Trasladar resultado del ejercicio al patrimonio
  PERFORM transfer_profit_to_equity(p_period);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar: Trasladar resultado a patrimonio
CREATE OR REPLACE FUNCTION transfer_profit_to_equity(p_period VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_profit DECIMAL(15, 2);
  v_entries JSONB;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN account_type = 'INCOME' THEN amount ELSE -amount END), 0)
  INTO v_profit
  FROM accounting_income_statement
  WHERE period = p_period;

  IF v_profit != 0 THEN
    v_entries := jsonb_build_array(
      jsonb_build_object(
        'account_code', '3400',  -- Resultado del Ejercicio
        'debit', CASE WHEN v_profit > 0 THEN v_profit ELSE 0 END,
        'credit', CASE WHEN v_profit < 0 THEN ABS(v_profit) ELSE 0 END,
        'description', 'Traslado resultado período ' || p_period
      ),
      jsonb_build_object(
        'account_code', '3300',  -- Resultados Acumulados
        'debit', CASE WHEN v_profit < 0 THEN ABS(v_profit) ELSE 0 END,
        'credit', CASE WHEN v_profit > 0 THEN v_profit ELSE 0 END,
        'description', 'Resultado acumulado ' || p_period
      )
    );

    PERFORM create_journal_entry(
      'PERIOD_CLOSE',
      NULL,
      'accounting_period_balances',
      'Cierre de período: ' || p_period,
      v_entries
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CRON JOB: AUTOMATIZACIÓN DIARIA Y MENSUAL
-- =====================================================

-- Refrescar balances diariamente a las 00:01
SELECT cron.schedule(
  'refresh-accounting-balances-daily',
  '1 0 * * *',  -- 00:01 todos los días
  $$ SELECT refresh_accounting_balances(); $$
);

-- Cierre mensual automático el día 1 de cada mes a las 01:00
SELECT cron.schedule(
  'close-accounting-period-monthly',
  '0 1 1 * *',  -- 01:00 el día 1 de cada mes
  $$ SELECT close_accounting_period(TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM')); $$
);

-- =====================================================
-- PERMISOS Y SEGURIDAD
-- =====================================================

-- Admin puede ver todo
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON accounting_balance_sheet TO authenticated;
GRANT SELECT ON accounting_income_statement TO authenticated;
GRANT SELECT ON accounting_dashboard TO authenticated;
GRANT SELECT ON accounting_wallet_reconciliation TO authenticated;
GRANT SELECT ON accounting_commissions_report TO authenticated;
GRANT SELECT ON accounting_provisions_report TO authenticated;

-- Solo admin puede crear asientos manuales
GRANT EXECUTE ON FUNCTION create_journal_entry TO service_role;
GRANT EXECUTE ON FUNCTION refresh_accounting_balances TO service_role;

-- RLS básico
ALTER TABLE accounting_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_provisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all journal entries" ON accounting_journal_entries
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Admin can view all ledger" ON accounting_ledger
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- =====================================================
-- VERIFICACIÓN DE INTEGRIDAD (Ejecutar manualmente)
-- =====================================================

CREATE OR REPLACE FUNCTION verify_accounting_integrity()
RETURNS TABLE (
  test_name TEXT,
  passed BOOLEAN,
  details TEXT
) AS $$
BEGIN
  -- Test 1: Todos los asientos están balanceados
  RETURN QUERY
  SELECT
    'Asientos Balanceados'::TEXT,
    NOT EXISTS (SELECT 1 FROM accounting_journal_entries WHERE NOT is_balanced),
    CASE
      WHEN EXISTS (SELECT 1 FROM accounting_journal_entries WHERE NOT is_balanced)
      THEN 'Hay ' || (SELECT COUNT(*) FROM accounting_journal_entries WHERE NOT is_balanced)::TEXT || ' asientos desbalanceados'
      ELSE 'OK'
    END;

  -- Test 2: Conciliación wallet
  RETURN QUERY
  SELECT
    'Conciliación Wallet'::TEXT,
    ABS((SELECT amount FROM accounting_wallet_reconciliation WHERE source LIKE 'Diferencia%')) < 1,
    'Diferencia: $' || (SELECT amount FROM accounting_wallet_reconciliation WHERE source LIKE 'Diferencia%')::TEXT;

  -- Test 3: Balance General cuadra (Activo = Pasivo + Patrimonio)
  RETURN QUERY
  SELECT
    'Ecuación Contable'::TEXT,
    ABS((SELECT total_assets FROM accounting_dashboard) - 
        (SELECT total_liabilities + total_equity FROM accounting_dashboard)) < 1,
    'Diferencia: $' || ABS((SELECT total_assets - total_liabilities - total_equity FROM accounting_dashboard))::TEXT;

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ledger_account_date ON accounting_ledger(account_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON accounting_ledger(reference_id, reference_table);
CREATE INDEX IF NOT EXISTS idx_journal_date ON accounting_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_reference ON accounting_journal_entries(reference_id, reference_table);
CREATE INDEX IF NOT EXISTS idx_provisions_type_status ON accounting_provisions(provision_type, status);

-- =====================================================
-- ¡SISTEMA COMPLETADO!
-- =====================================================
COMMENT ON TABLE accounting_journal_entries IS 'Libro Diario - Partida Doble Automatizada';
COMMENT ON TABLE accounting_ledger IS 'Libro Mayor - Detalle de movimientos por cuenta';
COMMENT ON TABLE accounting_provisions IS 'Provisiones NIIF 37 - FGO, Depósitos, Siniestros';
COMMENT ON MATERIALIZED VIEW accounting_dashboard IS 'Dashboard ejecutivo actualizado diariamente';
