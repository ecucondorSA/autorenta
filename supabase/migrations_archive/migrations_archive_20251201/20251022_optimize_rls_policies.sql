-- RLS Policies Optimization
-- Date: 2025-10-22
-- Purpose: Fix auth_rls_initplan and multiple_permissive_policies warnings
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- PART 1: FIX auth.uid() RE-EVALUATION (auth_rls_initplan warnings)
-- ============================================================================
-- Strategy: Wrap auth.uid() in (select auth.uid()) to evaluate once per query

-- ----------------------------------------------------------------------------
-- PROFILES TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_profiles" ON public.profiles;
CREATE POLICY "insert_profiles" ON public.profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "update_profiles" ON public.profiles;
CREATE POLICY "update_profiles" ON public.profiles
  FOR UPDATE
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "delete_profiles" ON public.profiles;
CREATE POLICY "delete_profiles" ON public.profiles
  FOR DELETE
  USING ((select auth.uid()) = id);

-- ----------------------------------------------------------------------------
-- CARS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_cars" ON public.cars;
CREATE POLICY "insert_cars" ON public.cars
  FOR INSERT
  WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "update_cars" ON public.cars
  FOR UPDATE
  USING ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "delete_cars" ON public.cars;
CREATE POLICY "delete_cars" ON public.cars
  FOR DELETE
  USING ((select auth.uid()) = owner_id);

-- ----------------------------------------------------------------------------
-- CAR_PHOTOS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_car_photos" ON public.car_photos;
CREATE POLICY "insert_car_photos" ON public.car_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = car_photos.car_id
        AND cars.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_car_photos" ON public.car_photos;
CREATE POLICY "update_car_photos" ON public.car_photos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = car_photos.car_id
        AND cars.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_car_photos" ON public.car_photos;
CREATE POLICY "delete_car_photos" ON public.car_photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = car_photos.car_id
        AND cars.owner_id = (select auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- CAR_LOCATIONS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "car_locations upsert by owner/admin" ON public.car_locations;
CREATE POLICY "car_locations upsert by owner/admin" ON public.car_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = car_locations.car_id
        AND (
          cars.owner_id = (select auth.uid())
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "car_locations readable by owner/admin or active renter" ON public.car_locations;
CREATE POLICY "car_locations readable by owner/admin or active renter" ON public.car_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = car_locations.car_id
        AND (
          cars.owner_id = (select auth.uid())
          OR (select auth.jwt()->>'role') = 'admin'
          OR EXISTS (
            SELECT 1 FROM bookings
            WHERE bookings.car_id = cars.id
              AND bookings.renter_id = (select auth.uid())
              AND bookings.status = 'in_progress'
          )
        )
    )
  );

-- ----------------------------------------------------------------------------
-- CAR_BLACKOUTS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "blackouts crud by owner/admin" ON public.car_blackouts;
DROP POLICY IF EXISTS "blackouts read by owner/admin" ON public.car_blackouts;

