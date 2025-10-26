-- =====================================================
-- SISTEMA CONTABLE AUTOMATIZADO PARA AUTORENTA
-- Basado en NIIF 15 (Reconocimiento de Ingresos) y NIIF 37 (Provisiones)
-- =====================================================

-- =====================================================
-- CATÁLOGO DE CUENTAS CONTABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS accounting_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  subtype TEXT, -- Por ejemplo: 'current_asset', 'current_liability', etc.
  parent_account_id UUID REFERENCES accounting_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_accounting_accounts_code ON accounting_accounts(code);
CREATE INDEX idx_accounting_accounts_type ON accounting_accounts(type);
CREATE INDEX idx_accounting_accounts_parent ON accounting_accounts(parent_account_id);

-- =====================================================
-- LIBRO DIARIO (ASIENTOS CONTABLES)
-- =====================================================

CREATE TABLE IF NOT EXISTS accounting_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT NOT NULL UNIQUE, -- Número de asiento correlativo
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('booking', 'wallet_transaction', 'fgo_contribution', 'deposit', 'withdrawal', 'manual')),
  reference_id UUID, -- booking_id, transaction_id, etc.
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
  created_by UUID REFERENCES profiles(id),
  posted_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  voided_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_journal_entries_date ON accounting_journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON accounting_journal_entries(status);
CREATE INDEX idx_journal_entries_reference ON accounting_journal_entries(reference_type, reference_id);
CREATE INDEX idx_journal_entries_number ON accounting_journal_entries(entry_number);

-- =====================================================
-- LÍNEAS DEL LIBRO DIARIO (PARTIDA DOBLE)
-- =====================================================

CREATE TABLE IF NOT EXISTS accounting_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES accounting_journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounting_accounts(id),
  debit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'UYU')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: Una línea debe ser débito O crédito, no ambos ni ninguno
  CONSTRAINT debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (debit_amount = 0 AND credit_amount > 0)
  )
);

-- Índices
CREATE INDEX idx_journal_lines_entry ON accounting_journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON accounting_journal_lines(account_id);

-- =====================================================
-- PROVISIONES CONTABLES (NIIF 37)
-- =====================================================

CREATE TABLE IF NOT EXISTS accounting_provisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fgo_reserve', 'warranty', 'litigation', 'other')),
  account_id UUID NOT NULL REFERENCES accounting_accounts(id),
  estimated_amount NUMERIC(12, 2) NOT NULL,
  actual_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'released')),
  reference_type TEXT,
  reference_id UUID,
  recognition_date DATE NOT NULL,
  consumption_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_provisions_type ON accounting_provisions(type);
CREATE INDEX idx_provisions_status ON accounting_provisions(status);
CREATE INDEX idx_provisions_account ON accounting_provisions(account_id);

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE accounting_accounts IS 'Catálogo de cuentas contables basado en plan contable general';
COMMENT ON TABLE accounting_journal_entries IS 'Libro diario con todos los asientos contables';
COMMENT ON TABLE accounting_journal_lines IS 'Líneas individuales de cada asiento (partida doble)';
COMMENT ON TABLE accounting_provisions IS 'Provisiones contables según NIIF 37 (FGO, garantías, etc)';

COMMENT ON COLUMN accounting_accounts.type IS 'asset=Activo, liability=Pasivo, equity=Patrimonio, revenue=Ingreso, expense=Gasto';
COMMENT ON COLUMN accounting_journal_entries.status IS 'draft=Borrador, posted=Contabilizado, voided=Anulado';
COMMENT ON COLUMN accounting_journal_lines.debit_amount IS 'Monto del debe (positivo)';
COMMENT ON COLUMN accounting_journal_lines.credit_amount IS 'Monto del haber (positivo)';
