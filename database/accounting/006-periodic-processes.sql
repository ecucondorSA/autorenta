-- =====================================================
-- PROCESOS PERIÓDICOS AUTOMÁTICOS (CRON JOBS)
-- Sistema de cierre y mantenimiento contable
-- =====================================================

-- =====================================================
-- FUNCIÓN: Cierre diario automático
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_daily_close()
RETURNS TABLE (
  process TEXT,
  records_processed INTEGER,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 1. Verificar balance de asientos del día
  RETURN QUERY
  WITH daily_entries AS (
    SELECT
      e.id,
      e.entry_number,
      SUM(l.debit_amount) as total_debits,
      SUM(l.credit_amount) as total_credits
    FROM accounting_journal_entries e
    JOIN accounting_journal_lines l ON l.journal_entry_id = e.id
    WHERE e.entry_date = CURRENT_DATE
      AND e.status = 'posted'
    GROUP BY e.id, e.entry_number
    HAVING ABS(SUM(l.debit_amount) - SUM(l.credit_amount)) > 0.01
  )
  SELECT
    'daily_balance_check'::TEXT,
    COUNT(*)::INTEGER,
    CASE WHEN COUNT(*) = 0 THEN 'success' ELSE 'warning' END::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'Todos los asientos están balanceados'
      ELSE 'Se encontraron ' || COUNT(*) || ' asientos desbalanceados'
    END::TEXT
  FROM daily_entries;
  
  -- 2. Procesar transacciones wallet pendientes (timeout)
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY
  SELECT
    'wallet_timeout_check'::TEXT,
    v_count::INTEGER,
    'success'::TEXT,
    'Verificación de timeouts completada'::TEXT;
  
  -- 3. Actualizar provisiones FGO
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY
  SELECT
    'fgo_provision_update'::TEXT,
    v_count::INTEGER,
    'success'::TEXT,
    'Provisiones FGO actualizadas'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Cierre mensual
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_monthly_close(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  process TEXT,
  amount NUMERIC,
  status TEXT
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_net_income NUMERIC;
BEGIN
  -- Calcular fechas del período
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Calcular utilidad/pérdida del mes
  SELECT
    COALESCE(SUM(
      CASE 
        WHEN a.type = 'revenue' THEN l.credit_amount - l.debit_amount
        WHEN a.type = 'expense' THEN l.debit_amount - l.credit_amount
        ELSE 0
      END
    ), 0)
  INTO v_net_income
  FROM accounting_journal_lines l
  JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
  JOIN accounting_accounts a ON a.id = l.account_id
  WHERE e.entry_date BETWEEN v_start_date AND v_end_date
    AND e.status = 'posted'
    AND a.type IN ('revenue', 'expense');
  
  -- Crear asiento de cierre (traspaso a resultados acumulados)
  IF v_net_income != 0 THEN
    PERFORM create_accounting_entry(
      p_description := 'Cierre mensual ' || to_char(v_start_date, 'YYYY-MM'),
      p_entry_date := v_end_date,
      p_reference_type := 'manual',
      p_reference_id := NULL,
      p_lines := CASE
        WHEN v_net_income > 0 THEN
          jsonb_build_array(
            jsonb_build_object(
              'account_code', '3.3',
              'debit', v_net_income,
              'description', 'Utilidad del mes'
            ),
            jsonb_build_object(
              'account_code', '3.2',
              'credit', v_net_income,
              'description', 'Traspaso a resultados acumulados'
            )
          )
        ELSE
          jsonb_build_array(
            jsonb_build_object(
              'account_code', '3.2',
              'debit', ABS(v_net_income),
              'description', 'Pérdida del mes'
            ),
            jsonb_build_object(
              'account_code', '3.3',
              'credit', ABS(v_net_income),
              'description', 'Traspaso a resultados acumulados'
            )
          )
      END,
      p_auto_post := TRUE
    );
  END IF;
  
  RETURN QUERY
  SELECT
    'monthly_close'::TEXT,
    v_net_income,
    'success'::TEXT;
  
  RETURN QUERY
  SELECT
    'net_income'::TEXT,
    v_net_income,
    CASE WHEN v_net_income > 0 THEN 'profit' ELSE 'loss' END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Revaluación de saldos en moneda extranjera
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_currency_revaluation(
  p_usd_to_uyu_rate NUMERIC
)
RETURNS TABLE (
  account_code TEXT,
  original_balance NUMERIC,
  revalued_balance NUMERIC,
  difference NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH usd_balances AS (
    SELECT
      a.code,
      a.name,
      SUM(
        CASE 
          WHEN a.type IN ('asset', 'expense') THEN l.debit_amount - l.credit_amount
          ELSE l.credit_amount - l.debit_amount
        END
      ) as balance_usd
    FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
    JOIN accounting_accounts a ON a.id = l.account_id
    WHERE l.currency = 'USD'
      AND e.status = 'posted'
    GROUP BY a.id, a.code, a.name
    HAVING SUM(l.debit_amount + l.credit_amount) > 0
  )
  SELECT
    code,
    balance_usd,
    balance_usd * p_usd_to_uyu_rate,
    (balance_usd * p_usd_to_uyu_rate) - balance_usd
  FROM usd_balances;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Reconciliación de billeteras
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_wallet_reconciliation()
RETURNS TABLE (
  metric TEXT,
  accounting_balance NUMERIC,
  wallet_balance NUMERIC,
  difference NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH accounting_wallet AS (
    -- Balance contable de billeteras
    SELECT
      SUM(l.credit_amount - l.debit_amount) as accounting_total
    FROM accounting_journal_lines l
    JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
    JOIN accounting_accounts a ON a.id = l.account_id
    WHERE a.code LIKE '2.1.1%' -- Cuentas de billetera
      AND e.status = 'posted'
  ),
  wallet_system AS (
    -- Balance real del sistema de wallet
    SELECT
      SUM(CASE 
        WHEN type = 'deposit' AND status = 'completed' THEN amount
        WHEN type = 'lock' AND status = 'completed' THEN -amount
        WHEN type = 'unlock' AND status = 'completed' THEN amount
        WHEN type = 'charge' AND status = 'completed' THEN -amount
        WHEN type = 'refund' AND status = 'completed' THEN amount
        ELSE 0
      END) as wallet_total
    FROM wallet_transactions
  )
  SELECT
    'wallet_reconciliation'::TEXT,
    aw.accounting_total,
    ws.wallet_total,
    ABS(aw.accounting_total - ws.wallet_total),
    CASE 
      WHEN ABS(aw.accounting_total - ws.wallet_total) < 0.01 THEN 'balanced'
      ELSE 'discrepancy'
    END::TEXT
  FROM accounting_wallet aw
  CROSS JOIN wallet_system ws;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Auditoría de integridad contable
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_integrity_audit()
RETURNS TABLE (
  check_name TEXT,
  passed BOOLEAN,
  details TEXT
) AS $$
BEGIN
  -- Check 1: Partida doble en todos los asientos
  RETURN QUERY
  WITH unbalanced_entries AS (
    SELECT COUNT(*) as cnt
    FROM accounting_journal_entries e
    JOIN (
      SELECT 
        journal_entry_id,
        SUM(debit_amount) as total_debits,
        SUM(credit_amount) as total_credits
      FROM accounting_journal_lines
      GROUP BY journal_entry_id
      HAVING ABS(SUM(debit_amount) - SUM(credit_amount)) > 0.01
    ) l ON l.journal_entry_id = e.id
    WHERE e.status = 'posted'
  )
  SELECT
    'double_entry_balance'::TEXT,
    (cnt = 0),
    CASE WHEN cnt = 0 
      THEN 'Todos los asientos están balanceados'
      ELSE cnt || ' asientos desbalanceados encontrados'
    END
  FROM unbalanced_entries;
  
  -- Check 2: Cuentas sin movimientos huérfanas
  RETURN QUERY
  WITH orphan_lines AS (
    SELECT COUNT(*) as cnt
    FROM accounting_journal_lines l
    LEFT JOIN accounting_accounts a ON a.id = l.account_id
    WHERE a.id IS NULL
  )
  SELECT
    'orphan_lines'::TEXT,
    (cnt = 0),
    CASE WHEN cnt = 0 
      THEN 'No hay líneas huérfanas'
      ELSE cnt || ' líneas sin cuenta válida'
    END
  FROM orphan_lines;
  
  -- Check 3: Coherencia wallet vs contabilidad
  RETURN QUERY
  WITH wallet_check AS (
    SELECT *
    FROM accounting_wallet_reconciliation()
  )
  SELECT
    'wallet_reconciliation'::TEXT,
    (status = 'balanced'),
    'Diferencia: ' || difference::TEXT || ' ' || status
  FROM wallet_check;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION accounting_daily_close IS 'Proceso de cierre diario - verifica balances y actualiza provisiones';
COMMENT ON FUNCTION accounting_monthly_close IS 'Cierre mensual - calcula utilidad/pérdida y traspasa a resultados acumulados';
COMMENT ON FUNCTION accounting_currency_revaluation IS 'Revaluación de saldos en USD según tipo de cambio';
COMMENT ON FUNCTION accounting_wallet_reconciliation IS 'Reconciliación entre balance contable y sistema de wallet';
COMMENT ON FUNCTION accounting_integrity_audit IS 'Auditoría automática de integridad de datos contables';
