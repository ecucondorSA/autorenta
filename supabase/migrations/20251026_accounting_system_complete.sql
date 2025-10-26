-- =====================================================
-- SISTEMA CONTABLE AUTOMATIZADO CICLICO - AutoRenta
-- Basado en NIIF 15, NIIF 37 e IAS 37
-- =====================================================

-- =====================================================
-- 1. CATALOGO DE CUENTAS (NIIF)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  sub_type VARCHAR(100), -- Current, Non-current, Operating, etc.
  parent_code VARCHAR(20),
  level INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  requires_subsidiary BOOLEAN DEFAULT false,
  niif_reference VARCHAR(50), -- NIIF 15, NIIF 37, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. LIBRO MAYOR (LEDGER) - Registro automático
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  account_code VARCHAR(20) NOT NULL REFERENCES accounting_chart_of_accounts(code),
  debit DECIMAL(18, 2) DEFAULT 0,
  credit DECIMAL(18, 2) DEFAULT 0,
  description TEXT,
  reference_type VARCHAR(50), -- booking, withdrawal, deposit, fgo, insurance
  reference_id UUID,
  user_id UUID REFERENCES auth.users(id),
  batch_id UUID, -- Para agrupar asientos compuestos
  fiscal_period VARCHAR(10), -- YYYY-MM
  is_closing_entry BOOLEAN DEFAULT false,
  is_reversed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. PASIVOS POR BILLETERA (NIIF 15 - Contract Liabilities)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_wallet_liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  transaction_id UUID REFERENCES wallet_transactions(id),
  amount DECIMAL(18, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ARS',
  liability_type VARCHAR(50) NOT NULL, -- deposit, security_deposit, fgo
  status VARCHAR(20) DEFAULT 'active', -- active, released, consumed
  recognition_date TIMESTAMPTZ DEFAULT NOW(),
  release_date TIMESTAMPTZ,
  booking_id UUID REFERENCES bookings(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. PROVISIONES (NIIF 37 - Provisions)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_provisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provision_type VARCHAR(50) NOT NULL, -- fgo_claims, insurance_claims, bad_debt
  amount DECIMAL(18, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ARS',
  description TEXT,
  probability VARCHAR(20), -- probable, possible, remote
  measurement_basis TEXT, -- Cómo se calculó
  booking_id UUID REFERENCES bookings(id),
  user_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'active', -- active, utilized, released, reversed
  created_date TIMESTAMPTZ DEFAULT NOW(),
  review_date TIMESTAMPTZ,
  utilization_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. RECONOCIMIENTO DE INGRESOS (NIIF 15)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_revenue_recognition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  revenue_type VARCHAR(50) NOT NULL, -- commission, service_fee, late_fee
  gross_amount DECIMAL(18, 2) NOT NULL, -- Monto total del alquiler
  commission_amount DECIMAL(18, 2) NOT NULL, -- Solo la comisión (como agente)
  owner_amount DECIMAL(18, 2) NOT NULL, -- Lo que va al propietario
  recognition_date TIMESTAMPTZ,
  performance_obligation_met BOOLEAN DEFAULT false,
  booking_status VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'ARS',
  is_recognized BOOLEAN DEFAULT false,
  ledger_batch_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. CIERRES CONTABLES AUTOMÁTICOS
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_period_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type VARCHAR(20) NOT NULL, -- daily, monthly, yearly
  period_code VARCHAR(20) NOT NULL UNIQUE, -- 2025-10-26, 2025-10, 2025
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'open', -- open, closed, audited
  total_debits DECIMAL(18, 2) DEFAULT 0,
  total_credits DECIMAL(18, 2) DEFAULT 0,
  balance_check BOOLEAN DEFAULT false,
  closing_entries_batch_id UUID,
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. AUDITORIA CONTABLE AUTOMÁTICA
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type VARCHAR(50) NOT NULL, -- balance_check, reconciliation, anomaly
  severity VARCHAR(20) DEFAULT 'info', -- info, warning, error, critical
  description TEXT NOT NULL,
  affected_period VARCHAR(20),
  affected_account VARCHAR(20),
  expected_value DECIMAL(18, 2),
  actual_value DECIMAL(18, 2),
  variance DECIMAL(18, 2),
  resolution_status VARCHAR(20) DEFAULT 'pending', -- pending, resolved, ignored
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES para rendimiento
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ledger_date ON accounting_ledger(entry_date);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON accounting_ledger(account_code);
CREATE INDEX IF NOT EXISTS idx_ledger_period ON accounting_ledger(fiscal_period);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON accounting_ledger(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_wallet_liabilities_user ON accounting_wallet_liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_liabilities_status ON accounting_wallet_liabilities(status);
CREATE INDEX IF NOT EXISTS idx_provisions_type_status ON accounting_provisions(provision_type, status);
CREATE INDEX IF NOT EXISTS idx_revenue_booking ON accounting_revenue_recognition(booking_id);
CREATE INDEX IF NOT EXISTS idx_revenue_recognition ON accounting_revenue_recognition(is_recognized);

-- =====================================================
-- PLAN DE CUENTAS INICIAL (NIIF)
-- =====================================================
INSERT INTO accounting_chart_of_accounts (code, name, account_type, sub_type, niif_reference, level) VALUES
-- ACTIVOS
('1000', 'ACTIVOS', 'ASSET', 'Header', NULL, 1),
('1100', 'Activos Corrientes', 'ASSET', 'Current', NULL, 2),
('1110', 'Caja y Bancos', 'ASSET', 'Current', 'IAS 7', 3),
('1120', 'Cuentas por Cobrar - MercadoPago', 'ASSET', 'Current', 'NIIF 9', 3),
('1130', 'Comisiones por Cobrar', 'ASSET', 'Current', 'NIIF 15', 3),
('1140', 'Anticipos y Prepagos', 'ASSET', 'Current', NULL, 3),

-- PASIVOS
('2000', 'PASIVOS', 'LIABILITY', 'Header', NULL, 1),
('2100', 'Pasivos Corrientes', 'LIABILITY', 'Current', NULL, 2),
('2110', 'Depósitos de Clientes - Billetera', 'LIABILITY', 'Current', 'NIIF 15', 3),
('2120', 'Depósitos de Garantía (Franquicias)', 'LIABILITY', 'Current', 'IAS 37', 3),
('2130', 'Ingresos Diferidos', 'LIABILITY', 'Current', 'NIIF 15', 3),
('2140', 'Cuentas por Pagar - Propietarios', 'LIABILITY', 'Current', NULL, 3),
('2150', 'Provisión FGO', 'LIABILITY', 'Current', 'NIIF 37', 3),
('2160', 'Provisión Siniestros', 'LIABILITY', 'Current', 'NIIF 37', 3),
('2170', 'Provisión Deudas Incobrables', 'LIABILITY', 'Current', 'NIIF 9', 3),

-- PATRIMONIO
('3000', 'PATRIMONIO', 'EQUITY', 'Header', NULL, 1),
('3100', 'Capital Social', 'EQUITY', NULL, NULL, 2),
('3200', 'Resultados Acumulados', 'EQUITY', NULL, NULL, 2),
('3300', 'Resultado del Ejercicio', 'EQUITY', NULL, NULL, 2),

-- INGRESOS
('4000', 'INGRESOS', 'REVENUE', 'Header', NULL, 1),
('4100', 'Ingresos por Comisiones', 'REVENUE', 'Operating', 'NIIF 15', 2),
('4110', 'Comisión Servicio Plataforma', 'REVENUE', 'Operating', 'NIIF 15', 3),
('4120', 'Tarifas por Servicio', 'REVENUE', 'Operating', 'NIIF 15', 3),
('4130', 'Penalidades y Recargos', 'REVENUE', 'Operating', NULL, 3),
('4200', 'Otros Ingresos', 'REVENUE', 'Non-Operating', NULL, 2),
('4210', 'Intereses Ganados', 'REVENUE', 'Non-Operating', 'NIIF 9', 3),
('4220', 'Diferencias de Cambio Positivas', 'REVENUE', 'Non-Operating', 'IAS 21', 3),

-- GASTOS
('5000', 'GASTOS', 'EXPENSE', 'Header', NULL, 1),
('5100', 'Gastos Operativos', 'EXPENSE', 'Operating', NULL, 2),
('5110', 'Comisiones MercadoPago', 'EXPENSE', 'Operating', NULL, 3),
('5120', 'Gastos de Infraestructura', 'EXPENSE', 'Operating', NULL, 3),
('5130', 'Provisión Incobrables', 'EXPENSE', 'Operating', 'NIIF 9', 3),
('5200', 'Gastos FGO', 'EXPENSE', 'Operating', 'NIIF 37', 2),
('5210', 'Pagos por Siniestros', 'EXPENSE', 'Operating', 'NIIF 37', 3),
('5220', 'Ajustes FGO', 'EXPENSE', 'Operating', 'NIIF 37', 3)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- TRIGGER: Registro automático de depósitos en billetera
-- =====================================================
CREATE OR REPLACE FUNCTION trg_accounting_wallet_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_id UUID;
  v_period VARCHAR(10);
BEGIN
  v_batch_id := gen_random_uuid();
  v_period := TO_CHAR(NEW.created_at, 'YYYY-MM');
  
  -- Solo procesar depósitos confirmados
  IF NEW.status = 'completed' AND NEW.type IN ('deposit', 'mercadopago_deposit') THEN
    
    -- Asiento: DEBITO Caja/Bancos
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description, 
      reference_type, reference_id, user_id, batch_id, fiscal_period
    ) VALUES (
      '1110', NEW.amount, 0, 
      'Depósito de cliente a billetera',
      'wallet_deposit', NEW.id, NEW.user_id, v_batch_id, v_period
    );
    
    -- Asiento: CREDITO Pasivo por Depósito de Cliente (NIIF 15)
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, user_id, batch_id, fiscal_period
    ) VALUES (
      '2110', 0, NEW.amount,
      'Pasivo por depósito de cliente (NIIF 15)',
      'wallet_deposit', NEW.id, NEW.user_id, v_batch_id, v_period
    );
    
    -- Registrar el pasivo
    INSERT INTO accounting_wallet_liabilities (
      user_id, transaction_id, amount, liability_type, status
    ) VALUES (
      NEW.user_id, NEW.id, NEW.amount, 'deposit', 'active'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_accounting_wallet_deposit_after
AFTER INSERT OR UPDATE ON wallet_transactions
FOR EACH ROW
WHEN (NEW.status = 'completed' AND NEW.type IN ('deposit', 'mercadopago_deposit'))
EXECUTE FUNCTION trg_accounting_wallet_deposit();

-- =====================================================
-- TRIGGER: Retiros de billetera
-- =====================================================
CREATE OR REPLACE FUNCTION trg_accounting_wallet_withdrawal()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_id UUID;
  v_period VARCHAR(10);
BEGIN
  v_batch_id := gen_random_uuid();
  v_period := TO_CHAR(NEW.created_at, 'YYYY-MM');
  
  IF NEW.status = 'completed' AND NEW.type = 'withdrawal' THEN
    
    -- DEBITO: Reducir Pasivo con Cliente
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, user_id, batch_id, fiscal_period
    ) VALUES (
      '2110', ABS(NEW.amount), 0,
      'Retiro de cliente - reducción pasivo',
      'wallet_withdrawal', NEW.id, NEW.user_id, v_batch_id, v_period
    );
    
    -- CREDITO: Salida de Caja/Bancos
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, user_id, batch_id, fiscal_period
    ) VALUES (
      '1110', 0, ABS(NEW.amount),
      'Pago de retiro a cliente',
      'wallet_withdrawal', NEW.id, NEW.user_id, v_batch_id, v_period
    );
    
    -- Actualizar pasivo como liberado
    UPDATE accounting_wallet_liabilities
    SET status = 'released', release_date = NOW(), updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND status = 'active'
      AND amount <= ABS(NEW.amount)
    ORDER BY created_at ASC
    LIMIT 1;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_accounting_wallet_withdrawal_after
AFTER INSERT OR UPDATE ON wallet_transactions
FOR EACH ROW
WHEN (NEW.status = 'completed' AND NEW.type = 'withdrawal')
EXECUTE FUNCTION trg_accounting_wallet_withdrawal();

-- =====================================================
-- TRIGGER: Reconocimiento de ingresos al completar booking
-- (NIIF 15 - Solo reconocer comisión como agente)
-- =====================================================
CREATE OR REPLACE FUNCTION trg_accounting_revenue_recognition()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_id UUID;
  v_period VARCHAR(10);
  v_commission DECIMAL(18,2);
  v_owner_amount DECIMAL(18,2);
  v_gross DECIMAL(18,2);
BEGIN
  v_batch_id := gen_random_uuid();
  v_period := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Solo cuando el booking se completa
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Calcular comisión (asumiendo 10% por defecto)
    v_gross := NEW.total_price;
    v_commission := NEW.total_price * 0.10; -- Ajustar según configuración
    v_owner_amount := NEW.total_price - v_commission;
    
    -- DEBITO: Liberar pasivo por ingreso diferido
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, batch_id, fiscal_period
    ) VALUES (
      '2130', v_commission, 0,
      'Liberación ingreso diferido - booking completado',
      'booking_revenue', NEW.id, v_batch_id, v_period
    );
    
    -- CREDITO: Reconocer SOLO la comisión como ingreso (NIIF 15)
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, batch_id, fiscal_period
    ) VALUES (
      '4110', 0, v_commission,
      'Ingreso por comisión servicio plataforma (NIIF 15)',
      'booking_revenue', NEW.id, v_batch_id, v_period
    );
    
    -- DEBITO: Lo que se debe pagar al propietario
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, batch_id, fiscal_period
    ) VALUES (
      '2140', v_owner_amount, 0,
      'Cuenta por pagar a propietario',
      'booking_revenue', NEW.id, v_batch_id, v_period
    );
    
    -- Registrar reconocimiento de ingreso
    INSERT INTO accounting_revenue_recognition (
      booking_id, revenue_type, gross_amount, commission_amount,
      owner_amount, recognition_date, performance_obligation_met,
      booking_status, is_recognized, ledger_batch_id
    ) VALUES (
      NEW.id, 'commission', v_gross, v_commission,
      v_owner_amount, NOW(), true, NEW.status, true, v_batch_id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_accounting_revenue_recognition_after
AFTER UPDATE ON bookings
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
EXECUTE FUNCTION trg_accounting_revenue_recognition();

-- =====================================================
-- TRIGGER: Depósitos de garantía (franquicias)
-- =====================================================
CREATE OR REPLACE FUNCTION trg_accounting_security_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_id UUID;
  v_period VARCHAR(10);
  v_deposit_amount DECIMAL(18,2);
BEGIN
  v_batch_id := gen_random_uuid();
  v_period := TO_CHAR(NEW.created_at, 'YYYY-MM');
  
  -- Al iniciar booking con franquicia
  IF NEW.status = 'active' AND NEW.security_deposit_amount > 0 THEN
    v_deposit_amount := NEW.security_deposit_amount;
    
    -- DEBITO: Reducir billetera (o crear cuenta por cobrar)
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, batch_id, fiscal_period
    ) VALUES (
      '2110', v_deposit_amount, 0,
      'Bloqueo de fondos para depósito de garantía',
      'security_deposit', NEW.id, v_batch_id, v_period
    );
    
    -- CREDITO: Crear pasivo por depósito de garantía (IAS 37)
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, batch_id, fiscal_period
    ) VALUES (
      '2120', 0, v_deposit_amount,
      'Pasivo por depósito de garantía (IAS 37)',
      'security_deposit', NEW.id, v_batch_id, v_period
    );
    
    -- Registrar pasivo
    INSERT INTO accounting_wallet_liabilities (
      user_id, amount, liability_type, status, booking_id
    ) VALUES (
      NEW.renter_id, v_deposit_amount, 'security_deposit', 'active', NEW.id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_accounting_security_deposit_after
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
WHEN (NEW.status = 'active' AND NEW.security_deposit_amount > 0)
EXECUTE FUNCTION trg_accounting_security_deposit();

-- =====================================================
-- FUNCTION: Cierre contable automático diario
-- =====================================================
CREATE OR REPLACE FUNCTION accounting_daily_closure()
RETURNS JSONB AS $$
DECLARE
  v_period_code VARCHAR(20);
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_total_debits DECIMAL(18,2);
  v_total_credits DECIMAL(18,2);
  v_balance_ok BOOLEAN;
  v_result JSONB;
BEGIN
  v_period_code := TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD');
  v_start_date := (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMPTZ;
  v_end_date := CURRENT_DATE::TIMESTAMPTZ;
  
  -- Calcular totales del día
  SELECT 
    COALESCE(SUM(debit), 0), 
    COALESCE(SUM(credit), 0)
  INTO v_total_debits, v_total_credits
  FROM accounting_ledger
  WHERE entry_date >= v_start_date 
    AND entry_date < v_end_date
    AND is_closing_entry = false;
  
  -- Verificar balance
  v_balance_ok := ABS(v_total_debits - v_total_credits) < 0.01;
  
  -- Si no balancea, crear alerta
  IF NOT v_balance_ok THEN
    INSERT INTO accounting_audit_log (
      audit_type, severity, description, affected_period,
      expected_value, actual_value, variance
    ) VALUES (
      'balance_check', 'error',
      'Descuadre en cierre diario',
      v_period_code,
      v_total_debits, v_total_credits,
      v_total_debits - v_total_credits
    );
  END IF;
  
  -- Registrar cierre
  INSERT INTO accounting_period_closures (
    period_type, period_code, start_date, end_date,
    total_debits, total_credits, balance_check,
    status, closed_at
  ) VALUES (
    'daily', v_period_code, v_start_date, v_end_date,
    v_total_debits, v_total_credits, v_balance_ok,
    'closed', NOW()
  );
  
  v_result := jsonb_build_object(
    'period', v_period_code,
    'debits', v_total_debits,
    'credits', v_total_credits,
    'balanced', v_balance_ok,
    'variance', v_total_debits - v_total_credits
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Cierre mensual con asientos de cierre
-- =====================================================
CREATE OR REPLACE FUNCTION accounting_monthly_closure()
RETURNS JSONB AS $$
DECLARE
  v_period_code VARCHAR(20);
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_batch_id UUID;
  v_revenue DECIMAL(18,2);
  v_expenses DECIMAL(18,2);
  v_net_income DECIMAL(18,2);
  v_result JSONB;
BEGIN
  v_period_code := TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM');
  v_start_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
  v_end_date := DATE_TRUNC('month', CURRENT_DATE);
  v_batch_id := gen_random_uuid();
  
  -- Calcular ingresos del mes
  SELECT COALESCE(SUM(credit), 0)
  INTO v_revenue
  FROM accounting_ledger
  WHERE entry_date >= v_start_date 
    AND entry_date < v_end_date
    AND account_code LIKE '4%'; -- Cuentas de ingreso
  
  -- Calcular gastos del mes
  SELECT COALESCE(SUM(debit), 0)
  INTO v_expenses
  FROM accounting_ledger
  WHERE entry_date >= v_start_date 
    AND entry_date < v_end_date
    AND account_code LIKE '5%'; -- Cuentas de gasto
  
  v_net_income := v_revenue - v_expenses;
  
  -- Asiento de cierre: Cerrar cuentas de resultado
  -- DEBITO: Cuentas de Ingreso (cerrar saldo acreedor)
  INSERT INTO accounting_ledger (
    account_code, debit, credit, description,
    batch_id, fiscal_period, is_closing_entry
  ) VALUES (
    '4000', v_revenue, 0,
    'Cierre de ingresos período ' || v_period_code,
    v_batch_id, v_period_code, true
  );
  
  -- CREDITO: Cuentas de Gasto (cerrar saldo deudor)
  INSERT INTO accounting_ledger (
    account_code, debit, credit, description,
    batch_id, fiscal_period, is_closing_entry
  ) VALUES (
    '5000', 0, v_expenses,
    'Cierre de gastos período ' || v_period_code,
    v_batch_id, v_period_code, true
  );
  
  -- Trasladar resultado neto a patrimonio
  IF v_net_income > 0 THEN
    -- Utilidad
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      batch_id, fiscal_period, is_closing_entry
    ) VALUES (
      '3300', 0, v_net_income,
      'Resultado del ejercicio - Utilidad',
      v_batch_id, v_period_code, true
    );
  ELSIF v_net_income < 0 THEN
    -- Pérdida
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      batch_id, fiscal_period, is_closing_entry
    ) VALUES (
      '3300', ABS(v_net_income), 0,
      'Resultado del ejercicio - Pérdida',
      v_batch_id, v_period_code, true
    );
  END IF;
  
  -- Registrar cierre
  INSERT INTO accounting_period_closures (
    period_type, period_code, start_date, end_date,
    status, closing_entries_batch_id, closed_at
  ) VALUES (
    'monthly', v_period_code, v_start_date, v_end_date,
    'closed', v_batch_id, NOW()
  );
  
  v_result := jsonb_build_object(
    'period', v_period_code,
    'revenue', v_revenue,
    'expenses', v_expenses,
    'net_income', v_net_income,
    'batch_id', v_batch_id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Balance General automático
-- =====================================================
CREATE OR REPLACE FUNCTION accounting_balance_sheet(p_date TIMESTAMPTZ DEFAULT NOW())
RETURNS TABLE (
  account_code VARCHAR,
  account_name VARCHAR,
  account_type VARCHAR,
  balance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coa.code,
    coa.name,
    coa.account_type,
    COALESCE(SUM(l.debit - l.credit), 0) as balance
  FROM accounting_chart_of_accounts coa
  LEFT JOIN accounting_ledger l ON l.account_code = coa.code
    AND l.entry_date <= p_date
  WHERE coa.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
    AND coa.is_active = true
  GROUP BY coa.code, coa.name, coa.account_type, coa.level
  ORDER BY coa.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Estado de Resultados automático
-- =====================================================
CREATE OR REPLACE FUNCTION accounting_income_statement(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  account_code VARCHAR,
  account_name VARCHAR,
  account_type VARCHAR,
  amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coa.code,
    coa.name,
    coa.account_type,
    CASE 
      WHEN coa.account_type = 'REVENUE' THEN COALESCE(SUM(l.credit - l.debit), 0)
      WHEN coa.account_type = 'EXPENSE' THEN COALESCE(SUM(l.debit - l.credit), 0)
      ELSE 0
    END as amount
  FROM accounting_chart_of_accounts coa
  LEFT JOIN accounting_ledger l ON l.account_code = coa.code
    AND l.entry_date >= p_start_date
    AND l.entry_date <= p_end_date
  WHERE coa.account_type IN ('REVENUE', 'EXPENSE')
    AND coa.is_active = true
  GROUP BY coa.code, coa.name, coa.account_type, coa.level
  ORDER BY coa.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Auditoria automática de balance
-- =====================================================
CREATE OR REPLACE FUNCTION accounting_auto_audit()
RETURNS JSONB AS $$
DECLARE
  v_assets DECIMAL(18,2);
  v_liabilities DECIMAL(18,2);
  v_equity DECIMAL(18,2);
  v_balanced BOOLEAN;
  v_issues INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Sumar activos
  SELECT COALESCE(SUM(debit - credit), 0)
  INTO v_assets
  FROM accounting_ledger l
  JOIN accounting_chart_of_accounts c ON c.code = l.account_code
  WHERE c.account_type = 'ASSET';
  
  -- Sumar pasivos
  SELECT COALESCE(SUM(credit - debit), 0)
  INTO v_liabilities
  FROM accounting_ledger l
  JOIN accounting_chart_of_accounts c ON c.code = l.account_code
  WHERE c.account_type = 'LIABILITY';
  
  -- Sumar patrimonio
  SELECT COALESCE(SUM(credit - debit), 0)
  INTO v_equity
  FROM accounting_ledger l
  JOIN accounting_chart_of_accounts c ON c.code = l.account_code
  WHERE c.account_type = 'EQUITY';
  
  -- Ecuación contable: Activos = Pasivos + Patrimonio
  v_balanced := ABS(v_assets - (v_liabilities + v_equity)) < 1.0;
  
  IF NOT v_balanced THEN
    INSERT INTO accounting_audit_log (
      audit_type, severity, description,
      expected_value, actual_value, variance
    ) VALUES (
      'balance_check', 'critical',
      'Ecuación contable desbalanceada: A ≠ P + E',
      v_liabilities + v_equity, v_assets,
      v_assets - (v_liabilities + v_equity)
    );
    v_issues := v_issues + 1;
  END IF;
  
  -- Verificar pasivos de billetera
  PERFORM accounting_verify_wallet_liabilities();
  
  v_result := jsonb_build_object(
    'assets', v_assets,
    'liabilities', v_liabilities,
    'equity', v_equity,
    'balanced', v_balanced,
    'variance', v_assets - (v_liabilities + v_equity),
    'issues_found', v_issues,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Verificar consistencia pasivos billetera
-- =====================================================
CREATE OR REPLACE FUNCTION accounting_verify_wallet_liabilities()
RETURNS VOID AS $$
DECLARE
  v_wallet_balance DECIMAL(18,2);
  v_liability_balance DECIMAL(18,2);
  v_variance DECIMAL(18,2);
BEGIN
  -- Sumar saldos reales de billeteras
  SELECT COALESCE(SUM(balance), 0)
  INTO v_wallet_balance
  FROM wallets;
  
  -- Sumar pasivos registrados
  SELECT COALESCE(SUM(credit - debit), 0)
  INTO v_liability_balance
  FROM accounting_ledger
  WHERE account_code = '2110'; -- Depósitos de clientes
  
  v_variance := v_wallet_balance - v_liability_balance;
  
  -- Si hay discrepancia significativa, alertar
  IF ABS(v_variance) > 10.0 THEN
    INSERT INTO accounting_audit_log (
      audit_type, severity, description,
      affected_account, expected_value, actual_value, variance
    ) VALUES (
      'reconciliation', 'warning',
      'Discrepancia entre saldos de billetera y pasivos contables',
      '2110', v_liability_balance, v_wallet_balance, v_variance
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE accounting_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_wallet_liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_revenue_recognition ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver el ledger completo
CREATE POLICY accounting_ledger_admin_all ON accounting_ledger
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Usuarios pueden ver sus propios registros
CREATE POLICY accounting_ledger_user_own ON accounting_ledger
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- GRANTS
-- =====================================================
GRANT SELECT ON accounting_chart_of_accounts TO authenticated;
GRANT SELECT ON accounting_ledger TO authenticated;
GRANT SELECT ON accounting_wallet_liabilities TO authenticated;
GRANT EXECUTE ON FUNCTION accounting_balance_sheet TO authenticated;
GRANT EXECUTE ON FUNCTION accounting_income_statement TO authenticated;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE accounting_ledger IS 'Libro mayor automatizado con registro doble entrada. Triggers automáticos registran cada transacción según NIIF 15 y 37.';
COMMENT ON TABLE accounting_wallet_liabilities IS 'Pasivos por depósitos de clientes (NIIF 15). NO son ingresos hasta que se cumple la obligación de desempeño.';
COMMENT ON TABLE accounting_provisions IS 'Provisiones según NIIF 37 para FGO y siniestros futuros.';
COMMENT ON TABLE accounting_revenue_recognition IS 'Reconocimiento de ingresos SOLO por comisiones (rol de agente según NIIF 15).';
COMMENT ON FUNCTION accounting_daily_closure IS 'Cierre automático diario. Ejecutar en cron job a las 00:01.';
COMMENT ON FUNCTION accounting_monthly_closure IS 'Cierre mensual con asientos de cierre. Ejecutar el día 1 de cada mes.';
COMMENT ON FUNCTION accounting_auto_audit IS 'Auditoría automática de ecuación contable. Ejecutar diariamente.';
