-- ============================================================================
-- FIX RLS SECURITY ISSUES - Accounting & Critical Tables
-- ============================================================================
-- Migración: 20251111_fix_rls_accounting_and_critical_tables.sql
-- Fecha: 2025-11-11
-- Branch: claude/fix-rls-security-issues-011CV1U26pqHVjfF8N5KcnKh
--
-- PROBLEMAS DETECTADOS:
-- 1. Tablas de accounting sin RLS (5 tablas)
-- 2. Tablas de wallet audit sin RLS (2 tablas)
-- 3. Otras tablas de sistema sin RLS
--
-- SOLUCIÓN:
-- - Habilitar RLS en todas las tablas públicas sin protección
-- - Crear políticas restrictivas (solo admins y service_role)
-- - Documentar excepciones justificadas
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: TABLAS DE ACCOUNTING
-- Solo admins y service_role deberían acceder a datos contables
-- ============================================================================

-- 1.1 accounting_accounts (Plan de cuentas)
-- ============================================================================
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admins pueden ver el plan de cuentas
CREATE POLICY "accounting_accounts_select_admin"
ON public.accounting_accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Solo service_role puede modificar (contabilidad automatizada)
CREATE POLICY "accounting_accounts_modify_system"
ON public.accounting_accounts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.accounting_accounts IS
'Plan de cuentas contable.
RLS habilitado 2025-11-11: Solo admins (lectura) y service_role (escritura).';

-- 1.2 accounting_audit_log (Logs de auditoría contable)
-- ============================================================================
ALTER TABLE public.accounting_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admins pueden ver logs de auditoría
CREATE POLICY "accounting_audit_log_select_admin"
ON public.accounting_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Solo service_role puede insertar logs
CREATE POLICY "accounting_audit_log_insert_system"
ON public.accounting_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Solo admins pueden eliminar logs (cleanup)
CREATE POLICY "accounting_audit_log_delete_admin"
ON public.accounting_audit_log
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

COMMENT ON TABLE public.accounting_audit_log IS
'Registro de auditoría del sistema contable.
RLS habilitado 2025-11-11: Solo admins (lectura/eliminación) y service_role (escritura).';

-- 1.3 accounting_chart_of_accounts (Catálogo de cuentas)
-- ============================================================================
-- Nota: Esta tabla puede no existir en todas las instalaciones
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'accounting_chart_of_accounts'
  ) THEN
    ALTER TABLE public.accounting_chart_of_accounts ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "accounting_chart_select_admin"
    ON public.accounting_chart_of_accounts
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

    CREATE POLICY "accounting_chart_modify_system"
    ON public.accounting_chart_of_accounts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    COMMENT ON TABLE public.accounting_chart_of_accounts IS
    'Catálogo de cuentas contables.
    RLS habilitado 2025-11-11: Solo admins (lectura) y service_role (escritura).';

    RAISE NOTICE 'RLS habilitado en accounting_chart_of_accounts';
  ELSE
    RAISE NOTICE 'Tabla accounting_chart_of_accounts no existe, saltando...';
  END IF;
END $$;

-- 1.4 accounting_period_balances (Balances periódicos)
-- ============================================================================
ALTER TABLE public.accounting_period_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_period_balances_select_admin"
ON public.accounting_period_balances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "accounting_period_balances_modify_system"
ON public.accounting_period_balances
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.accounting_period_balances IS
'Balances contables por período.
RLS habilitado 2025-11-11: Solo admins (lectura) y service_role (escritura).';

-- 1.5 accounting_period_closures (Cierres contables)
-- ============================================================================
-- Nota: Esta tabla puede no existir en todas las instalaciones
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'accounting_period_closures'
  ) THEN
    ALTER TABLE public.accounting_period_closures ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "accounting_period_closures_select_admin"
    ON public.accounting_period_closures
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

    CREATE POLICY "accounting_period_closures_modify_system"
    ON public.accounting_period_closures
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    COMMENT ON TABLE public.accounting_period_closures IS
    'Cierres de períodos contables.
    RLS habilitado 2025-11-11: Solo admins (lectura) y service_role (escritura).';

    RAISE NOTICE 'RLS habilitado en accounting_period_closures';
  ELSE
    RAISE NOTICE 'Tabla accounting_period_closures no existe, saltando...';
  END IF;
END $$;

-- ============================================================================
-- PARTE 2: TABLAS DE WALLET AUDIT
-- Logs de auditoría de wallet - solo admins
-- ============================================================================

-- 2.1 wallet_audit_log (Logs de auditoría de wallet)
-- ============================================================================
ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admins pueden ver logs de auditoría
CREATE POLICY "wallet_audit_log_select_admin"
ON public.wallet_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Solo service_role puede insertar logs
CREATE POLICY "wallet_audit_log_insert_system"
ON public.wallet_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Solo admins pueden eliminar logs (cleanup)
CREATE POLICY "wallet_audit_log_delete_admin"
ON public.wallet_audit_log
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

