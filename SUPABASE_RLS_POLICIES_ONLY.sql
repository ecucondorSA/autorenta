-- ============================================================================
-- SUPABASE RLS POLICIES - Create policies for 18 critical tables
-- ============================================================================
-- Note: Removed IF NOT EXISTS (not supported in PostgreSQL 13)
-- ============================================================================

-- 1. fgo_subfunds - Restricted to admins only
DROP POLICY IF EXISTS "fgo_subfunds_admin_only" ON public.fgo_subfunds;
CREATE POLICY "fgo_subfunds_admin_only"
  ON public.fgo_subfunds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system')
    )
  );

-- 2. fgo_metrics - Restricted to admins and data analysts
DROP POLICY IF EXISTS "fgo_metrics_read_restricted" ON public.fgo_metrics;
CREATE POLICY "fgo_metrics_read_restricted"
  ON public.fgo_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system', 'analyst')
    )
  );

-- 3. encryption_audit_log - User can see their own, admins see all
DROP POLICY IF EXISTS "encryption_audit_log_owner_or_admin" ON public.encryption_audit_log;
CREATE POLICY "encryption_audit_log_owner_or_admin"
  ON public.encryption_audit_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system')
    )
  );

-- 4. monitoring_alerts - Admins and system only
DROP POLICY IF EXISTS "monitoring_alerts_admin_only" ON public.monitoring_alerts;
CREATE POLICY "monitoring_alerts_admin_only"
  ON public.monitoring_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system')
    )
  );

-- 5. monitoring_performance_metrics - Admins and system only
DROP POLICY IF EXISTS "monitoring_perf_metrics_admin_only" ON public.monitoring_performance_metrics;
CREATE POLICY "monitoring_perf_metrics_admin_only"
  ON public.monitoring_performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system')
    )
  );

-- 6. mp_webhook_logs - Admins only (Mercado Pago sensitive)
DROP POLICY IF EXISTS "mp_webhook_logs_admin_only" ON public.mp_webhook_logs;
CREATE POLICY "mp_webhook_logs_admin_only"
  ON public.mp_webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 7. wallet_transaction_backups - Admins and accounting only
DROP POLICY IF EXISTS "wallet_backups_accounting_admin" ON public.wallet_transaction_backups;
CREATE POLICY "wallet_backups_accounting_admin"
  ON public.wallet_transaction_backups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting')
    )
  );

-- 8. accounting_audit_log - Accounting and admins only
DROP POLICY IF EXISTS "accounting_audit_log_restricted" ON public.accounting_audit_log;
CREATE POLICY "accounting_audit_log_restricted"
  ON public.accounting_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 9. accounting_period_balances - Accounting and admins only
DROP POLICY IF EXISTS "accounting_period_balances_restricted" ON public.accounting_period_balances;
CREATE POLICY "accounting_period_balances_restricted"
  ON public.accounting_period_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 10. accounting_period_closures - Accounting and admins only
DROP POLICY IF EXISTS "accounting_period_closures_restricted" ON public.accounting_period_closures;
CREATE POLICY "accounting_period_closures_restricted"
  ON public.accounting_period_closures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 11. accounting_provisions - Accounting and admins only
DROP POLICY IF EXISTS "accounting_provisions_restricted" ON public.accounting_provisions;
CREATE POLICY "accounting_provisions_restricted"
  ON public.accounting_provisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 12. accounting_revenue_recognition - Accounting and admins only
DROP POLICY IF EXISTS "accounting_revenue_recognition_restricted" ON public.accounting_revenue_recognition;
CREATE POLICY "accounting_revenue_recognition_restricted"
  ON public.accounting_revenue_recognition FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 13. driver_score_snapshots - User sees own, admins see all
DROP POLICY IF EXISTS "driver_score_snapshots_owner_or_admin" ON public.driver_score_snapshots;
CREATE POLICY "driver_score_snapshots_owner_or_admin"
  ON public.driver_score_snapshots FOR SELECT
  USING (
    driver_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system')
    )
  );

-- 14. pricing_class_factors - Public read (affects pricing display)
DROP POLICY IF EXISTS "pricing_class_factors_public_read" ON public.pricing_class_factors;
CREATE POLICY "pricing_class_factors_public_read"
  ON public.pricing_class_factors FOR SELECT
  USING (true);

-- 15. vehicle_pricing_models - Public read (affects pricing display)
DROP POLICY IF EXISTS "vehicle_pricing_models_public_read" ON public.vehicle_pricing_models;
CREATE POLICY "vehicle_pricing_models_public_read"
  ON public.vehicle_pricing_models FOR SELECT
  USING (true);

-- 16. system_flags - Admins only (system configuration)
DROP POLICY IF EXISTS "system_flags_admin_only" ON public.system_flags;
CREATE POLICY "system_flags_admin_only"
  ON public.system_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system')
    )
  );

-- 17. accounting_accounts (Chart of Accounts) - Accounting and admins
DROP POLICY IF EXISTS "accounting_accounts_restricted" ON public.accounting_accounts;
CREATE POLICY "accounting_accounts_restricted"
  ON public.accounting_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 18. accounting_chart_of_accounts - Accounting and admins
DROP POLICY IF EXISTS "accounting_chart_of_accounts_restricted" ON public.accounting_chart_of_accounts;
CREATE POLICY "accounting_chart_of_accounts_restricted"
  ON public.accounting_chart_of_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'fgo_subfunds', 'fgo_metrics', 'encryption_audit_log', 'monitoring_alerts',
  'monitoring_performance_metrics', 'mp_webhook_logs', 'wallet_transaction_backups',
  'accounting_audit_log', 'accounting_period_balances', 'accounting_period_closures',
  'accounting_provisions', 'accounting_revenue_recognition', 'driver_score_snapshots',
  'pricing_class_factors', 'vehicle_pricing_models', 'system_flags',
  'accounting_accounts', 'accounting_chart_of_accounts'
)
ORDER BY tablename, policyname;
