-- =====================================================
-- DASHBOARD DE MONITOREO CONTABLE
-- Queries para visualización en tiempo real
-- =====================================================

-- =====================================================
-- 1. VISTA: Resumen Contable en Tiempo Real
-- =====================================================
CREATE OR REPLACE VIEW accounting_dashboard_summary AS
WITH current_assets AS (
  SELECT COALESCE(SUM(debit - credit), 0) as total
  FROM accounting_ledger l
  JOIN accounting_chart_of_accounts c ON c.code = l.account_code
  WHERE c.account_type = 'ASSET'
),
current_liabilities AS (
  SELECT COALESCE(SUM(credit - debit), 0) as total
  FROM accounting_ledger l
  JOIN accounting_chart_of_accounts c ON c.code = l.account_code
  WHERE c.account_type = 'LIABILITY'
),
current_equity AS (
  SELECT COALESCE(SUM(credit - debit), 0) as total
  FROM accounting_ledger l
  JOIN accounting_chart_of_accounts c ON c.code = l.account_code
  WHERE c.account_type = 'EQUITY'
),
monthly_revenue AS (
  SELECT COALESCE(SUM(credit), 0) as total
  FROM accounting_ledger l
  WHERE l.account_code LIKE '4%'
    AND l.entry_date >= DATE_TRUNC('month', CURRENT_DATE)
),
monthly_expenses AS (
  SELECT COALESCE(SUM(debit), 0) as total
  FROM accounting_ledger l
  WHERE l.account_code LIKE '5%'
    AND l.entry_date >= DATE_TRUNC('month', CURRENT_DATE)
),
pending_issues AS (
  SELECT COUNT(*) as total
  FROM accounting_audit_log
  WHERE resolution_status = 'pending'
    AND severity IN ('error', 'critical')
)
SELECT 
  ca.total as total_assets,
  cl.total as total_liabilities,
  ce.total as total_equity,
  ca.total - (cl.total + ce.total) as balance_variance,
  ABS(ca.total - (cl.total + ce.total)) < 1.0 as is_balanced,
  mr.total as monthly_revenue,
  me.total as monthly_expenses,
  mr.total - me.total as monthly_net_income,
  pi.total as pending_critical_issues,
  NOW() as last_updated
FROM current_assets ca, current_liabilities cl, current_equity ce,
     monthly_revenue mr, monthly_expenses me, pending_issues pi;

-- =====================================================
-- 2. VISTA: Estado de Billeteras vs Pasivos
-- =====================================================
CREATE OR REPLACE VIEW accounting_wallet_status AS
WITH wallet_balances AS (
  SELECT 
    SUM(balance) as total_balance,
    COUNT(*) as total_wallets,
    COUNT(*) FILTER (WHERE balance > 0) as active_wallets
  FROM wallets
),
accounting_liabilities AS (
  SELECT COALESCE(SUM(credit - debit), 0) as recorded_liability
  FROM accounting_ledger
  WHERE account_code = '2110'
),
liability_details AS (
  SELECT 
    COUNT(*) as total_liabilities,
    SUM(amount) FILTER (WHERE status = 'active') as active_amount,
    SUM(amount) FILTER (WHERE status = 'released') as released_amount
  FROM accounting_wallet_liabilities
)
SELECT 
  wb.total_balance as actual_wallet_balance,
  al.recorded_liability as accounting_liability,
  wb.total_balance - al.recorded_liability as variance,
  ABS(wb.total_balance - al.recorded_liability) < 10.0 as is_reconciled,
  wb.total_wallets,
  wb.active_wallets,
  ld.total_liabilities,
  ld.active_amount,
  ld.released_amount,
  NOW() as last_checked
FROM wallet_balances wb, accounting_liabilities al, liability_details ld;

-- =====================================================
-- 3. VISTA: Métricas de Ingresos (Solo Comisiones - NIIF 15)
-- =====================================================
CREATE OR REPLACE VIEW accounting_revenue_metrics AS
SELECT 
  DATE_TRUNC('day', recognition_date) as date,
  COUNT(*) as bookings_completed,
  SUM(gross_amount) as total_transaction_volume,
  SUM(commission_amount) as total_commission_revenue,
  SUM(owner_amount) as total_paid_to_owners,
  AVG(commission_amount) as avg_commission,
  SUM(commission_amount) / NULLIF(SUM(gross_amount), 0) * 100 as commission_rate_pct
