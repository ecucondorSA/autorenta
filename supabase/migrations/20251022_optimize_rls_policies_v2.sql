-- RLS Policies Optimization V2 (Fixed)
-- Date: 2025-10-22
-- Purpose: Fix auth_rls_initplan and multiple_permissive_policies warnings
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- This migration fixes column name issues from v1
-- Key fixes:
-- - bookings: no owner_id column (only renter_id + join to cars.owner_id)
-- - messages: recipient_id instead of receiver_id
-- - wallet_transfers: from_user/to_user instead of from_user_id/to_user_id
-- - promos: no "active" column

-- ============================================================================
-- PART 1: FIX FAILED POLICIES FROM V1
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CARS TABLE - Fix missing FOR clause
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "update_cars" ON public.cars;
CREATE POLICY "update_cars" ON public.cars
  FOR UPDATE
  USING ((select auth.uid()) = owner_id);

-- ----------------------------------------------------------------------------
-- BOOKINGS TABLE - Fix owner_id references
-- ----------------------------------------------------------------------------

-- Note: bookings doesn't have owner_id column directly
-- Must join to cars.owner_id for owner checks

DROP POLICY IF EXISTS "update_bookings" ON public.bookings;
CREATE POLICY "update_bookings" ON public.bookings
  FOR UPDATE
  USING (
    (select auth.uid()) = renter_id
    OR EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = bookings.car_id
        AND cars.owner_id = (select auth.uid())
    )
    OR (select auth.jwt()->>'role') = 'admin'
  );

DROP POLICY IF EXISTS "delete_bookings" ON public.bookings;
CREATE POLICY "delete_bookings" ON public.bookings
  FOR DELETE
  USING (
    (select auth.uid()) = renter_id
    OR EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = bookings.car_id
        AND cars.owner_id = (select auth.uid())
    )
    OR (select auth.jwt()->>'role') = 'admin'
  );

DROP POLICY IF EXISTS "select_bookings" ON public.bookings;
CREATE POLICY "select_bookings" ON public.bookings
  FOR SELECT
  USING (
    (select auth.uid()) = renter_id
    OR EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = bookings.car_id
        AND cars.owner_id = (select auth.uid())
    )
    OR (select auth.jwt()->>'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- PAYMENTS TABLE - Fix owner_id references
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "select_payments" ON public.payments;
CREATE POLICY "select_payments" ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      LEFT JOIN cars c ON c.id = b.car_id
      WHERE b.id = payments.booking_id
        AND (
          b.renter_id = (select auth.uid())
          OR c.owner_id = (select auth.uid())
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- MESSAGES TABLE - Fix receiver_id → recipient_id
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "select_messages" ON public.messages;
CREATE POLICY "select_messages" ON public.messages
  FOR SELECT
  USING (
    (select auth.uid()) IN (sender_id, recipient_id)
    OR (select auth.jwt()->>'role') = 'admin'
  );

DROP POLICY IF EXISTS "update_messages" ON public.messages;
CREATE POLICY "update_messages" ON public.messages
  FOR UPDATE
  USING ((select auth.uid()) = recipient_id); -- Only recipient can mark as read

-- ----------------------------------------------------------------------------
-- DISPUTES TABLE - Fix owner_id references
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_disputes" ON public.disputes;
CREATE POLICY "insert_disputes" ON public.disputes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      LEFT JOIN cars c ON c.id = b.car_id
      WHERE b.id = disputes.booking_id
        AND (select auth.uid()) IN (b.renter_id, c.owner_id)
    )
  );

DROP POLICY IF EXISTS "select_disputes" ON public.disputes;
CREATE POLICY "select_disputes" ON public.disputes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      LEFT JOIN cars c ON c.id = b.car_id
      WHERE b.id = disputes.booking_id
        AND (
          (select auth.uid()) IN (b.renter_id, c.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- DISPUTE_EVIDENCE TABLE - Fix owner_id references
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "evidence_insert_participants" ON public.dispute_evidence;
CREATE POLICY "evidence_insert_participants" ON public.dispute_evidence
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM disputes d
      JOIN bookings b ON b.id = d.booking_id
      JOIN cars c ON c.id = b.car_id
      WHERE d.id = dispute_evidence.dispute_id
        AND (select auth.uid()) IN (b.renter_id, c.owner_id)
    )
  );

