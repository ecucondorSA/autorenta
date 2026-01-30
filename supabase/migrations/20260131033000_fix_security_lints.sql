-- ============================================================================
-- FIX: Security lints (views, RLS, search_path, extensions)
-- Date: 2026-01-31
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Views: enforce SECURITY INVOKER to honor caller RLS
-- ---------------------------------------------------------------------------
ALTER VIEW IF EXISTS public.owner_bookings SET (security_invoker = true);
ALTER VIEW IF EXISTS public.my_bookings SET (security_invoker = true);
ALTER VIEW IF EXISTS public.me_profile SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_active_vehicle_tracking SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_active_return_protocols SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_owner_community_status SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_car_sharing_status SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_owner_icp_dashboard SET (security_invoker = true);

-- ---------------------------------------------------------------------------
-- 2) RLS: replace permissive TRUE policies with bounded checks
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.ai_content_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_content_cache_service_write" ON public.ai_content_cache;
CREATE POLICY "ai_content_cache_service_write"
  ON public.ai_content_cache
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.car_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert car views" ON public.car_views;
CREATE POLICY "Anyone can insert car views"
  ON public.car_views
  FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

ALTER TABLE IF EXISTS public.feature_flag_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flag_events_insert_any" ON public.feature_flag_events;
CREATE POLICY "flag_events_insert_any"
  ON public.feature_flag_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

ALTER TABLE IF EXISTS public.marketing_content_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can insert queue" ON public.marketing_content_queue;
DROP POLICY IF EXISTS "Authenticated users can update queue" ON public.marketing_content_queue;
DROP POLICY IF EXISTS "Authenticated users can delete queue" ON public.marketing_content_queue;
CREATE POLICY "Authenticated users can insert queue"
  ON public.marketing_content_queue
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update queue"
  ON public.marketing_content_queue
  FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete queue"
  ON public.marketing_content_queue
  FOR DELETE TO authenticated
  USING (auth.role() = 'authenticated');

ALTER TABLE IF EXISTS public.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.notification_logs;
CREATE POLICY "Service role full access"
  ON public.notification_logs
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.owner_usage_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow system insert on booking" ON public.owner_usage_limits;
CREATE POLICY "Allow system insert on booking"
  ON public.owner_usage_limits
  FOR INSERT TO authenticated, service_role
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

ALTER TABLE IF EXISTS public.passkey_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access to challenges" ON public.passkey_challenges;
CREATE POLICY "Service role full access to challenges"
  ON public.passkey_challenges
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.photo_quality_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can insert photo quality logs" ON public.photo_quality_logs;
CREATE POLICY "Service role can insert photo quality logs"
  ON public.photo_quality_logs
  FOR INSERT TO service_role
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.plate_detection_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can insert plate detection logs" ON public.plate_detection_logs;
CREATE POLICY "Service role can insert plate detection logs"
  ON public.plate_detection_logs
  FOR INSERT TO service_role
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.recommendation_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rec_clicks_insert_any" ON public.recommendation_clicks;
CREATE POLICY "rec_clicks_insert_any"
  ON public.recommendation_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
CREATE POLICY "Users can create referrals"
  ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (referred_id = auth.uid());

ALTER TABLE IF EXISTS public.risk_score_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can insert risk history" ON public.risk_score_history;
CREATE POLICY "System can insert risk history"
  ON public.risk_score_history
  FOR INSERT TO service_role
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.sdui_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sdui_analytics_insert_any" ON public.sdui_analytics;
CREATE POLICY "sdui_analytics_insert_any"
  ON public.sdui_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.user_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage wallets" ON public.user_wallets;
CREATE POLICY "Service role can manage wallets"
  ON public.user_wallets
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE IF EXISTS public.vehicle_recognition_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can insert recognition logs" ON public.vehicle_recognition_logs;
CREATE POLICY "Service role can insert recognition logs"
  ON public.vehicle_recognition_logs
  FOR INSERT TO service_role
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 3) Functions: set deterministic search_path (non-extension functions only)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema,
           p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND d.objid IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, '{}'::text[])) c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, extensions',
      r.schema,
      r.name,
      r.args
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Extensions: move out of public schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'btree_gist' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION btree_gist SET SCHEMA extensions;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'cube' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION cube SET SCHEMA extensions;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'earthdistance' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION earthdistance SET SCHEMA extensions;
  END IF;
END $$;

-- Ensure runtime roles can resolve extension operators/functions if used in SQL
ALTER ROLE anon SET search_path = public, extensions;
ALTER ROLE authenticated SET search_path = public, extensions;
ALTER ROLE service_role SET search_path = public, extensions;

COMMIT;