FROM accounting_revenue_recognition
WHERE is_recognized = true
GROUP BY DATE_TRUNC('day', recognition_date)
ORDER BY date DESC;

-- =====================================================
-- 4. VISTA: Estado de Provisiones FGO
-- =====================================================
CREATE OR REPLACE VIEW accounting_fgo_status AS
WITH current_provision AS (
  SELECT COALESCE(SUM(credit - debit), 0) as balance
  FROM accounting_ledger
  WHERE account_code = '2150' -- Provisión FGO
),
active_bookings AS (
  SELECT 
    COUNT(*) as count,
    SUM(total_price) as total_exposure,
    SUM(total_price * 0.05) as estimated_risk -- 5% de exposición
  FROM bookings
  WHERE status IN ('active', 'in_progress')
),
claims_history AS (
  SELECT 
    COUNT(*) as total_claims,
    COALESCE(SUM(amount), 0) as total_paid,
    AVG(amount) as avg_claim
  FROM accounting_provisions
  WHERE provision_type = 'fgo_claims'
    AND status = 'utilized'
)
SELECT 
  cp.balance as current_provision,
  ab.count as active_bookings,
  ab.total_exposure,
  ab.estimated_risk,
  cp.balance - ab.estimated_risk as provision_surplus_deficit,
  CASE 
    WHEN ab.estimated_risk = 0 THEN 100
    ELSE (cp.balance / ab.estimated_risk * 100)::NUMERIC(5,2)
  END as coverage_ratio_pct,
  ch.total_claims,
  ch.total_paid,
  ch.avg_claim,
  NOW() as last_updated
FROM current_provision cp, active_bookings ab, claims_history ch;

-- =====================================================
-- 5. VISTA: Top Alertas Pendientes
-- =====================================================
CREATE OR REPLACE VIEW accounting_pending_alerts AS
SELECT 
  id,
  audit_type,
  severity,
  description,
  affected_period,
  affected_account,
  variance,
  created_at,
  NOW() - created_at as age
FROM accounting_audit_log
WHERE resolution_status = 'pending'
ORDER BY 
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'error' THEN 2
    WHEN 'warning' THEN 3
    ELSE 4
  END,
  created_at ASC
LIMIT 20;

-- =====================================================
-- 6. VISTA: Métricas de Cierres Contables
-- =====================================================
CREATE OR REPLACE VIEW accounting_closure_metrics AS
SELECT 
  period_type,
  period_code,
  status,
  total_debits,
  total_credits,
  balance_check,
  closed_at,
  CASE 
    WHEN balance_check THEN 'OK'
    WHEN ABS(total_debits - total_credits) < 1.0 THEN 'OK (Minor variance)'
    ELSE 'ERROR'
  END as closure_status
FROM accounting_period_closures
ORDER BY closed_at DESC
LIMIT 30;

-- =====================================================
-- 7. FUNCIÓN: Dashboard Completo en JSON
-- =====================================================
CREATE OR REPLACE FUNCTION accounting_dashboard_json()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'summary', (SELECT row_to_json(ads) FROM accounting_dashboard_summary ads),
    'wallet_status', (SELECT row_to_json(aws) FROM accounting_wallet_status aws),
    'fgo_status', (SELECT row_to_json(afs) FROM accounting_fgo_status afs),
    'recent_revenue', (
      SELECT jsonb_agg(row_to_json(arm))
      FROM (SELECT * FROM accounting_revenue_metrics LIMIT 7) arm
    ),
    'pending_alerts', (
      SELECT jsonb_agg(row_to_json(apa))
      FROM accounting_pending_alerts apa
    ),
    'recent_closures', (
      SELECT jsonb_agg(row_to_json(acm))
      FROM (SELECT * FROM accounting_closure_metrics LIMIT 5) acm
    ),
    'timestamp', NOW()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNCIÓN: Reporte Mensual Completo
