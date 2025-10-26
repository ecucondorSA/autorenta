-- =====================================================
-- REPORTES CONTABLES Y ESTADOS FINANCIEROS
-- =====================================================

-- =====================================================
-- VISTA: Balance de Comprobación
-- =====================================================

CREATE OR REPLACE VIEW accounting_trial_balance AS
WITH account_balances AS (
  SELECT
    a.id,
    a.code,
    a.name,
    a.type,
    a.subtype,
    COALESCE(SUM(l.debit_amount), 0) as total_debits,
    COALESCE(SUM(l.credit_amount), 0) as total_credits,
    CASE
      WHEN a.type IN ('asset', 'expense') THEN 
        COALESCE(SUM(l.debit_amount), 0) - COALESCE(SUM(l.credit_amount), 0)
      WHEN a.type IN ('liability', 'equity', 'revenue') THEN 
        COALESCE(SUM(l.credit_amount), 0) - COALESCE(SUM(l.debit_amount), 0)
      ELSE 0
    END as balance
  FROM accounting_accounts a
  LEFT JOIN accounting_journal_lines l ON l.account_id = a.id
  LEFT JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
  WHERE a.is_active = TRUE
    AND (e.status = 'posted' OR e.status IS NULL)
  GROUP BY a.id, a.code, a.name, a.type, a.subtype
)
SELECT
  code,
  name,
  type,
  total_debits,
  total_credits,
  balance,
  CASE 
    WHEN balance > 0 THEN balance 
    ELSE 0 
  END as debit_balance,
  CASE 
    WHEN balance < 0 THEN ABS(balance) 
    ELSE 0 
  END as credit_balance
FROM account_balances
WHERE total_debits + total_credits > 0
ORDER BY code;

-- =====================================================
-- VISTA: Balance General (Estado de Situación Financiera)
-- =====================================================

CREATE OR REPLACE VIEW accounting_balance_sheet AS
WITH account_balances AS (
  SELECT
    a.code,
    a.name,
    a.type,
    a.subtype,
    CASE
      WHEN a.type IN ('asset', 'expense') THEN 
        COALESCE(SUM(l.debit_amount), 0) - COALESCE(SUM(l.credit_amount), 0)
      WHEN a.type IN ('liability', 'equity', 'revenue') THEN 
        COALESCE(SUM(l.credit_amount), 0) - COALESCE(SUM(l.debit_amount), 0)
      ELSE 0
    END as balance
  FROM accounting_accounts a
  LEFT JOIN accounting_journal_lines l ON l.account_id = a.id
  LEFT JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
  WHERE a.is_active = TRUE
    AND (e.status = 'posted' OR e.status IS NULL)
    AND a.type IN ('asset', 'liability', 'equity')
  GROUP BY a.id, a.code, a.name, a.type, a.subtype
)
SELECT
  code,
  name,
  type,
  subtype,
  balance
FROM account_balances
WHERE balance != 0
ORDER BY 
  CASE type
    WHEN 'asset' THEN 1
    WHEN 'liability' THEN 2
    WHEN 'equity' THEN 3
  END,
  code;

-- =====================================================
-- VISTA: Estado de Resultados (P&L)
-- =====================================================

CREATE OR REPLACE VIEW accounting_income_statement AS
WITH account_balances AS (
  SELECT
    a.code,
    a.name,
    a.type,
    a.subtype,
    CASE
      WHEN a.type = 'revenue' THEN 
        COALESCE(SUM(l.credit_amount), 0) - COALESCE(SUM(l.debit_amount), 0)
      WHEN a.type = 'expense' THEN 
        COALESCE(SUM(l.debit_amount), 0) - COALESCE(SUM(l.credit_amount), 0)
      ELSE 0
    END as balance
  FROM accounting_accounts a
  LEFT JOIN accounting_journal_lines l ON l.account_id = a.id
  LEFT JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
  WHERE a.is_active = TRUE
    AND (e.status = 'posted' OR e.status IS NULL)
    AND a.type IN ('revenue', 'expense')
  GROUP BY a.id, a.code, a.name, a.type, a.subtype
)
SELECT
  code,
  name,
  type,
  subtype,
  balance,
  CASE 
    WHEN type = 'revenue' THEN balance
    ELSE 0
  END as revenue_amount,
  CASE 
    WHEN type = 'expense' THEN balance
    ELSE 0
  END as expense_amount
FROM account_balances
WHERE balance != 0
ORDER BY 
  CASE type
    WHEN 'revenue' THEN 1
    WHEN 'expense' THEN 2
  END,
  code;

