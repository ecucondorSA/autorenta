-- ============================================
-- FIX: Complete schema corrections v4
-- Date: 2026-02-03
-- Fixed: GRANT statement for function with default parameter
-- ============================================

-- Drop existing incomplete views
DROP VIEW IF EXISTS public.wallet_history;
DROP VIEW IF EXISTS public.v_wallet_history;

-- 1. Create v_wallet_history view with correct columns
CREATE OR REPLACE VIEW public.v_wallet_history AS
SELECT
  wt.id,
  wt.user_id,
  wt.type as transaction_type,
  wt.amount as amount_cents,
  wt.currency,
  wt.status,
  wt.reference_id as booking_id,
  wt.description as metadata,
  wt.created_at as transaction_date,
  CASE
    WHEN wt.provider IS NOT NULL THEN wt.provider
    ELSE 'internal'
  END as source_system
FROM wallet_transactions wt
WHERE wt.user_id = auth.uid();

GRANT SELECT ON public.v_wallet_history TO authenticated;

COMMENT ON VIEW public.v_wallet_history IS 'Consolidated wallet transaction history for authenticated user';

-- 2. Update wallet_get_balance to handle missing wallet gracefully
CREATE OR REPLACE FUNCTION public.wallet_get_balance(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  available_balance NUMERIC,
  locked_balance NUMERIC,
  total_balance NUMERIC,
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_found BOOLEAN := FALSE;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Check if wallet exists
  SELECT EXISTS (SELECT 1 FROM wallets w WHERE w.user_id = v_user_id) INTO v_found;

  IF v_found THEN
    RETURN QUERY
    SELECT
      w.user_id,
      COALESCE(w.balance, 0)::NUMERIC as available_balance,
      COALESCE(w.locked_balance, 0)::NUMERIC as locked_balance,
      (COALESCE(w.balance, 0) + COALESCE(w.locked_balance, 0))::NUMERIC as total_balance,
      COALESCE(w.currency, 'USD')::TEXT as currency
    FROM wallets w
    WHERE w.user_id = v_user_id;
  ELSE
    -- Return default row for users without wallet
    RETURN QUERY SELECT
      v_user_id,
      0::NUMERIC as available_balance,
      0::NUMERIC as locked_balance,
      0::NUMERIC as total_balance,
      'USD'::TEXT as currency;
  END IF;
END;
$$;

-- Single GRANT for the function (DEFAULT parameter means single signature)
GRANT EXECUTE ON FUNCTION public.wallet_get_balance(UUID) TO authenticated;

-- 3. Ensure user_verifications has correct structure
DROP TABLE IF EXISTS public.user_verifications CASCADE;
CREATE TABLE public.user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  verification_provider TEXT,
  provider_response JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_verifications_user_id ON public.user_verifications(user_id);
CREATE INDEX idx_user_verifications_status ON public.user_verifications(status);

ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications" ON public.user_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications" ON public.user_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Create my_bookings view if not exists
CREATE OR REPLACE VIEW public.my_bookings AS
SELECT
  b.id,
  b.car_id,
  b.renter_id,
  b.owner_id,
  b.start_at,
  b.end_at,
  b.total_price,
  b.currency,
  b.status,
  b.created_at,
  b.updated_at,
  b.completed_at,
  b.cancelled_at,
  b.notes,
  c.brand,
  c.model,
  c.year,
  c.city,
  (SELECT url FROM car_photos cp WHERE cp.car_id = c.id ORDER BY cp.position LIMIT 1) as car_image,
  p.full_name as owner_name,
  p.avatar_url as owner_avatar
FROM bookings b
JOIN cars c ON b.car_id = c.id
LEFT JOIN profiles p ON b.owner_id = p.id
WHERE b.renter_id = auth.uid() OR b.owner_id = auth.uid();

GRANT SELECT ON public.my_bookings TO authenticated;

-- 5. Create risk_assessments if not exists
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  assessment_type TEXT DEFAULT 'booking',
  risk_score NUMERIC DEFAULT 0,
  risk_level TEXT DEFAULT 'low',
  risk_factors JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own risk assessments" ON public.risk_assessments;
CREATE POLICY "Users can view own risk assessments" ON public.risk_assessments
  FOR SELECT USING (auth.uid() = user_id);

-- 6. Add rating_avg to profiles if missing (used by wallet_get_balance joins)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_avg NUMERIC DEFAULT 0;

-- 7. Create wallet for user if they don't have one (trigger)
CREATE OR REPLACE FUNCTION public.ensure_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO wallets (user_id, balance, locked_balance, currency)
  VALUES (NEW.id, 0, 0, 'USD')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_wallet_on_profile ON profiles;
CREATE TRIGGER ensure_wallet_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_wallet();
