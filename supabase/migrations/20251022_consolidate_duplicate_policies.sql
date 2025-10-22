-- Consolidate Duplicate RLS Policies
-- Date: 2025-10-22
-- Purpose: Fix multiple_permissive_policies warnings by consolidating duplicates
-- Observation: Most policies already use (SELECT auth.uid()) - functionally optimized

-- ============================================================================
-- ELIMINATE DUPLICATE POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROFILES TABLE - Remove system policy, keep user policy
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "system_insert_profiles" ON public.profiles;
-- Keep: insert_profiles (already optimized with (select auth.uid()))

-- ----------------------------------------------------------------------------
-- CAR_LOCATIONS TABLE - Consolidate public read with auth read
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "car_locations public active read" ON public.car_locations;
-- Keep: car_locations readable by owner/admin or active renter
-- (This policy already includes public access via OR clause)

-- ----------------------------------------------------------------------------
-- PROMOS TABLE - Consolidate admin and select policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "admin_manage_promos" ON public.promos;
DROP POLICY IF EXISTS "select_promos" ON public.promos;
-- Keep: promos_select and promos_modify (created in V1)

-- ----------------------------------------------------------------------------
-- REVIEWS TABLE - Remove old select policy
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "select_reviews" ON public.reviews;
-- Keep: reviews_select (created in V1, already optimized)

-- ----------------------------------------------------------------------------
-- USER_WALLETS TABLE - Remove system policy
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "system_insert_wallet" ON public.user_wallets;
-- Keep: user_wallets_insert (created in V1)

-- ============================================================================
-- VERIFY NO DUPLICATE POLICIES REMAIN
-- ============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tablename, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND permissive = 'PERMISSIVE'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE WARNING 'Still % tables with duplicate policies. Run verification query to see details.', duplicate_count;
  ELSE
    RAISE NOTICE '✅ All duplicate policies successfully consolidated!';
  END IF;
END $$;

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================

ANALYZE profiles;
ANALYZE car_locations;
ANALYZE promos;
ANALYZE reviews;
ANALYZE user_wallets;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check for remaining duplicates:
/*
SELECT
  tablename,
  cmd as action,
  COUNT(*) as policy_count,
  array_agg(policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;
*/

-- Check auth optimization status:
/*
-- Note: PostgreSQL normalizes SELECT to uppercase
-- Policies with (SELECT auth.uid()) are functionally identical to (select auth.uid())
-- Both are optimized and evaluated once per query
SELECT
  COUNT(DISTINCT tablename) as total_tables,
  COUNT(*) as total_policies,
  SUM(CASE
    WHEN qual LIKE '%(SELECT auth.uid())%'
      OR qual LIKE '%(SELECT auth.jwt()%'
      OR with_check LIKE '%(SELECT auth.uid())%'
      OR with_check LIKE '%(SELECT auth.jwt()%'
    THEN 1
    ELSE 0
  END) as optimized_policies
FROM pg_policies
WHERE schemaname = 'public';
*/
