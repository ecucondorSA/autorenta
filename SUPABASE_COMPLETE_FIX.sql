-- ============================================================================
-- SUPABASE COMPLETE FIX - HIGH_SEQ_SCANS + RLS_NO_POLICY
-- ============================================================================
-- Database: pisqjmoklivzpwufhscx (São Paulo)
-- Date: 2025-11-24
-- Action: Fix performance issues (seq scans) + add RLS security policies
-- ============================================================================

-- ============================================================================
-- PHASE 1: FIX HIGH_SEQ_SCANS (Performance Optimization)
-- ============================================================================

-- Índices para bookings (339,492 scans)
CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON public.bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON public.bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);

-- Índices para cars (140,311 scans)
CREATE INDEX IF NOT EXISTS idx_cars_owner_id ON public.cars(owner_id);
CREATE INDEX IF NOT EXISTS idx_cars_status ON public.cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_created_at ON public.cars(created_at);

-- Índices para profiles (40,973 scans)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Índices para car_photos (31,514 scans)
CREATE INDEX IF NOT EXISTS idx_car_photos_car_id ON public.car_photos(car_id);

-- Índices para messages (7,288 scans)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Índices para user_verifications (6,175 scans)
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON public.user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON public.user_verifications(status);

-- Índices para accounting_ledger (4,801 scans)
CREATE INDEX IF NOT EXISTS idx_accounting_ledger_account_id ON public.accounting_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_accounting_ledger_created_at ON public.accounting_ledger(created_at);

-- Índices para notifications (1,325 scans)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Índices para reviews (1,964 scans)
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);

-- Índices para pricing_regions (1,224 scans)
CREATE INDEX IF NOT EXISTS idx_pricing_regions_region_code ON public.pricing_regions(region_code);

-- ============================================================================
-- PHASE 2: ADD RLS POLICIES FOR CRITICAL TABLES
-- ============================================================================

-- 1. fgo_subfunds - Restricted to admins only
ALTER TABLE public.fgo_subfunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "fgo_subfunds_admin_only"
  ON public.fgo_subfunds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system')
    )
  );

-- 2. fgo_metrics - Restricted to admins and data analysts
ALTER TABLE public.fgo_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "fgo_metrics_read_restricted"
  ON public.fgo_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system', 'analyst')
    )
  );

-- 3. encryption_audit_log - User can see their own, admins see all
ALTER TABLE public.encryption_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "encryption_audit_log_owner_or_admin"
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
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "monitoring_alerts_admin_only"
  ON public.monitoring_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system')
    )
  );

-- 5. monitoring_performance_metrics - Admins and system only
ALTER TABLE public.monitoring_performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "monitoring_perf_metrics_admin_only"
  ON public.monitoring_performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system')
    )
  );

-- 6. mp_webhook_logs - Admins only (Mercado Pago sensitive)
ALTER TABLE public.mp_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "mp_webhook_logs_admin_only"
  ON public.mp_webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 7. wallet_transaction_backups - Admins and accounting only
ALTER TABLE public.wallet_transaction_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "wallet_backups_accounting_admin"
  ON public.wallet_transaction_backups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting')
    )
  );

-- 8. accounting_audit_log - Accounting and admins only
ALTER TABLE public.accounting_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "accounting_audit_log_restricted"
  ON public.accounting_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 9. accounting_period_balances - Accounting and admins only
ALTER TABLE public.accounting_period_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "accounting_period_balances_restricted"
  ON public.accounting_period_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 10. accounting_period_closures - Accounting and admins only
ALTER TABLE public.accounting_period_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "accounting_period_closures_restricted"
  ON public.accounting_period_closures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 11. accounting_provisions - Accounting and admins only
ALTER TABLE public.accounting_provisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "accounting_provisions_restricted"
  ON public.accounting_provisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 12. accounting_revenue_recognition - Accounting and admins only
ALTER TABLE public.accounting_revenue_recognition ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "accounting_revenue_recognition_restricted"
  ON public.accounting_revenue_recognition FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 13. driver_score_snapshots - User sees own, admins see all
ALTER TABLE public.driver_score_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "driver_score_snapshots_owner_or_admin"
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
ALTER TABLE public.pricing_class_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "pricing_class_factors_public_read"
  ON public.pricing_class_factors FOR SELECT
  USING (true);

-- 15. vehicle_pricing_models - Public read (affects pricing display)
ALTER TABLE public.vehicle_pricing_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "vehicle_pricing_models_public_read"
  ON public.vehicle_pricing_models FOR SELECT
  USING (true);

-- 16. system_flags - Admins only (system configuration)
ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "system_flags_admin_only"
  ON public.system_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'system')
    )
  );

-- 17. accounting_accounts (Chart of Accounts) - Accounting and admins
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "accounting_accounts_restricted"
  ON public.accounting_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- 18. accounting_chart_of_accounts - Accounting and admins
ALTER TABLE public.accounting_chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "accounting_chart_of_accounts_restricted"
  ON public.accounting_chart_of_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'accounting', 'system')
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'fgo_subfunds', 'fgo_metrics', 'encryption_audit_log', 'monitoring_alerts',
  'monitoring_performance_metrics', 'mp_webhook_logs', 'wallet_transaction_backups',
  'accounting_audit_log', 'accounting_period_balances', 'accounting_period_closures',
  'accounting_provisions', 'accounting_revenue_recognition', 'driver_score_snapshots',
  'pricing_class_factors', 'vehicle_pricing_models', 'system_flags',
  'accounting_accounts', 'accounting_chart_of_accounts'
)
ORDER BY tablename;

-- Verify policies created
SELECT tablename, policyname, cmd, qual
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

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- ✅ Indexes created: ~20 new indexes on high-scan tables
-- ✅ RLS enabled: 18 public tables
-- ✅ Policies created: 18 policies (with appropriate access levels)
-- ============================================================================
