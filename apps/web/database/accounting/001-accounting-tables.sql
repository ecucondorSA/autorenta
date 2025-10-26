-- =====================================================
-- SISTEMA CONTABLE CÍCLICO AUTOMATIZADO - AutoRenta
-- Basado en NIIF 15 (Ingresos) y NIIF 37 (Provisiones)
-- =====================================================

-- Catálogo de Cuentas Contables (Plan Contable)
CREATE TABLE IF NOT EXISTS accounting_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL, -- Ej: 1105, 2805, 4135
  name VARCHAR(200) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
  sub_type VARCHAR(100), -- Ej: 'CURRENT_ASSET', 'DEFERRED_LIABILITY'
  parent_account_id UUID REFERENCES accounting_accounts(id),
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE, -- Cuentas del sistema no editables
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Libro Mayor (General Ledger)
CREATE TABLE IF NOT EXISTS accounting_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number BIGSERIAL UNIQUE NOT NULL,
  entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  account_id UUID NOT NULL REFERENCES accounting_accounts(id),
  
  -- Método de partida doble
  debit_amount DECIMAL(15, 2) DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount DECIMAL(15, 2) DEFAULT 0 CHECK (credit_amount >= 0),
  
  -- Referencia a la transacción origen
  transaction_type VARCHAR(50) NOT NULL, -- 'DEPOSIT', 'BOOKING_PAYMENT', 'COMMISSION', 'WITHDRAWAL', etc.
  reference_id UUID, -- booking_id, wallet_transaction_id, etc.
  reference_table VARCHAR(100), -- 'bookings', 'wallet_transactions', etc.
  
  -- Metadatos
  description TEXT NOT NULL,
  user_id UUID, -- Usuario relacionado
  auto_generated BOOLEAN DEFAULT TRUE,
  fiscal_period VARCHAR(7), -- YYYY-MM
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  -- Constraint: debe tener débito o crédito, no ambos
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

-- Asientos Contables (Journal Entries) - Agrupa débitos y créditos
CREATE TABLE IF NOT EXISTS accounting_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE NOT NULL, -- AC-2025-001234
  entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_type VARCHAR(50) NOT NULL,
  reference_id UUID,
  reference_table VARCHAR(100),
  description TEXT NOT NULL,
  total_debit DECIMAL(15, 2) NOT NULL,
  total_credit DECIMAL(15, 2) NOT NULL,
  is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,
  status VARCHAR(20) DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'VOIDED')),
  fiscal_period VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  voided_at TIMESTAMPTZ,
  voided_by UUID,
  void_reason TEXT
);

-- Detalle de Asientos (líneas del asiento contable)
CREATE TABLE IF NOT EXISTS accounting_journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES accounting_journal_entries(id) ON DELETE CASCADE,
  line_number INT NOT NULL,
  account_id UUID NOT NULL REFERENCES accounting_accounts(id),
  debit_amount DECIMAL(15, 2) DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount DECIMAL(15, 2) DEFAULT 0 CHECK (credit_amount >= 0),
  description TEXT,
  
  CONSTRAINT check_debit_or_credit_line CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  ),
  
  UNIQUE(journal_entry_id, line_number)
);

-- Provisiones y Contingencias (NIIF 37)
CREATE TABLE IF NOT EXISTS accounting_provisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provision_type VARCHAR(50) NOT NULL, -- 'FGO_RESERVE', 'SECURITY_DEPOSIT', 'CLAIMS_RESERVE'
  reference_id UUID, -- booking_id, car_id, etc.
  reference_table VARCHAR(100),
  
  provision_amount DECIMAL(15, 2) NOT NULL CHECK (provision_amount >= 0),
  utilized_amount DECIMAL(15, 2) DEFAULT 0 CHECK (utilized_amount >= 0),
  released_amount DECIMAL(15, 2) DEFAULT 0 CHECK (released_amount >= 0),
  current_balance DECIMAL(15, 2) GENERATED ALWAYS AS (provision_amount - utilized_amount - released_amount) STORED,
  
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UTILIZED', 'RELEASED', 'EXPIRED')),
  
  provision_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_utilization_date TIMESTAMPTZ,
  actual_utilization_date TIMESTAMPTZ,
  release_date TIMESTAMPTZ,
  
  notes TEXT,
  journal_entry_id UUID REFERENCES accounting_journal_entries(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance de Cuentas (vista materializada para performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS accounting_balances AS
SELECT 
  a.id AS account_id,
  a.code,
  a.name,
  a.account_type,
  COALESCE(SUM(l.debit_amount), 0) AS total_debits,
  COALESCE(SUM(l.credit_amount), 0) AS total_credits,
  CASE 
    WHEN a.account_type IN ('ASSET', 'EXPENSE') THEN 
      COALESCE(SUM(l.debit_amount), 0) - COALESCE(SUM(l.credit_amount), 0)
    ELSE 
      COALESCE(SUM(l.credit_amount), 0) - COALESCE(SUM(l.debit_amount), 0)
  END AS balance,
  MAX(l.entry_date) AS last_movement_date
FROM accounting_accounts a
LEFT JOIN accounting_ledger l ON a.id = l.account_id
WHERE a.is_active = TRUE
GROUP BY a.id, a.code, a.name, a.account_type;

CREATE UNIQUE INDEX ON accounting_balances(account_id);

-- Índices para performance
CREATE INDEX idx_ledger_account ON accounting_ledger(account_id);
CREATE INDEX idx_ledger_date ON accounting_ledger(entry_date DESC);
CREATE INDEX idx_ledger_reference ON accounting_ledger(reference_table, reference_id);
CREATE INDEX idx_ledger_fiscal_period ON accounting_ledger(fiscal_period);
CREATE INDEX idx_journal_entries_date ON accounting_journal_entries(entry_date DESC);
CREATE INDEX idx_journal_entries_reference ON accounting_journal_entries(reference_table, reference_id);
CREATE INDEX idx_provisions_type ON accounting_provisions(provision_type, status);
CREATE INDEX idx_provisions_reference ON accounting_provisions(reference_table, reference_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounting_accounts_updated_at BEFORE UPDATE ON accounting_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounting_provisions_updated_at BEFORE UPDATE ON accounting_provisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para refrescar balances
CREATE OR REPLACE FUNCTION refresh_accounting_balances()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY accounting_balances;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE accounting_accounts IS 'Plan de cuentas contables basado en NIIF';
COMMENT ON TABLE accounting_ledger IS 'Libro mayor - registro cronológico de todas las transacciones';
COMMENT ON TABLE accounting_journal_entries IS 'Asientos contables agrupados con partida doble balanceada';
COMMENT ON TABLE accounting_provisions IS 'Provisiones según NIIF 37 (FGO, depósitos de garantía, etc.)';
