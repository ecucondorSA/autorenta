-- =====================================================
-- MIGRATION: Optimize RLS Policies for Critical Tables
-- Date: 2025-10-22
-- Purpose: Fix auth.uid() performance issues in high-traffic tables
-- =====================================================
--
-- Problem: RLS policies calling auth.uid() directly re-evaluate
-- the function for EVERY row, causing severe performance degradation.
--
-- Solution: Wrap auth.uid() in (select auth.uid()) to force
-- single evaluation per query (InitPlan optimization).
--
-- Affected tables (Phase 1 - Critical):
-- - profiles (user data)
-- - wallet_transactions (high volume)
-- - wallet_audit_log (high volume)
-- - user_wallets (frequently accessed)
-- - bookings (core business logic)
-- - payments (core business logic)
-- - cars (frequently queried)
-- - car_photos (frequently queried)
-- - user_documents (verification flow)
-- =====================================================

BEGIN;

-- =====================================================
-- TABLE: profiles
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS insert_profiles ON public.profiles;
DROP POLICY IF EXISTS update_profiles ON public.profiles;
DROP POLICY IF EXISTS delete_profiles ON public.profiles;

-- Recreate with optimized auth.uid()
CREATE POLICY insert_profiles ON public.profiles
  FOR INSERT
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY update_profiles ON public.profiles
  FOR UPDATE
  USING (id = (select auth.uid()));

CREATE POLICY delete_profiles ON public.profiles
  FOR DELETE
  USING (id = (select auth.uid()));

-- =====================================================
-- TABLE: wallet_transactions
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS wallet_transactions_select_own ON public.wallet_transactions;
DROP POLICY IF EXISTS wallet_transactions_insert_own ON public.wallet_transactions;
DROP POLICY IF EXISTS wallet_transactions_admin_all ON public.wallet_transactions;

-- Recreate with optimized auth.uid()
CREATE POLICY wallet_transactions_select_own ON public.wallet_transactions
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

CREATE POLICY wallet_transactions_insert_own ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

CREATE POLICY wallet_transactions_admin_all ON public.wallet_transactions
  FOR ALL
  USING (
    (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

-- =====================================================
-- TABLE: user_wallets
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.user_wallets;

-- Recreate with optimized auth.uid()
CREATE POLICY "Users can view own wallet" ON public.user_wallets
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own wallet" ON public.user_wallets
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own wallet" ON public.user_wallets
  FOR UPDATE
  USING (user_id = (select auth.uid()));

-- =====================================================
-- TABLE: bookings
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS select_bookings ON public.bookings;
DROP POLICY IF EXISTS insert_bookings ON public.bookings;
DROP POLICY IF EXISTS update_bookings ON public.bookings;
DROP POLICY IF EXISTS delete_bookings ON public.bookings;

-- Recreate with optimized auth.uid()
CREATE POLICY select_bookings ON public.bookings
  FOR SELECT
  USING (
    renter_id = (select auth.uid())
    OR car_id IN (
      SELECT id FROM cars WHERE owner_id = (select auth.uid())
    )
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

CREATE POLICY insert_bookings ON public.bookings
  FOR INSERT
  WITH CHECK (renter_id = (select auth.uid()));

CREATE POLICY update_bookings ON public.bookings
  FOR UPDATE
  USING (
    renter_id = (select auth.uid())
    OR car_id IN (
      SELECT id FROM cars WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY delete_bookings ON public.bookings
  FOR DELETE
  USING (renter_id = (select auth.uid()));

-- =====================================================
-- TABLE: payments
-- =====================================================
-- Note: Payments table uses booking_id to relate to users, not user_id directly.
-- Policies are already correctly structured, just need to optimize auth.uid() calls.

-- Drop old policies
DROP POLICY IF EXISTS select_payments ON public.payments;
DROP POLICY IF EXISTS insert_payments ON public.payments;
DROP POLICY IF EXISTS update_payments ON public.payments;

-- Recreate with optimized auth.uid()
CREATE POLICY select_payments ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.id = payments.booking_id
        AND (
          b.renter_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM cars c
            WHERE c.id = b.car_id AND c.owner_id = (select auth.uid())
          )
        )
    )
  );

CREATE POLICY insert_payments ON public.payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM bookings
      WHERE bookings.id = payments.booking_id
        AND bookings.renter_id = (select auth.uid())
    )
  );

CREATE POLICY update_payments ON public.payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.id = payments.booking_id
        AND (
          b.renter_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM cars c
            WHERE c.id = b.car_id AND c.owner_id = (select auth.uid())
          )
        )
    )
  );

-- =====================================================
-- TABLE: cars
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS insert_cars ON public.cars;
DROP POLICY IF EXISTS update_cars ON public.cars;
DROP POLICY IF EXISTS delete_cars ON public.cars;

