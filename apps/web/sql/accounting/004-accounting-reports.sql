-- =====================================================
-- REPORTES FINANCIEROS AUTOMÁTICOS
-- =====================================================

-- Balance General (Estado de Situación Financiera)
CREATE OR REPLACE VIEW accounting_balance_sheet AS
WITH account_balances AS (
  SELECT 
    a.code,
    a.name,
    a.account_type,
    a.sub_type,
    CASE 
      WHEN a.account_type IN ('ASSET', 'EXPENSE') THEN 
        COALESCE(SUM(l.debit_amount), 0) - COALESCE(SUM(l.credit_amount), 0)
      ELSE 
        COALESCE(SUM(l.credit_amount), 0) - COALESCE(SUM(l.debit_amount), 0)
    END AS balance
  FROM accounting_accounts a
  LEFT JOIN accounting_ledger l ON a.id = l.account_id
  WHERE a.is_active = TRUE
  GROUP BY a.id, a.code, a.name, a.account_type, a.sub_type
)
SELECT * FROM account_balances
WHERE account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
ORDER BY code;

-- Estado de Resultados (P&L)
CREATE OR REPLACE VIEW accounting_income_statement AS
WITH account_balances AS (
  SELECT 
    a.code,
    a.name,
    a.account_type,
    CASE 
      WHEN a.account_type = 'INCOME' THEN 
        COALESCE(SUM(l.credit_amount), 0) - COALESCE(SUM(l.debit_amount), 0)
      WHEN a.account_type = 'EXPENSE' THEN
        COALESCE(SUM(l.debit_amount), 0) - COALESCE(SUM(l.credit_amount), 0)
      ELSE 0
    END AS amount,
    TO_CHAR(l.entry_date, 'YYYY-MM') AS period
  FROM accounting_accounts a
  LEFT JOIN accounting_ledger l ON a.id = l.account_id
  WHERE a.is_active = TRUE AND a.account_type IN ('INCOME', 'EXPENSE')
  GROUP BY a.id, a.code, a.name, a.account_type, TO_CHAR(l.entry_date, 'YYYY-MM')
)
SELECT * FROM account_balances
ORDER BY period DESC, code;

-- Dashboard Financiero
CREATE OR REPLACE VIEW accounting_dashboard AS
SELECT
  -- Total Activos
  (SELECT SUM(balance) FROM accounting_balance_sheet WHERE account_type = 'ASSET') AS total_assets,
  
  -- Total Pasivos
  (SELECT SUM(balance) FROM accounting_balance_sheet WHERE account_type = 'LIABILITY') AS total_liabilities,
  
  -- Patrimonio
  (SELECT SUM(balance) FROM accounting_balance_sheet WHERE account_type = 'EQUITY') AS total_equity,
  
  -- Ingresos del mes actual
  (SELECT SUM(amount) FROM accounting_income_statement 
   WHERE account_type = 'INCOME' AND period = TO_CHAR(NOW(), 'YYYY-MM')) AS monthly_income,
  
  -- Gastos del mes actual
  (SELECT SUM(amount) FROM accounting_income_statement 
   WHERE account_type = 'EXPENSE' AND period = TO_CHAR(NOW(), 'YYYY-MM')) AS monthly_expenses,
  
  -- Utilidad del mes
  (SELECT SUM(amount) FROM accounting_income_statement 
   WHERE account_type = 'INCOME' AND period = TO_CHAR(NOW(), 'YYYY-MM')) -
  (SELECT SUM(amount) FROM accounting_income_statement 
   WHERE account_type = 'EXPENSE' AND period = TO_CHAR(NOW(), 'YYYY-MM')) AS monthly_profit,
  
  -- Saldo en Billetera de Usuarios (Pasivo)
  (SELECT balance FROM accounting_balance_sheet WHERE code = '2805') AS wallet_liability,
  
  -- Provisión FGO
  (SELECT balance FROM accounting_balance_sheet WHERE code = '2905') AS fgo_provision,
  
  -- Depósitos de Garantía Activos
  (SELECT balance FROM accounting_balance_sheet WHERE code = '2810') AS active_security_deposits;

-- Reporte de Provisiones Activas
CREATE OR REPLACE VIEW accounting_provisions_report AS
SELECT 
  p.provision_type,
  p.reference_table,
  p.reference_id,
  p.provision_amount,
  p.utilized_amount,
  p.released_amount,
  p.current_balance,
  p.status,
  p.provision_date,
  p.release_date,
  CASE 
    WHEN p.reference_table = 'bookings' THEN 
      (SELECT CONCAT('Booking #', b.id::text, ' - ', c.brand, ' ', c.model) 
       FROM bookings b 
       JOIN cars c ON b.car_id = c.id 
       WHERE b.id = p.reference_id)
    ELSE 'N/A'
  END AS reference_description
FROM accounting_provisions p
WHERE p.status = 'ACTIVE'
ORDER BY p.provision_date DESC;

-- Flujo de Caja Proyectado
CREATE OR REPLACE VIEW accounting_cash_flow AS
SELECT 
  TO_CHAR(l.entry_date, 'YYYY-MM-DD') AS transaction_date,
  a.name AS account_name,
  l.description,
  CASE 
    WHEN a.code IN ('1105', '1110', '1115', '1120') THEN 
      l.debit_amount - l.credit_amount
    ELSE 0
  END AS cash_movement,
  l.transaction_type
FROM accounting_ledger l
JOIN accounting_accounts a ON l.account_id = a.id
WHERE a.code IN ('1105', '1110', '1115', '1120') -- Solo cuentas de efectivo
ORDER BY l.entry_date DESC;

-- Conciliación Wallet vs Contabilidad
CREATE OR REPLACE VIEW accounting_wallet_reconciliation AS
SELECT
  'Saldo Billetera (Sistema)' AS source,
  (SELECT SUM(balance) FROM user_wallet_balances) AS amount
UNION ALL
SELECT
  'Pasivo Contable (2805)' AS source,
  (SELECT balance FROM accounting_balance_sheet WHERE code = '2805') AS amount
UNION ALL
SELECT
  'Diferencia (debe ser 0)' AS source,
  (SELECT SUM(balance) FROM user_wallet_balances) - 
  (SELECT balance FROM accounting_balance_sheet WHERE code = '2805') AS amount;

-- Reporte de Comisiones Ganadas
CREATE OR REPLACE VIEW accounting_commissions_report AS
SELECT 
  TO_CHAR(je.entry_date, 'YYYY-MM') AS period,
  COUNT(DISTINCT je.reference_id) AS total_bookings,
  SUM(jel.credit_amount) AS total_commissions,
  AVG(jel.credit_amount) AS avg_commission
FROM accounting_journal_entries je
JOIN accounting_journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN accounting_accounts a ON jel.account_id = a.id
WHERE a.code = '4135' AND je.status = 'POSTED'
GROUP BY TO_CHAR(je.entry_date, 'YYYY-MM')
ORDER BY period DESC;

COMMENT ON VIEW accounting_balance_sheet IS 'Balance General - Estado de Situación Financiera';
COMMENT ON VIEW accounting_income_statement IS 'Estado de Resultados - P&L por período';
COMMENT ON VIEW accounting_dashboard IS 'Dashboard ejecutivo con KPIs financieros';
COMMENT ON VIEW accounting_provisions_report IS 'Reporte de provisiones activas según NIIF 37';
COMMENT ON VIEW accounting_cash_flow IS 'Flujo de caja detallado';
COMMENT ON VIEW accounting_wallet_reconciliation IS 'Conciliación entre saldos de billetera y contabilidad';
