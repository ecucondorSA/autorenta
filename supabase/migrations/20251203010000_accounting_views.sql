-- Accounting Views for Dashboard and Reports
-- Created: 2025-12-03
-- Fixed: Using correct table/column names

-- Drop existing views if they exist (to recreate)
DROP VIEW IF EXISTS accounting_dashboard CASCADE;
DROP VIEW IF EXISTS accounting_balance_sheet CASCADE;
DROP VIEW IF EXISTS accounting_income_statement CASCADE;
DROP VIEW IF EXISTS accounting_wallet_reconciliation CASCADE;
DROP VIEW IF EXISTS accounting_commissions_report CASCADE;
DROP VIEW IF EXISTS accounting_provisions_report CASCADE;
DROP VIEW IF EXISTS accounting_cash_flow CASCADE;

-- 1. Accounting Dashboard View - Executive KPIs
CREATE OR REPLACE VIEW accounting_dashboard AS
SELECT
    COALESCE(
        (SELECT SUM(closing_balance)
         FROM accounting_period_balances pb
         JOIN accounting_accounts aa ON pb.account_id = aa.id
         WHERE aa.account_type = 'ASSET'),
        0
    ) AS total_assets,
    COALESCE(
        (SELECT SUM(closing_balance)
         FROM accounting_period_balances pb
         JOIN accounting_accounts aa ON pb.account_id = aa.id
         WHERE aa.account_type = 'LIABILITY'),
        0
    ) AS total_liabilities,
    COALESCE(
        (SELECT SUM(closing_balance)
         FROM accounting_period_balances pb
         JOIN accounting_accounts aa ON pb.account_id = aa.id
         WHERE aa.account_type = 'EQUITY'),
        0
    ) AS total_equity,
    COALESCE(
        (SELECT SUM(l.credit - l.debit)
         FROM accounting_ledger l
         JOIN accounting_chart_of_accounts a ON l.account_code = a.code
         WHERE a.account_type = 'INCOME'
           AND l.entry_date >= date_trunc('month', CURRENT_DATE)),
        0
    ) AS monthly_income,
    COALESCE(
        (SELECT SUM(l.debit - l.credit)
         FROM accounting_ledger l
         JOIN accounting_chart_of_accounts a ON l.account_code = a.code
         WHERE a.account_type = 'EXPENSE'
           AND l.entry_date >= date_trunc('month', CURRENT_DATE)),
        0
    ) AS monthly_expenses,
    COALESCE(
        (SELECT SUM(CASE WHEN a.account_type = 'INCOME' THEN l.credit - l.debit
                         WHEN a.account_type = 'EXPENSE' THEN -(l.debit - l.credit) ELSE 0 END)
         FROM accounting_ledger l
         JOIN accounting_chart_of_accounts a ON l.account_code = a.code
         WHERE a.account_type IN ('INCOME', 'EXPENSE')
           AND l.entry_date >= date_trunc('month', CURRENT_DATE)),
        0
    ) AS monthly_profit,
    COALESCE((SELECT SUM(balance_cents) / 100.0 FROM user_wallets), 0) AS wallet_liability,
    COALESCE(
        (SELECT SUM(current_balance) FROM accounting_provisions WHERE provision_type = 'FGO_RESERVE' AND status = 'ACTIVE'),
        0
    ) AS fgo_provision,
    COALESCE(
        (SELECT SUM(current_balance) FROM accounting_provisions WHERE provision_type = 'SECURITY_DEPOSIT' AND status = 'ACTIVE'),
        0
    ) AS active_security_deposits;

-- 2. Balance Sheet View (Estado de Situación Financiera)
CREATE OR REPLACE VIEW accounting_balance_sheet AS
SELECT
    ca.code,
    ca.name,
    ca.account_type,
    ca.sub_type,
    COALESCE(
        (SELECT SUM(l.debit - l.credit)
         FROM accounting_ledger l
         WHERE l.account_code = ca.code),
        0
    ) AS balance
FROM accounting_chart_of_accounts ca
WHERE ca.is_active = true
  AND ca.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