DROP POLICY IF EXISTS "evidence_read_participants_or_admin" ON public.dispute_evidence;
CREATE POLICY "evidence_read_participants_or_admin" ON public.dispute_evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes d
      JOIN bookings b ON b.id = d.booking_id
      JOIN cars c ON c.id = b.car_id
      WHERE d.id = dispute_evidence.dispute_id
        AND (
          (select auth.uid()) IN (b.renter_id, c.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- FEES TABLE - Fix owner_id references
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "fees_read_participants_or_admin" ON public.fees;
CREATE POLICY "fees_read_participants_or_admin" ON public.fees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      LEFT JOIN cars c ON c.id = b.car_id
      WHERE b.id = fees.booking_id
        AND (
          (select auth.uid()) IN (b.renter_id, c.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- BOOKING_CONTRACTS TABLE - Fix owner_id references
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "contracts_insert_participants" ON public.booking_contracts;
CREATE POLICY "contracts_insert_participants" ON public.booking_contracts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      LEFT JOIN cars c ON c.id = b.car_id
      WHERE b.id = booking_contracts.booking_id
        AND (select auth.uid()) IN (b.renter_id, c.owner_id)
    )
  );

DROP POLICY IF EXISTS "contracts_read_participants_or_admin" ON public.booking_contracts;
CREATE POLICY "contracts_read_participants_or_admin" ON public.booking_contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      LEFT JOIN cars c ON c.id = b.car_id
      WHERE b.id = booking_contracts.booking_id
        AND (
          (select auth.uid()) IN (b.renter_id, c.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- CAR_TRACKING_SESSIONS TABLE - Fix owner_id references
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "tracking_sessions_participants_or_admin" ON public.car_tracking_sessions;
CREATE POLICY "tracking_sessions_participants_or_admin" ON public.car_tracking_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      LEFT JOIN cars c ON c.id = b.car_id
      WHERE b.id = car_tracking_sessions.booking_id
        AND (
          (select auth.uid()) IN (b.renter_id, c.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- CAR_TRACKING_POINTS TABLE - Fix owner_id references
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "tracking_points_participants_or_admin" ON public.car_tracking_points;
CREATE POLICY "tracking_points_participants_or_admin" ON public.car_tracking_points
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM car_tracking_sessions cts
      JOIN bookings b ON b.id = cts.booking_id
      LEFT JOIN cars c ON c.id = b.car_id
      WHERE cts.id = car_tracking_points.session_id
        AND (
          (select auth.uid()) IN (b.renter_id, c.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- WALLET_TRANSFERS TABLE - Fix column names (from_user/to_user)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own transfers" ON public.wallet_transfers;
CREATE POLICY "wallet_transfers_select" ON public.wallet_transfers
  FOR SELECT
  USING (
    (select auth.uid()) IN (from_user, to_user)
    OR (select auth.jwt()->>'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- PROMOS TABLE - Fix active column (doesn't exist)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'promos' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "promos_select" ON public.promos';

    -- Check if table has is_active column instead
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'promos'
        AND table_schema = 'public'
        AND column_name = 'is_active'
    ) THEN
      EXECUTE 'CREATE POLICY "promos_select" ON public.promos
        FOR SELECT
        USING (
          is_active = true
          OR (select auth.jwt()->>''role'') = ''admin''
        )';
    ELSE
      -- No active column at all, allow public read
      EXECUTE 'CREATE POLICY "promos_select" ON public.promos
        FOR SELECT
        USING (true)'; -- Public read, admin can see all via modify policy
    END IF;

    EXECUTE 'CREATE POLICY "promos_modify" ON public.promos
      FOR ALL
      USING ((select auth.jwt()->>''role'') = ''admin'')';
  END IF;
END $$;

-- ============================================================================
-- ANALYZE TABLES AFTER FIXES
-- ============================================================================

ANALYZE bookings;
ANALYZE payments;
ANALYZE messages;
ANALYZE disputes;
ANALYZE dispute_evidence;
ANALYZE fees;
ANALYZE booking_contracts;
ANALYZE car_tracking_sessions;
ANALYZE car_tracking_points;
ANALYZE wallet_transfers;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to check remaining issues:
/*
-- Check for auth.uid() not wrapped in (select ...)
SELECT
  tablename,
  policyname,
  CASE
    WHEN qual IS NOT NULL THEN 'qual'
    WHEN with_check IS NOT NULL THEN 'with_check'
  END as location,
  COALESCE(qual, with_check) as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual ~ 'auth\.(uid|jwt)\(\)' AND qual !~ '\(select auth\.'
    OR with_check ~ 'auth\.(uid|jwt)\(\)' AND with_check !~ '\(select auth\.'
  )
ORDER BY tablename, policyname;

-- Check for multiple permissive policies
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
ORDER BY policy_count DESC, tablename;
*/