-- Consolidated policy (fixes multiple_permissive_policies)
CREATE POLICY "blackouts_owner_admin_access" ON public.car_blackouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = car_blackouts.car_id
        AND (
          cars.owner_id = (select auth.uid())
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- BOOKINGS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_bookings" ON public.bookings;
CREATE POLICY "insert_bookings" ON public.bookings
  FOR INSERT
  WITH CHECK ((select auth.uid()) = renter_id);

DROP POLICY IF EXISTS "update_bookings" ON public.bookings;
CREATE POLICY "update_bookings" ON public.bookings
  FOR UPDATE
  USING (
    (select auth.uid()) IN (renter_id, owner_id)
    OR (select auth.jwt()->>'role') = 'admin'
  );

DROP POLICY IF EXISTS "delete_bookings" ON public.bookings;
CREATE POLICY "delete_bookings" ON public.bookings
  FOR DELETE
  USING (
    (select auth.uid()) IN (renter_id, owner_id)
    OR (select auth.jwt()->>'role') = 'admin'
  );

DROP POLICY IF EXISTS "select_bookings" ON public.bookings;
CREATE POLICY "select_bookings" ON public.bookings
  FOR SELECT
  USING (
    (select auth.uid()) IN (renter_id, owner_id)
    OR (select auth.jwt()->>'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- PAYMENTS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_payments" ON public.payments;
CREATE POLICY "insert_payments" ON public.payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
        AND bookings.renter_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "select_payments" ON public.payments;
CREATE POLICY "select_payments" ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
        AND (
          bookings.renter_id = (select auth.uid())
          OR bookings.owner_id = (select auth.uid())
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "update_payments" ON public.payments;
CREATE POLICY "update_payments" ON public.payments
  FOR UPDATE
  USING ((select auth.jwt()->>'role') = 'admin');

-- ----------------------------------------------------------------------------
-- REVIEWS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_reviews" ON public.reviews;
DROP POLICY IF EXISTS "update_reviews" ON public.reviews;
DROP POLICY IF EXISTS "delete_reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can moderate reviews" ON public.reviews;

-- Consolidated policies (fixes multiple_permissive_policies)
CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = reviewer_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "reviews_update" ON public.reviews
  FOR UPDATE
  USING (
    (select auth.uid()) = reviewer_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "reviews_delete" ON public.reviews
  FOR DELETE
  USING (
    (select auth.uid()) = reviewer_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT
  USING (
    (select auth.uid()) IN (reviewer_id, reviewee_id)
    OR (select auth.jwt()->>'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- MESSAGES TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_messages" ON public.messages;
CREATE POLICY "insert_messages" ON public.messages
  FOR INSERT
  WITH CHECK ((select auth.uid()) = sender_id);

DROP POLICY IF EXISTS "select_messages" ON public.messages;
CREATE POLICY "select_messages" ON public.messages
  FOR SELECT
  USING (
    (select auth.uid()) IN (sender_id, receiver_id)
    OR (select auth.jwt()->>'role') = 'admin'
  );

DROP POLICY IF EXISTS "update_messages" ON public.messages;
CREATE POLICY "update_messages" ON public.messages
  FOR UPDATE
  USING ((select auth.uid()) = receiver_id); -- Only receiver can mark as read

-- ----------------------------------------------------------------------------
-- DISPUTES TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_disputes" ON public.disputes;
CREATE POLICY "insert_disputes" ON public.disputes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = disputes.booking_id
        AND (select auth.uid()) IN (bookings.renter_id, bookings.owner_id)
    )
  );

DROP POLICY IF EXISTS "select_disputes" ON public.disputes;
CREATE POLICY "select_disputes" ON public.disputes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = disputes.booking_id
        AND (
          (select auth.uid()) IN (bookings.renter_id, bookings.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "update_disputes" ON public.disputes;
CREATE POLICY "update_disputes" ON public.disputes
  FOR UPDATE
  USING ((select auth.jwt()->>'role') = 'admin');

-- ----------------------------------------------------------------------------
-- DISPUTE_EVIDENCE TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "evidence_insert_participants" ON public.dispute_evidence;
CREATE POLICY "evidence_insert_participants" ON public.dispute_evidence
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM disputes d
      JOIN bookings b ON b.id = d.booking_id
      WHERE d.id = dispute_evidence.dispute_id
        AND (select auth.uid()) IN (b.renter_id, b.owner_id)
    )
  );

DROP POLICY IF EXISTS "evidence_read_participants_or_admin" ON public.dispute_evidence;
CREATE POLICY "evidence_read_participants_or_admin" ON public.dispute_evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes d
      JOIN bookings b ON b.id = d.booking_id
      WHERE d.id = dispute_evidence.dispute_id
        AND (
          (select auth.uid()) IN (b.renter_id, b.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- FEES TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "fees_read_participants_or_admin" ON public.fees;
CREATE POLICY "fees_read_participants_or_admin" ON public.fees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = fees.booking_id
        AND (
          (select auth.uid()) IN (bookings.renter_id, bookings.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- BOOKING_CONTRACTS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "contracts_insert_participants" ON public.booking_contracts;
CREATE POLICY "contracts_insert_participants" ON public.booking_contracts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_contracts.booking_id
        AND (select auth.uid()) IN (bookings.renter_id, bookings.owner_id)
    )
  );

DROP POLICY IF EXISTS "contracts_read_participants_or_admin" ON public.booking_contracts;
CREATE POLICY "contracts_read_participants_or_admin" ON public.booking_contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_contracts.booking_id
        AND (
          (select auth.uid()) IN (bookings.renter_id, bookings.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "contracts_update_accept_renter" ON public.booking_contracts;
CREATE POLICY "contracts_update_accept_renter" ON public.booking_contracts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_contracts.booking_id
        AND bookings.renter_id = (select auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- CAR_HANDOVER_POINTS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "handover_points_owner_or_admin" ON public.car_handover_points;
CREATE POLICY "handover_points_owner_or_admin" ON public.car_handover_points
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = car_handover_points.car_id
        AND (
          cars.owner_id = (select auth.uid())
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- CAR_TRACKING_SESSIONS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "tracking_sessions_participants_or_admin" ON public.car_tracking_sessions;
CREATE POLICY "tracking_sessions_participants_or_admin" ON public.car_tracking_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = car_tracking_sessions.booking_id
        AND (
          (select auth.uid()) IN (bookings.renter_id, bookings.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- CAR_TRACKING_POINTS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "tracking_points_participants_or_admin" ON public.car_tracking_points;
CREATE POLICY "tracking_points_participants_or_admin" ON public.car_tracking_points
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM car_tracking_sessions cts
      JOIN bookings b ON b.id = cts.booking_id
      WHERE cts.id = car_tracking_points.session_id
        AND (
          (select auth.uid()) IN (b.renter_id, b.owner_id)
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- USER_DOCUMENTS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "owner can insert own documents" ON public.user_documents;
DROP POLICY IF EXISTS "owner can see own documents" ON public.user_documents;
DROP POLICY IF EXISTS "owner can update own documents" ON public.user_documents;
DROP POLICY IF EXISTS "owner can delete own documents" ON public.user_documents;
DROP POLICY IF EXISTS "admin can manage documents" ON public.user_documents;

-- Consolidated policies (fixes multiple_permissive_policies)
CREATE POLICY "user_documents_select" ON public.user_documents
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "user_documents_insert" ON public.user_documents
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "user_documents_update" ON public.user_documents
  FOR UPDATE
  USING (
    (select auth.uid()) = user_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "user_documents_delete" ON public.user_documents
  FOR DELETE
  USING (
    (select auth.uid()) = user_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- PROFILE_AUDIT TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "user sees own audit" ON public.profile_audit;
CREATE POLICY "user sees own audit" ON public.profile_audit
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- VEHICLE_DOCUMENTS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_vehicle_documents" ON public.vehicle_documents;
CREATE POLICY "insert_vehicle_documents" ON public.vehicle_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = vehicle_documents.car_id
        AND cars.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "select_vehicle_documents" ON public.vehicle_documents;
CREATE POLICY "select_vehicle_documents" ON public.vehicle_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = vehicle_documents.car_id
        AND (
          cars.owner_id = (select auth.uid())
          OR (select auth.jwt()->>'role') = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "update_vehicle_documents" ON public.vehicle_documents;
CREATE POLICY "update_vehicle_documents" ON public.vehicle_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = vehicle_documents.car_id
        AND cars.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_vehicle_documents" ON public.vehicle_documents;
CREATE POLICY "delete_vehicle_documents" ON public.vehicle_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cars
      WHERE cars.id = vehicle_documents.car_id
        AND cars.owner_id = (select auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- WALLET_TRANSACTIONS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "wallet_transactions_insert_own" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_select_own" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_update_system" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_admin_all" ON public.wallet_transactions;

-- Consolidated policies (fixes multiple_permissive_policies)
CREATE POLICY "wallet_transactions_insert" ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "wallet_transactions_select" ON public.wallet_transactions
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "wallet_transactions_update" ON public.wallet_transactions
  FOR UPDATE
  USING (
    (select auth.jwt()->>'role') IN ('admin', 'service_role')
  );

-- ----------------------------------------------------------------------------
-- BANK_ACCOUNTS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON public.bank_accounts;

CREATE POLICY "bank_accounts_select" ON public.bank_accounts
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "bank_accounts_insert" ON public.bank_accounts
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "bank_accounts_update" ON public.bank_accounts
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "bank_accounts_delete" ON public.bank_accounts
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- WITHDRAWAL_REQUESTS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can insert own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can update own pending withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update all withdrawal requests" ON public.withdrawal_requests;

-- Consolidated policies (fixes multiple_permissive_policies)
CREATE POLICY "withdrawal_requests_select" ON public.withdrawal_requests
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "withdrawal_requests_insert" ON public.withdrawal_requests
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "withdrawal_requests_update" ON public.withdrawal_requests
  FOR UPDATE
  USING (
    ((select auth.uid()) = user_id AND status = 'pending')
    OR (select auth.jwt()->>'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- USER_WALLETS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.user_wallets;

CREATE POLICY "user_wallets_select" ON public.user_wallets
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "user_wallets_insert" ON public.user_wallets
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_wallets_update" ON public.user_wallets
  FOR UPDATE
  USING ((select auth.jwt()->>'role') IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- USER_VERIFICATIONS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their verification status" ON public.user_verifications;
DROP POLICY IF EXISTS "Service role can manage verification status" ON public.user_verifications;
DROP POLICY IF EXISTS "Service role can update verification status" ON public.user_verifications;
DROP POLICY IF EXISTS "Service role can delete verification status" ON public.user_verifications;

CREATE POLICY "user_verifications_select" ON public.user_verifications
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "user_verifications_all" ON public.user_verifications
  FOR ALL
  USING ((select auth.jwt()->>'role') IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- WALLET_AUDIT_LOG TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "select_own_wallet_audit_log" ON public.wallet_audit_log;
DROP POLICY IF EXISTS "admin_select_wallet_audit_log" ON public.wallet_audit_log;

-- Consolidated policy (fixes multiple_permissive_policies)
CREATE POLICY "wallet_audit_log_select" ON public.wallet_audit_log
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- PRICING_REGIONS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can manage pricing regions" ON public.pricing_regions;
DROP POLICY IF EXISTS "Anyone can read pricing regions" ON public.pricing_regions;

-- Consolidated policies (fixes multiple_permissive_policies)
CREATE POLICY "pricing_regions_select" ON public.pricing_regions
  FOR SELECT
  USING (true); -- Public read

CREATE POLICY "pricing_regions_modify" ON public.pricing_regions
  FOR ALL
  USING ((select auth.jwt()->>'role') = 'admin');

-- ----------------------------------------------------------------------------
-- PRICING_CALCULATIONS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read own pricing calculations" ON public.pricing_calculations;
CREATE POLICY "Users can read own pricing calculations" ON public.pricing_calculations
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- EXCHANGE_RATES TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can manage exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Anyone can read current exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Todos pueden ver tasas de cambio" ON public.exchange_rates;
DROP POLICY IF EXISTS "Solo admin puede insertar tasas" ON public.exchange_rates;

-- Consolidated policies (fixes multiple_permissive_policies)
CREATE POLICY "exchange_rates_select" ON public.exchange_rates
  FOR SELECT
  USING (true); -- Public read

CREATE POLICY "exchange_rates_modify" ON public.exchange_rates
  FOR ALL
  USING ((select auth.jwt()->>'role') = 'admin');

-- ----------------------------------------------------------------------------
-- WALLET_TRANSFERS TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own transfers" ON public.wallet_transfers;
CREATE POLICY "Users can view own transfers" ON public.wallet_transfers
  FOR SELECT
  USING (
    (select auth.uid()) IN (from_user_id, to_user_id)
    OR (select auth.jwt()->>'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- COVERAGE_FUND TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Only admins can view coverage fund" ON public.coverage_fund;
CREATE POLICY "Only admins can view coverage fund" ON public.coverage_fund
  FOR SELECT
  USING ((select auth.jwt()->>'role') = 'admin');

-- ----------------------------------------------------------------------------
-- WALLET_LEDGER TABLE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own ledger entries" ON public.wallet_ledger;
CREATE POLICY "Users can view own ledger entries" ON public.wallet_ledger
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR (select auth.jwt()->>'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- PROMOS TABLE (if exists)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'promos' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "admin_manage_promos" ON public.promos';
    EXECUTE 'DROP POLICY IF EXISTS "select_promos" ON public.promos';

    EXECUTE 'CREATE POLICY "promos_select" ON public.promos
      FOR SELECT
      USING (
        active = true
        OR (select auth.jwt()->>''role'') = ''admin''
      )';

    EXECUTE 'CREATE POLICY "promos_modify" ON public.promos
      FOR ALL
      USING ((select auth.jwt()->>''role'') = ''admin'')';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PRICING_OVERRIDES TABLE (if exists)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'pricing_overrides' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "admin_manage_pricing_overrides" ON public.pricing_overrides';
    EXECUTE 'DROP POLICY IF EXISTS "select_pricing_overrides" ON public.pricing_overrides';

    EXECUTE 'CREATE POLICY "pricing_overrides_select" ON public.pricing_overrides
      FOR SELECT
      USING (true)'; -- Owners can see overrides via cars join

    EXECUTE 'CREATE POLICY "pricing_overrides_modify" ON public.pricing_overrides
      FOR ALL
      USING ((select auth.jwt()->>''role'') = ''admin'')';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- WEBHOOK_EVENTS TABLE (if exists)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'webhook_events' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "webhooks admin read" ON public.webhook_events';
    EXECUTE 'DROP POLICY IF EXISTS "webhooks admin write" ON public.webhook_events';

    EXECUTE 'CREATE POLICY "webhook_events_admin" ON public.webhook_events
      FOR ALL
      USING ((select auth.jwt()->>''role'') = ''admin'')';
  END IF;
END $$;

-- ============================================================================
-- PART 2: CONSOLIDATE DUPLICATE POLICIES FOR CAR_STATS AND USER_STATS
-- ============================================================================

-- CAR_STATS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'car_stats' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view car stats" ON public.car_stats';
    EXECUTE 'DROP POLICY IF EXISTS "Only system can update car stats" ON public.car_stats';

    EXECUTE 'CREATE POLICY "car_stats_select" ON public.car_stats
      FOR SELECT
      USING (true)'; -- Public read

    EXECUTE 'CREATE POLICY "car_stats_update" ON public.car_stats
      FOR UPDATE
      USING ((select auth.jwt()->>''role'') IN (''admin'', ''service_role''))';
  END IF;
END $$;

-- USER_STATS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_stats' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view user stats" ON public.user_stats';
    EXECUTE 'DROP POLICY IF EXISTS "Only system can update user stats" ON public.user_stats';

    EXECUTE 'CREATE POLICY "user_stats_select" ON public.user_stats
      FOR SELECT
      USING (true)'; -- Public read

    EXECUTE 'CREATE POLICY "user_stats_update" ON public.user_stats
      FOR UPDATE
      USING ((select auth.jwt()->>''role'') IN (''admin'', ''service_role''))';
  END IF;
END $$;

-- ============================================================================
-- ANALYZE TABLES AFTER POLICY CHANGES
-- ============================================================================

ANALYZE profiles;
ANALYZE cars;
ANALYZE car_photos;
ANALYZE car_locations;
ANALYZE car_blackouts;
ANALYZE bookings;
ANALYZE payments;
ANALYZE reviews;
ANALYZE messages;
ANALYZE disputes;
ANALYZE user_documents;
ANALYZE vehicle_documents;
ANALYZE wallet_transactions;
ANALYZE bank_accounts;
ANALYZE withdrawal_requests;
ANALYZE user_wallets;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this after migration to verify improvements:
/*
-- Check for remaining auth_rls_initplan warnings
SELECT
  tablename,
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual LIKE '%auth.uid()%'
    OR qual LIKE '%auth.jwt()%'
    OR with_check LIKE '%auth.uid()%'
    OR with_check LIKE '%auth.jwt()%'
  )
  AND qual NOT LIKE '%(select auth.%'
  AND with_check NOT LIKE '%(select auth.%'
ORDER BY tablename, policyname;

-- Check for remaining multiple permissive policies
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
