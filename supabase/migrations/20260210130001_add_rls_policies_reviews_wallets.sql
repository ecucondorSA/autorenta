-- Add RLS policies to reviews and wallets
-- Audit finding: both tables have RLS ENABLED but ZERO policies
-- This means PostgREST returns empty results for ALL users (even data owners)
--
-- Strategy:
--   reviews → public readable (marketplace needs them), users manage own reviews
--   wallets → strict user-scoped access (only see your own wallet)

BEGIN;

-- ============================================================
-- 1. REVIEWS — Add SELECT + INSERT + UPDATE policies
-- ============================================================

-- Anyone authenticated can read visible reviews (marketplace display)
CREATE POLICY "Anyone can read visible reviews"
  ON public.reviews FOR SELECT
  USING (is_visible = true);

-- Users can see their own reviews even if hidden
CREATE POLICY "Users can view own reviews"
  ON public.reviews FOR SELECT
  USING (reviewer_id = (select auth.uid()));

-- Users can create reviews (for bookings they participated in)
CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (reviewer_id = (select auth.uid()));

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (reviewer_id = (select auth.uid()))
  WITH CHECK (reviewer_id = (select auth.uid()));

-- ============================================================
-- 2. WALLETS — Add strict user-scoped policies
-- ============================================================

-- Users can only see their own wallet
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (user_id = (select auth.uid()));

-- Users can update their own wallet (for UI-triggered updates like currency preference)
-- Note: balance changes should go through RPCs/edge functions, not direct updates
CREATE POLICY "Users can update own wallet"
  ON public.wallets FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

COMMIT;