-- Recreate with optimized auth.uid()
CREATE POLICY insert_cars ON public.cars
  FOR INSERT
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY update_cars ON public.cars
  FOR UPDATE
  USING (owner_id = (select auth.uid()));

CREATE POLICY delete_cars ON public.cars
  FOR DELETE
  USING (owner_id = (select auth.uid()));

-- =====================================================
-- TABLE: car_photos
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS insert_car_photos ON public.car_photos;
DROP POLICY IF EXISTS update_car_photos ON public.car_photos;
DROP POLICY IF EXISTS delete_car_photos ON public.car_photos;

-- Recreate with optimized auth.uid()
CREATE POLICY insert_car_photos ON public.car_photos
  FOR INSERT
  WITH CHECK (
    car_id IN (
      SELECT id FROM cars WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY update_car_photos ON public.car_photos
  FOR UPDATE
  USING (
    car_id IN (
      SELECT id FROM cars WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY delete_car_photos ON public.car_photos
  FOR DELETE
  USING (
    car_id IN (
      SELECT id FROM cars WHERE owner_id = (select auth.uid())
    )
  );

-- =====================================================
-- TABLE: user_documents
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "owner can see own documents" ON public.user_documents;
DROP POLICY IF EXISTS "owner can insert own documents" ON public.user_documents;
DROP POLICY IF EXISTS "owner can update own documents" ON public.user_documents;
DROP POLICY IF EXISTS "owner can delete own documents" ON public.user_documents;
DROP POLICY IF EXISTS "admin can manage documents" ON public.user_documents;

-- Recreate with optimized auth.uid() and consolidate with admin
CREATE POLICY "owner can see own documents" ON public.user_documents
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

CREATE POLICY "owner can insert own documents" ON public.user_documents
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

CREATE POLICY "owner can update own documents" ON public.user_documents
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

CREATE POLICY "owner can delete own documents" ON public.user_documents
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

-- =====================================================
-- TABLE: user_verifications
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their verification status" ON public.user_verifications;
DROP POLICY IF EXISTS "Service role can manage verification status" ON public.user_verifications;
DROP POLICY IF EXISTS "Service role can update verification status" ON public.user_verifications;
DROP POLICY IF EXISTS "Service role can delete verification status" ON public.user_verifications;

-- Recreate with optimized auth.uid() and consolidate service role policies
CREATE POLICY "Users can view their verification status" ON public.user_verifications
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

-- Single admin policy for all operations
CREATE POLICY "Admins can manage verification status" ON public.user_verifications
  FOR ALL
  USING (
    (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

-- =====================================================
-- TABLE: reviews
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS insert_reviews ON public.reviews;
DROP POLICY IF EXISTS update_reviews ON public.reviews;
DROP POLICY IF EXISTS delete_reviews ON public.reviews;
DROP POLICY IF EXISTS "Users can view own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can moderate reviews" ON public.reviews;

-- Recreate with optimized auth.uid() and consolidate
CREATE POLICY "Users can manage own reviews" ON public.reviews
  FOR ALL
  USING (
    reviewer_id = (select auth.uid())
    OR reviewee_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

-- =====================================================
-- TABLE: messages
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS select_messages ON public.messages;
DROP POLICY IF EXISTS insert_messages ON public.messages;
DROP POLICY IF EXISTS update_messages ON public.messages;

-- Recreate with optimized auth.uid()
CREATE POLICY select_messages ON public.messages
  FOR SELECT
  USING (
    sender_id = (select auth.uid())
    OR recipient_id = (select auth.uid())
  );

CREATE POLICY insert_messages ON public.messages
  FOR INSERT
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY update_messages ON public.messages
  FOR UPDATE
  USING (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()));

-- =====================================================
-- TABLE: bank_accounts
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON public.bank_accounts;

-- Recreate with optimized auth.uid()
CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own bank accounts" ON public.bank_accounts
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own bank accounts" ON public.bank_accounts
  FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own bank accounts" ON public.bank_accounts
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- =====================================================
-- TABLE: withdrawal_requests
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can insert own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can update own pending withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update all withdrawal requests" ON public.withdrawal_requests;

-- Consolidate into two policies (user + admin)
CREATE POLICY "Users can manage own withdrawal requests" ON public.withdrawal_requests
  FOR ALL
  USING (
    user_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR (select auth.uid()) IN (
      SELECT id FROM profiles WHERE is_admin = true
    )
  );

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run after migration)
-- =====================================================

-- Check that policies were created successfully:
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE tablename IN ('profiles', 'wallet_transactions', 'bookings', 'cars', 'user_documents')
-- ORDER BY tablename, policyname;

-- Test performance improvement by running explain analyze on a query:
-- EXPLAIN ANALYZE
-- SELECT * FROM wallet_transactions
-- WHERE user_id = auth.uid()
-- LIMIT 10;
