-- ============================================================================
-- MIGRATION 3 SUPPLEMENT: Fix consolidation for wallet_transactions and
-- withdrawal_transactions (schema corrections)
-- ============================================================================
-- Date: 2025-11-24
-- Risk Level: MEDIUM
-- Impact: Fixes failed policy consolidations from Migration 3
-- ============================================================================

-- ============================================================================
-- TABLE: wallet_transactions (HAS user_id column - use it)
-- ============================================================================
-- Keep original Migration 3 policies since they reference user_id correctly
-- The policies from Migration 3 were correct:
-- - wallet_transactions_select: user_id = (SELECT auth.uid())
-- No action needed - Migration 3 succeeded for this table

-- ============================================================================
-- TABLE: withdrawal_transactions (NO user_id - uses request_id FK)
-- ============================================================================
-- The original Migration 3 failed because it assumed a user_id column
-- that doesn't exist. withdrawal_transactions references withdrawal_requests.
-- We need to join through withdrawal_requests to get the user.

DROP POLICY IF EXISTS "withdrawal_transactions_select" ON public.withdrawal_transactions;
DROP POLICY IF EXISTS "System can manage withdrawal transactions" ON public.withdrawal_transactions;
DROP POLICY IF EXISTS "Users can view their own withdrawal transactions" ON public.withdrawal_transactions;

-- Create consolidated SELECT policy that joins through withdrawal_requests
CREATE POLICY "withdrawal_transactions_select"
ON public.withdrawal_transactions FOR SELECT
USING (
  -- Allow viewing if user owns the associated withdrawal request
  EXISTS (
    SELECT 1 FROM public.withdrawal_requests
    WHERE withdrawal_requests.id = withdrawal_transactions.request_id
    AND withdrawal_requests.user_id = (SELECT auth.uid())
  )
  OR
  -- Allow admins to view all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role = 'admin'::text
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify the 2 affected tables have consolidated policies
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('wallet_transactions', 'withdrawal_transactions')
GROUP BY tablename
ORDER BY tablename;

-- Check specific policies were created
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('wallet_transactions', 'withdrawal_transactions')
ORDER BY tablename, policyname;