COMMENT ON TABLE public.wallet_audit_log IS
'Registro de auditoría de transacciones de wallet.
RLS habilitado 2025-11-11: Solo admins (lectura/eliminación) y service_role (escritura).';

-- 2.2 wallet_transaction_backups (Backups de transacciones)
-- ============================================================================
ALTER TABLE public.wallet_transaction_backups ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admins pueden ver backups
CREATE POLICY "wallet_transaction_backups_select_admin"
ON public.wallet_transaction_backups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Solo service_role puede crear backups
CREATE POLICY "wallet_transaction_backups_insert_system"
ON public.wallet_transaction_backups
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Solo admins pueden eliminar backups
CREATE POLICY "wallet_transaction_backups_delete_admin"
ON public.wallet_transaction_backups
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

COMMENT ON TABLE public.wallet_transaction_backups IS
'Backups diarios de transacciones de wallet.
RLS habilitado 2025-11-11: Solo admins (lectura/eliminación) y service_role (escritura).';

-- ============================================================================
-- PARTE 3: OTRAS TABLAS DE SISTEMA
-- ============================================================================

-- 3.1 pricing_demand_snapshots (Snapshots de demanda para pricing)
-- ============================================================================
-- Nota: Esta tabla puede no existir en todas las instalaciones
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'pricing_demand_snapshots'
  ) THEN
    ALTER TABLE public.pricing_demand_snapshots ENABLE ROW LEVEL SECURITY;

    -- Policy: Lectura pública (necesario para calcular precios)
    CREATE POLICY "pricing_demand_snapshots_select_public"
    ON public.pricing_demand_snapshots
    FOR SELECT
    TO authenticated, anon
    USING (true);

    -- Policy: Solo service_role puede insertar snapshots
    CREATE POLICY "pricing_demand_snapshots_insert_system"
    ON public.pricing_demand_snapshots
    FOR INSERT
    TO service_role
    WITH CHECK (true);

    COMMENT ON TABLE public.pricing_demand_snapshots IS
    'Snapshots de demanda para pricing dinámico.
    RLS habilitado 2025-11-11: Lectura pública, escritura solo service_role.';

    RAISE NOTICE 'RLS habilitado en pricing_demand_snapshots';
  ELSE
    RAISE NOTICE 'Tabla pricing_demand_snapshots no existe, saltando...';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN: Listar tablas con RLS habilitado
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  enabled_count INTEGER := 0;
  disabled_count INTEGER := 0;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN RLS - Estado de tablas en schema public';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  FOR r IN (
    SELECT
      tablename,
      rowsecurity,
      CASE
        WHEN rowsecurity = true THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS DESHABILITADO'
      END AS status
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
    ORDER BY rowsecurity ASC, tablename
  ) LOOP
    IF r.rowsecurity THEN
      enabled_count := enabled_count + 1;
    ELSE
      disabled_count := disabled_count + 1;
    END IF;

    RAISE NOTICE '%: %', r.status, r.tablename;
  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RESUMEN:';
  RAISE NOTICE '  ✅ Tablas con RLS habilitado: %', enabled_count;
  RAISE NOTICE '  ❌ Tablas sin RLS: %', disabled_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  IF disabled_count > 0 THEN
    RAISE WARNING 'Todavía hay % tablas sin RLS. Revisar manualmente.', disabled_count;
  ELSE
    RAISE NOTICE 'ÉXITO: Todas las tablas públicas tienen RLS habilitado.';
  END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

COMMIT;

-- Log de finalización
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Migración 20251111 aplicada exitosamente';
  RAISE NOTICE 'Fecha: 2025-11-11';
  RAISE NOTICE 'Branch: claude/fix-rls-security-issues-011CV1U26pqHVjfF8N5KcnKh';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Tablas aseguradas:';
  RAISE NOTICE '  ✅ accounting_accounts';
  RAISE NOTICE '  ✅ accounting_audit_log';
  RAISE NOTICE '  ✅ accounting_chart_of_accounts (si existe)';
  RAISE NOTICE '  ✅ accounting_period_balances';
  RAISE NOTICE '  ✅ accounting_period_closures (si existe)';
  RAISE NOTICE '  ✅ wallet_audit_log';
  RAISE NOTICE '  ✅ wallet_transaction_backups';
  RAISE NOTICE '  ✅ pricing_demand_snapshots (si existe)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Próximos pasos:';
  RAISE NOTICE '  1. Revisar funciones SECURITY DEFINER sin search_path';
  RAISE NOTICE '  2. Revisar vistas SECURITY DEFINER';
  RAISE NOTICE '  3. Habilitar leaked password protection en Auth';
  RAISE NOTICE '  4. Testing con roles anon, authenticated, service_role';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