ORDER BY ca.code;

-- 3. Income Statement View (Estado de Resultados)
CREATE OR REPLACE VIEW accounting_income_statement AS
SELECT
    ca.code,
    ca.name,
    ca.account_type,
    to_char(l.entry_date, 'YYYY-MM') AS period,
    CASE
        WHEN ca.account_type = 'INCOME' THEN SUM(l.credit - l.debit)
        ELSE SUM(l.debit - l.credit)
    END AS amount
FROM accounting_ledger l
JOIN accounting_chart_of_accounts ca ON l.account_code = ca.code
WHERE ca.account_type IN ('INCOME', 'EXPENSE')
GROUP BY ca.code, ca.name, ca.account_type, to_char(l.entry_date, 'YYYY-MM')
ORDER BY period DESC, ca.code;

-- 4. Wallet Reconciliation View
CREATE OR REPLACE VIEW accounting_wallet_reconciliation AS
SELECT 'Saldos en Wallets' AS source, COALESCE(SUM(balance_cents) / 100.0, 0) AS amount FROM user_wallets
UNION ALL
SELECT 'Pasivo Contable Wallets' AS source,
    COALESCE(
        (SELECT SUM(l.credit - l.debit)
         FROM accounting_ledger l
         JOIN accounting_chart_of_accounts a ON l.account_code = a.code
         WHERE a.sub_type = 'WALLET_LIABILITY'),
        0
    ) AS amount
UNION ALL
SELECT 'Diferencia' AS source,
    COALESCE(SUM(balance_cents) / 100.0, 0) - COALESCE(
        (SELECT SUM(l.credit - l.debit)
         FROM accounting_ledger l
         JOIN accounting_chart_of_accounts a ON l.account_code = a.code
         WHERE a.sub_type = 'WALLET_LIABILITY'),
        0
    ) AS amount
FROM user_wallets;

-- 5. Commissions Report View
CREATE OR REPLACE VIEW accounting_commissions_report AS
SELECT
    to_char(b.created_at, 'YYYY-MM') AS period,
    COUNT(*) AS total_bookings,
    COALESCE(SUM(b.platform_fee), 0) AS total_commissions,
    COALESCE(AVG(b.platform_fee), 0) AS avg_commission
FROM bookings b
WHERE b.status IN ('completed', 'confirmed')
GROUP BY to_char(b.created_at, 'YYYY-MM')
ORDER BY period DESC;

-- 6. Provisions Report View
CREATE OR REPLACE VIEW accounting_provisions_report AS
SELECT
    id,
    provision_type,
    reference_id,
    provision_amount,
    utilized_amount,
    released_amount,
    current_balance,
    status,
    provision_date
FROM accounting_provisions
ORDER BY provision_date DESC;

-- 7. Cash Flow View
CREATE OR REPLACE VIEW accounting_cash_flow AS
SELECT
    l.id,
    l.entry_date AS date,
    l.created_at,
    CASE
        WHEN ca.account_type = 'INCOME' THEN 'INFLOW'
        WHEN ca.account_type = 'EXPENSE' THEN 'OUTFLOW'
        ELSE 'TRANSFER'
    END AS type,
    l.reference_type AS transaction_type,
    l.description,
    l.debit AS inflow,
    l.credit AS outflow,
    SUM(l.debit - l.credit) OVER (ORDER BY l.entry_date, l.created_at) AS balance
FROM accounting_ledger l
JOIN accounting_chart_of_accounts ca ON l.account_code = ca.code
WHERE ca.sub_type IN ('CASH', 'BANK', 'DIGITAL_WALLET')
ORDER BY l.entry_date DESC, l.created_at DESC
LIMIT 500;

-- Grant access to authenticated users (RLS will apply at table level)
GRANT SELECT ON accounting_dashboard TO authenticated;
GRANT SELECT ON accounting_balance_sheet TO authenticated;
GRANT SELECT ON accounting_income_statement TO authenticated;
GRANT SELECT ON accounting_wallet_reconciliation TO authenticated;
GRANT SELECT ON accounting_commissions_report TO authenticated;
GRANT SELECT ON accounting_provisions_report TO authenticated;
GRANT SELECT ON accounting_cash_flow TO authenticated;

