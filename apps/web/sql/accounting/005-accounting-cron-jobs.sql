-- =====================================================
-- CRON JOBS PARA CIERRE CONTABLE AUTOMÁTICO
-- Se ejecutan periódicamente para mantener el sistema actualizado
-- =====================================================

-- Job 1: Refrescar balances cada hora
SELECT cron.schedule(
  'refresh-accounting-balances',
  '0 * * * *', -- Cada hora
  $$
  SELECT refresh_accounting_balances();
  $$
);

-- Job 2: Cierre mensual automático (día 1 de cada mes a las 2 AM)
CREATE OR REPLACE FUNCTION accounting_monthly_close()
RETURNS VOID AS $$
DECLARE
  v_previous_month VARCHAR(7);
  v_net_income DECIMAL(15, 2);
  v_entries JSONB;
BEGIN
  -- Período a cerrar (mes anterior)
  v_previous_month := TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM');
  
  -- Calcular utilidad neta del mes
  SELECT 
    COALESCE(SUM(CASE WHEN a.account_type = 'INCOME' 
                     THEN l.credit_amount - l.debit_amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN a.account_type = 'EXPENSE' 
                     THEN l.debit_amount - l.credit_amount ELSE 0 END), 0)
  INTO v_net_income
  FROM accounting_ledger l
  JOIN accounting_accounts a ON l.account_id = a.id
  WHERE l.fiscal_period = v_previous_month;
  
  -- Transferir resultado a patrimonio
  IF v_net_income != 0 THEN
    IF v_net_income > 0 THEN
      -- Utilidad - cerrar ingresos y gastos contra utilidad del ejercicio
      v_entries := jsonb_build_array(
        jsonb_build_object(
          'account_code', '4135', -- Cerrar ingresos
          'debit', v_net_income,
          'credit', 0,
          'description', 'Cierre de ingresos mes ' || v_previous_month
        ),
        jsonb_build_object(
          'account_code', '3610', -- A utilidad del ejercicio
          'debit', 0,
          'credit', v_net_income,
          'description', 'Utilidad neta mes ' || v_previous_month
        )
      );
    ELSE
      -- Pérdida
      v_entries := jsonb_build_array(
        jsonb_build_object(
          'account_code', '3610', -- Pérdida del ejercicio
          'debit', ABS(v_net_income),
          'credit', 0,
          'description', 'Pérdida neta mes ' || v_previous_month
        ),
        jsonb_build_object(
          'account_code', '5205', -- Cerrar gastos
          'debit', 0,
          'credit', ABS(v_net_income),
          'description', 'Cierre de gastos mes ' || v_previous_month
        )
      );
    END IF;
    
    PERFORM create_journal_entry(
      'MONTHLY_CLOSE',
      gen_random_uuid(),
      'accounting_periods',
      'Cierre contable mes ' || v_previous_month,
      v_entries,
      v_previous_month
    );
  END IF;
  
  -- Refrescar balances
  PERFORM refresh_accounting_balances();
  
  RAISE NOTICE 'Cierre mensual completado para %: Resultado $%', v_previous_month, v_net_income;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'monthly-accounting-close',
  '0 2 1 * *', -- Día 1 de cada mes a las 2 AM
  $$
  SELECT accounting_monthly_close();
  $$
);

-- Job 3: Verificar provisiones vencidas (diario a las 3 AM)
CREATE OR REPLACE FUNCTION accounting_check_expired_provisions()
RETURNS VOID AS $$
BEGIN
  -- Marcar como vencidas las provisiones no utilizadas después de 90 días
  UPDATE accounting_provisions
  SET status = 'EXPIRED'
  WHERE status = 'ACTIVE'
    AND provision_date < NOW() - INTERVAL '90 days'
    AND provision_type = 'SECURITY_DEPOSIT';
  
  -- Liberar provisiones vencidas
  WITH expired_provisions AS (
    SELECT id, provision_amount, reference_id
    FROM accounting_provisions
    WHERE status = 'EXPIRED' AND released_amount = 0
  )
  UPDATE accounting_provisions p
  SET released_amount = p.provision_amount,
      release_date = NOW()
  FROM expired_provisions ep
  WHERE p.id = ep.id;
  
  RAISE NOTICE 'Verificación de provisiones completada';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'check-expired-provisions',
  '0 3 * * *', -- Diario a las 3 AM
  $$
  SELECT accounting_check_expired_provisions();
  $$
);