-- =====================================================
-- FUNCIÓN: Estado de Resultados por Período
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_income_statement_period(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.code,
    a.name,
    a.type,
    CASE
      WHEN a.type = 'revenue' THEN 
        COALESCE(SUM(l.credit_amount), 0) - COALESCE(SUM(l.debit_amount), 0)
      WHEN a.type = 'expense' THEN 
        COALESCE(SUM(l.debit_amount), 0) - COALESCE(SUM(l.credit_amount), 0)
      ELSE 0
    END as balance
  FROM accounting_accounts a
  LEFT JOIN accounting_journal_lines l ON l.account_id = a.id
  LEFT JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
  WHERE a.is_active = TRUE
    AND e.status = 'posted'
    AND e.entry_date BETWEEN p_start_date AND p_end_date
    AND a.type IN ('revenue', 'expense')
  GROUP BY a.id, a.code, a.name, a.type
  HAVING COALESCE(SUM(l.debit_amount), 0) + COALESCE(SUM(l.credit_amount), 0) > 0
  ORDER BY 
    CASE a.type
      WHEN 'revenue' THEN 1
      WHEN 'expense' THEN 2
    END,
    a.code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTA: Libro Mayor por Cuenta
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_general_ledger(
  p_account_code TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  entry_date DATE,
  entry_number TEXT,
  description TEXT,
  debit_amount NUMERIC,
  credit_amount NUMERIC,
  balance NUMERIC
) AS $$
DECLARE
  v_account_id UUID;
  v_account_type TEXT;
BEGIN
  -- Obtener ID y tipo de cuenta
  SELECT id, type INTO v_account_id, v_account_type
  FROM accounting_accounts
  WHERE code = p_account_code;
  
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Cuenta % no encontrada', p_account_code;
  END IF;
  
  RETURN QUERY
  WITH transactions AS (
    SELECT
      e.entry_date,
      e.entry_number,
      e.description,
      l.debit_amount,
      l.credit_amount
    FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
    WHERE l.account_id = v_account_id
      AND e.status = 'posted'
      AND (p_start_date IS NULL OR e.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR e.entry_date <= p_end_date)
    ORDER BY e.entry_date, e.entry_number
  )
  SELECT
    t.entry_date,
    t.entry_number,
    t.description,
    t.debit_amount,
    t.credit_amount,
    SUM(
      CASE
        WHEN v_account_type IN ('asset', 'expense') THEN
          t.debit_amount - t.credit_amount
        ELSE
          t.credit_amount - t.debit_amount
      END
    ) OVER (ORDER BY t.entry_date, t.entry_number) as balance
  FROM transactions t;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTA: Dashboard Contable Ejecutivo
-- =====================================================

CREATE OR REPLACE VIEW accounting_executive_dashboard AS
WITH metrics AS (
  SELECT
    -- Activos totales
    (SELECT SUM(
      COALESCE(l.debit_amount, 0) - COALESCE(l.credit_amount, 0)
    )
    FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
    JOIN accounting_accounts a ON a.id = l.account_id
    WHERE a.type = 'asset' AND e.status = 'posted'
    ) as total_assets,
    
    -- Pasivos totales
    (SELECT SUM(
      COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0)
    )
    FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
    JOIN accounting_accounts a ON a.id = l.account_id
    WHERE a.type = 'liability' AND e.status = 'posted'
    ) as total_liabilities,
    
    -- Patrimonio
    (SELECT SUM(
      COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0)
    )
    FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
    JOIN accounting_accounts a ON a.id = l.account_id
    WHERE a.type = 'equity' AND e.status = 'posted'
    ) as total_equity,
    
    -- Ingresos del período
    (SELECT SUM(
      COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0)
    )
    FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
    JOIN accounting_accounts a ON a.id = l.account_id
    WHERE a.type = 'revenue' AND e.status = 'posted'
    ) as total_revenue,
    
    -- Gastos del período
    (SELECT SUM(
      COALESCE(l.debit_amount, 0) - COALESCE(l.credit_amount, 0)
    )
    FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
    JOIN accounting_accounts a ON a.id = l.account_id
    WHERE a.type = 'expense' AND e.status = 'posted'
    ) as total_expenses,
    
    -- Saldo billeteras usuarios
    (SELECT SUM(
      COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0)
    )
    FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
    JOIN accounting_accounts a ON a.id = l.account_id
    WHERE a.code LIKE '2.1.1%' AND e.status = 'posted'
    ) as wallet_liability,
    
    -- Provisión FGO
    (SELECT SUM(actual_amount)
    FROM accounting_provisions
    WHERE type = 'fgo_reserve' AND status = 'active'
    ) as fgo_available
)
SELECT
  total_assets,
  total_liabilities,
  total_equity,
  total_revenue,
  total_expenses,
  total_revenue - total_expenses as net_income,
  wallet_liability,
  fgo_available,
  CASE 
    WHEN total_assets > 0 THEN (total_revenue - total_expenses) / total_assets * 100
    ELSE 0
  END as roa_percentage,
  CASE 
    WHEN total_equity > 0 THEN (total_revenue - total_expenses) / total_equity * 100
    ELSE 0
  END as roe_percentage
FROM metrics;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON VIEW accounting_trial_balance IS 'Balance de comprobación con débitos y créditos por cuenta';
COMMENT ON VIEW accounting_balance_sheet IS 'Estado de Situación Financiera (Balance General)';
COMMENT ON VIEW accounting_income_statement IS 'Estado de Resultados (P&L)';
COMMENT ON VIEW accounting_executive_dashboard IS 'Dashboard ejecutivo con métricas clave';
COMMENT ON FUNCTION accounting_income_statement_period IS 'Estado de resultados filtrado por período';
COMMENT ON FUNCTION accounting_general_ledger IS 'Libro mayor detallado de una cuenta específica';