-- Add some initial chart of accounts if empty
INSERT INTO accounting_chart_of_accounts (code, name, account_type, sub_type, is_active)
SELECT * FROM (VALUES
    ('1000', 'Activo Corriente', 'ASSET', 'CURRENT', true),
    ('1010', 'Caja y Bancos', 'ASSET', 'CASH', true),
    ('1011', 'MercadoPago Recaudación', 'ASSET', 'DIGITAL_WALLET', true),
    ('1020', 'Cuentas por Cobrar', 'ASSET', 'RECEIVABLES', true),
    ('2000', 'Pasivo Corriente', 'LIABILITY', 'CURRENT', true),
    ('2010', 'Saldos Wallet Usuarios', 'LIABILITY', 'WALLET_LIABILITY', true),
    ('2020', 'Depósitos de Garantía', 'LIABILITY', 'SECURITY_DEPOSIT', true),
    ('2030', 'Provisión FGO', 'LIABILITY', 'FGO_RESERVE', true),
    ('3000', 'Patrimonio Neto', 'EQUITY', 'CAPITAL', true),
    ('3010', 'Capital Social', 'EQUITY', 'CAPITAL', true),
    ('3020', 'Resultados Acumulados', 'EQUITY', 'RETAINED_EARNINGS', true),
    ('4000', 'Ingresos', 'INCOME', 'OPERATING', true),
    ('4010', 'Comisiones por Alquiler', 'INCOME', 'COMMISSION', true),
    ('4020', 'Ingresos por Servicios', 'INCOME', 'SERVICES', true),
    ('5000', 'Gastos Operativos', 'EXPENSE', 'OPERATING', true),
    ('5010', 'Procesamiento Pagos', 'EXPENSE', 'PAYMENT_PROCESSING', true),
    ('5020', 'Gastos Administrativos', 'EXPENSE', 'ADMINISTRATIVE', true)
) AS v(code, name, account_type, sub_type, is_active)
WHERE NOT EXISTS (SELECT 1 FROM accounting_chart_of_accounts WHERE code = v.code);

-- Create function to refresh accounting balances if not exists
CREATE OR REPLACE FUNCTION refresh_accounting_balances()
RETURNS VOID AS $$
BEGIN
    -- Recalculate period balances from ledger entries
    INSERT INTO accounting_period_balances (account_id, period, period_debits, period_credits, closing_balance)
    SELECT
        aa.id AS account_id,
        to_char(l.entry_date, 'YYYY-MM') AS period,
        COALESCE(SUM(l.debit), 0) AS period_debits,
        COALESCE(SUM(l.credit), 0) AS period_credits,
        COALESCE(SUM(l.debit - l.credit), 0) AS closing_balance
    FROM accounting_ledger l
    JOIN accounting_chart_of_accounts ca ON l.account_code = ca.code
    JOIN accounting_accounts aa ON ca.code = aa.code
    GROUP BY aa.id, to_char(l.entry_date, 'YYYY-MM')
    ON CONFLICT (period, account_id)
    DO UPDATE SET
        period_debits = EXCLUDED.period_debits,
        period_credits = EXCLUDED.period_credits,
        closing_balance = EXCLUDED.closing_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update exchange rates with current values
UPDATE exchange_rates SET
    rate = CASE pair
        WHEN 'USDARS' THEN 1050.00
        WHEN 'ARSUSD' THEN 0.00095
        WHEN 'USDBRL' THEN 6.05
        WHEN 'BRLUSD' THEN 0.165
        WHEN 'ARSBRL' THEN 0.00575
        WHEN 'BRLARS' THEN 173.55
    END,
    last_updated = NOW(),
    updated_at = NOW()
WHERE pair IN ('USDARS', 'ARSUSD', 'USDBRL', 'BRLUSD', 'ARSBRL', 'BRLARS');