-- Job 4: Conciliación automática wallet vs contabilidad (diario a las 4 AM)
CREATE OR REPLACE FUNCTION accounting_wallet_auto_reconciliation()
RETURNS VOID AS $$
DECLARE
  v_wallet_total DECIMAL(15, 2);
  v_accounting_total DECIMAL(15, 2);
  v_difference DECIMAL(15, 2);
BEGIN
  -- Obtener totales
  SELECT COALESCE(SUM(balance), 0) INTO v_wallet_total
  FROM user_wallet_balances;
  
  SELECT balance INTO v_accounting_total
  FROM accounting_balance_sheet
  WHERE code = '2805';
  
  v_difference := v_wallet_total - COALESCE(v_accounting_total, 0);
  
  -- Si hay diferencia, registrar alerta
  IF ABS(v_difference) > 0.01 THEN
    INSERT INTO accounting_ledger (
      account_id,
      debit_amount,
      credit_amount,
      transaction_type,
      description,
      fiscal_period
    )
    SELECT 
      (SELECT id FROM accounting_accounts WHERE code = '1901'),
      CASE WHEN v_difference > 0 THEN v_difference ELSE 0 END,
      CASE WHEN v_difference < 0 THEN ABS(v_difference) ELSE 0 END,
      'RECONCILIATION_ALERT',
      'ALERTA: Diferencia en conciliación wallet: $' || v_difference::text,
      TO_CHAR(NOW(), 'YYYY-MM');
    
    RAISE WARNING 'Diferencia en conciliación wallet: Wallet=$% Contabilidad=$% Diff=$%', 
                  v_wallet_total, v_accounting_total, v_difference;
  ELSE
    RAISE NOTICE 'Conciliación wallet OK: $%', v_wallet_total;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'wallet-reconciliation',
  '0 4 * * *', -- Diario a las 4 AM
  $$
  SELECT accounting_wallet_auto_reconciliation();
  $$
);

-- Job 5: Backup de transacciones contables (semanal - domingos a las 5 AM)
CREATE OR REPLACE FUNCTION accounting_weekly_backup()
RETURNS VOID AS $$
DECLARE
  v_backup_date VARCHAR(10);
BEGIN
  v_backup_date := TO_CHAR(NOW(), 'YYYY-MM-DD');
  
  -- Crear tabla de respaldo si no existe
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS accounting_ledger_backup_%s AS
    SELECT * FROM accounting_ledger WHERE 1=0
  ', REPLACE(v_backup_date, '-', '_'));
  
  -- Insertar registros de la última semana
  EXECUTE format('
    INSERT INTO accounting_ledger_backup_%s
    SELECT * FROM accounting_ledger
    WHERE entry_date >= NOW() - INTERVAL ''7 days''
    ON CONFLICT DO NOTHING
  ', REPLACE(v_backup_date, '-', '_'));
  
  RAISE NOTICE 'Backup semanal completado: accounting_ledger_backup_%', REPLACE(v_backup_date, '-', '_');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'weekly-accounting-backup',
  '0 5 * * 0', -- Domingos a las 5 AM
  $$
  SELECT accounting_weekly_backup();
  $$
);

COMMENT ON FUNCTION accounting_monthly_close IS 'Cierre contable mensual automático - transfiere resultado a patrimonio';
COMMENT ON FUNCTION accounting_check_expired_provisions IS 'Verifica y libera provisiones vencidas';
COMMENT ON FUNCTION accounting_wallet_auto_reconciliation IS 'Conciliación automática entre wallet y contabilidad';
COMMENT ON FUNCTION accounting_weekly_backup IS 'Backup semanal de transacciones contables';