-- =====================================================
CREATE OR REPLACE FUNCTION accounting_monthly_report(p_month TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_month TEXT;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Default al mes anterior si no se especifica
  v_month := COALESCE(p_month, TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'));
  v_start_date := (v_month || '-01')::DATE;
  v_end_date := (v_start_date + INTERVAL '1 month');
  
  WITH revenue_summary AS (
    SELECT 
      COUNT(*) as bookings,
      SUM(gross_amount) as gross_volume,
      SUM(commission_amount) as net_revenue,
      AVG(commission_amount) as avg_commission
    FROM accounting_revenue_recognition
    WHERE recognition_date >= v_start_date
      AND recognition_date < v_end_date
  ),
  expense_summary AS (
    SELECT 
      SUM(debit) as total_expenses
    FROM accounting_ledger
    WHERE account_code LIKE '5%'
      AND entry_date >= v_start_date
      AND entry_date < v_end_date
  ),
  wallet_activity AS (
    SELECT 
      COUNT(*) FILTER (WHERE type = 'deposit') as deposits,
      SUM(amount) FILTER (WHERE type = 'deposit') as deposits_amount,
      COUNT(*) FILTER (WHERE type = 'withdrawal') as withdrawals,
      SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal') as withdrawals_amount
    FROM wallet_transactions
    WHERE created_at >= v_start_date
      AND created_at < v_end_date
      AND status = 'completed'
  ),
  fgo_activity AS (
    SELECT 
      COUNT(*) as claims,
      COALESCE(SUM(amount), 0) as claims_paid
    FROM accounting_provisions
    WHERE provision_type = 'fgo_claims'
      AND created_date >= v_start_date
      AND created_date < v_end_date
  )
  SELECT jsonb_build_object(
    'period', v_month,
    'revenue', (
      SELECT jsonb_build_object(
        'bookings_completed', bookings,
        'gross_transaction_volume', gross_volume,
        'commission_revenue', net_revenue,
        'average_commission', avg_commission
      ) FROM revenue_summary
    ),
    'expenses', (
      SELECT jsonb_build_object(
        'total_operating_expenses', total_expenses
      ) FROM expense_summary
    ),
    'net_income', (
      SELECT rs.net_revenue - es.total_expenses
      FROM revenue_summary rs, expense_summary es
    ),
    'wallet_activity', (
      SELECT jsonb_build_object(
        'deposits_count', deposits,
        'deposits_total', deposits_amount,
        'withdrawals_count', withdrawals,
        'withdrawals_total', withdrawals_amount
      ) FROM wallet_activity
    ),
    'fgo_activity', (
      SELECT jsonb_build_object(
        'claims_processed', claims,
        'total_paid', claims_paid
      ) FROM fgo_activity
    ),
    'generated_at', NOW()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. QUERY: Transacciones Recientes (para debug)
-- =====================================================
CREATE OR REPLACE VIEW accounting_recent_transactions AS
SELECT 
  l.id,
  l.entry_date,
  c.name as account_name,
  l.debit,
  l.credit,
  l.description,
  l.reference_type,
  l.reference_id,
  u.email as user_email,
  l.fiscal_period
FROM accounting_ledger l
JOIN accounting_chart_of_accounts c ON c.code = l.account_code
LEFT JOIN auth.users u ON u.id = l.user_id
ORDER BY l.entry_date DESC
LIMIT 100;

-- =====================================================
-- GRANTS para vistas
-- =====================================================
GRANT SELECT ON accounting_dashboard_summary TO authenticated;
GRANT SELECT ON accounting_wallet_status TO authenticated;
GRANT SELECT ON accounting_revenue_metrics TO authenticated;
GRANT SELECT ON accounting_fgo_status TO authenticated;
GRANT SELECT ON accounting_pending_alerts TO authenticated;
GRANT SELECT ON accounting_closure_metrics TO authenticated;
GRANT SELECT ON accounting_recent_transactions TO authenticated;

GRANT EXECUTE ON FUNCTION accounting_dashboard_json TO authenticated;
GRANT EXECUTE ON FUNCTION accounting_monthly_report TO authenticated;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

-- Ver dashboard completo
-- SELECT * FROM accounting_dashboard_summary;

-- Ver reconciliación de billeteras
-- SELECT * FROM accounting_wallet_status;

-- Ver estado FGO
-- SELECT * FROM accounting_fgo_status;

-- Dashboard JSON completo
-- SELECT accounting_dashboard_json();

-- Reporte mensual
-- SELECT accounting_monthly_report('2025-10');

-- Ver últimas transacciones
-- SELECT * FROM accounting_recent_transactions LIMIT 20;

-- Estado de resultados del mes actual
-- SELECT * FROM accounting_income_statement(
--   DATE_TRUNC('month', CURRENT_DATE),
--   NOW()
-- );

-- Balance general a la fecha
-- SELECT * FROM accounting_balance_sheet(NOW());
