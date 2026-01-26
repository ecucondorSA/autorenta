-- =====================================================
-- CRON JOBS PARA SISTEMA CONTABLE AUTOMATIZADO
-- Requiere pg_cron extension
-- =====================================================

-- Habilitar pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 1. CIERRE DIARIO AUTOMÁTICO (00:01 todos los días)
-- =====================================================
SELECT cron.schedule(
  'accounting-daily-closure',
  '1 0 * * *', -- 00:01 AM todos los días
  $$
  SELECT accounting_daily_closure();
  $$
);

-- =====================================================
-- 2. CIERRE MENSUAL AUTOMÁTICO (día 1 de cada mes a las 02:00)
-- =====================================================
SELECT cron.schedule(
  'accounting-monthly-closure',
  '0 2 1 * *', -- 02:00 AM el primer día de cada mes
  $$
  SELECT accounting_monthly_closure();
  $$
);

-- =====================================================
-- 3. AUDITORÍA AUTOMÁTICA (cada 6 horas)
-- =====================================================
SELECT cron.schedule(
  'accounting-auto-audit',
  '0 */6 * * *', -- Cada 6 horas
  $$
  SELECT accounting_auto_audit();
  $$
);

-- =====================================================
-- 4. RECONCILIACIÓN BILLETERAS (cada hora)
-- =====================================================
SELECT cron.schedule(
  'accounting-wallet-reconciliation',
  '0 * * * *', -- Cada hora en punto
  $$
  SELECT accounting_verify_wallet_liabilities();
  $$
);

-- =====================================================
-- 5. LIMPIEZA DE ALERTAS RESUELTAS (semanal)
-- =====================================================
SELECT cron.schedule(
  'accounting-cleanup-resolved-alerts',
  '0 3 * * 0', -- 03:00 AM todos los domingos
  $$
  DELETE FROM accounting_audit_log
  WHERE resolution_status = 'resolved'
    AND resolved_at < NOW() - INTERVAL '90 days';
  $$
);

-- =====================================================
-- 6. PROVISIONES FGO AUTOMÁTICAS (diario a las 23:00)
-- Calcula y ajusta provisiones basado en exposición
-- =====================================================
SELECT cron.schedule(
  'accounting-fgo-provisions',
  '0 23 * * *', -- 23:00 todos los días
  $$
  WITH active_exposure AS (
    SELECT 
      COALESCE(SUM(total_price * 0.05), 0) as expected_claims
    FROM bookings
    WHERE status IN ('active', 'in_progress')
  ),
  current_provision AS (
    SELECT COALESCE(SUM(credit - debit), 0) as provision_balance
    FROM accounting_ledger
    WHERE account_code = '2150' -- Provisión FGO
  )
  INSERT INTO accounting_ledger (
    account_code, debit, credit, description,
    fiscal_period, is_closing_entry
  )
  SELECT 
    CASE 
      WHEN ae.expected_claims > cp.provision_balance 
      THEN '5220' -- Gasto: incrementar provisión
      ELSE '2150' -- Crédito: disminuir provisión
    END,
    CASE 
      WHEN ae.expected_claims > cp.provision_balance 
      THEN ae.expected_claims - cp.provision_balance
      ELSE 0
    END,
    CASE 
      WHEN ae.expected_claims < cp.provision_balance 
      THEN cp.provision_balance - ae.expected_claims
      ELSE ae.expected_claims - cp.provision_balance
    END,
    'Ajuste automático provisión FGO según exposición',
    TO_CHAR(NOW(), 'YYYY-MM'),
    false
  FROM active_exposure ae, current_provision cp
  WHERE ABS(ae.expected_claims - cp.provision_balance) > 100; -- Solo si diferencia > 100
  $$
);

-- =====================================================
-- 7. REPORTE AUTOMÁTICO DIARIO (enviar a admins)
-- =====================================================
CREATE OR REPLACE FUNCTION accounting_daily_report_email()
RETURNS VOID AS $$
DECLARE
  v_report TEXT;
  v_admin_emails TEXT[];
BEGIN
  -- Obtener emails de admins
  SELECT ARRAY_AGG(email)
  INTO v_admin_emails
  FROM auth.users u
  JOIN user_profiles up ON up.id = u.id
  WHERE up.role = 'admin';
  
  -- Generar reporte
  WITH daily_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE type = 'deposit') as deposits_count,
      COALESCE(SUM(amount) FILTER (WHERE type = 'deposit'), 0) as deposits_total,
      COUNT(*) FILTER (WHERE type = 'withdrawal') as withdrawals_count,
      COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal'), 0) as withdrawals_total
    FROM wallet_transactions
    WHERE created_at >= CURRENT_DATE
      AND created_at < CURRENT_DATE + INTERVAL '1 day'
      AND status = 'completed'
  ),
  revenue_stats AS (
    SELECT 
      COUNT(*) as bookings_completed,
      COALESCE(SUM(commission_amount), 0) as total_commission
    FROM accounting_revenue_recognition
    WHERE recognition_date >= CURRENT_DATE
      AND recognition_date < CURRENT_DATE + INTERVAL '1 day'
  ),
  audit_issues AS (
    SELECT COUNT(*) as critical_issues
    FROM accounting_audit_log
    WHERE severity IN ('error', 'critical')
      AND resolution_status = 'pending'
      AND created_at >= CURRENT_DATE
  )
  SELECT format(
    E'REPORTE CONTABLE DIARIO - %s\n\n' ||
    'TRANSACCIONES:\n' ||
    '  Depósitos: %s transacciones por $%s\n' ||
    '  Retiros: %s transacciones por $%s\n\n' ||
    'INGRESOS:\n' ||
    '  Bookings completados: %s\n' ||
    '  Comisiones generadas: $%s\n\n' ||
    'ALERTAS:\n' ||
    '  Issues críticos pendientes: %s\n',
    CURRENT_DATE,
    ds.deposits_count, ds.deposits_total,
    ds.withdrawals_count, ds.withdrawals_total,
    rs.bookings_completed, rs.total_commission,
    ai.critical_issues
  )
  INTO v_report
  FROM daily_stats ds, revenue_stats rs, audit_issues ai;
  
  -- Enviar email (requiere configurar Supabase Edge Function)
  -- PERFORM net.http_post(
  --   url := 'https://your-project.supabase.co/functions/v1/send-email',
  --   body := jsonb_build_object(
  --     'to', v_admin_emails,
  --     'subject', 'Reporte Contable Diario - AutoRenta',
  --     'body', v_report
  --   )
  -- );
  
  -- Por ahora, solo logear
  RAISE NOTICE '%', v_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'accounting-daily-report',
  '30 23 * * *', -- 23:30 todos los días
  $$
  SELECT accounting_daily_report_email();
  $$
);

-- =====================================================
-- Ver estado de cron jobs
-- =====================================================
-- SELECT * FROM cron.job WHERE jobname LIKE 'accounting%';

-- =====================================================
-- Eliminar un cron job si es necesario
-- =====================================================
-- SELECT cron.unschedule('accounting-daily-closure');

COMMENT ON FUNCTION accounting_daily_report_email IS 'Genera y envía reporte contable diario a administradores.';
