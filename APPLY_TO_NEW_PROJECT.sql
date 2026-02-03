-- ============================================
-- COMPREHENSIVE FIX FOR NEW SUPABASE PROJECT
-- Project: aceacpaockyxgogxsfyc
-- Date: 2026-02-03
--
-- Execute this in SQL Editor:
-- https://supabase.com/dashboard/project/aceacpaockyxgogxsfyc/sql/new
-- ============================================

-- ============================================
-- PART 1: FOREIGN KEY RELATIONSHIPS
-- ============================================

-- 1.1 Add FK from cars.owner_id to profiles.id
-- This enables PostgREST joins like: cars(*,owner:profiles!cars_owner_id_fkey(*))
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cars_owner_id_fkey'
    AND table_name = 'cars'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- First check if there's a FK to auth.users - we'll add a new one to profiles
    ALTER TABLE public.cars
    ADD CONSTRAINT cars_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added cars_owner_id_fkey to profiles';
  ELSE
    RAISE NOTICE 'cars_owner_id_fkey already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error adding cars_owner_id_fkey: %', SQLERRM;
END $$;

-- 1.2 Add FK from bookings.renter_id to profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_renter_id_fkey'
    AND table_name = 'bookings'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_renter_id_fkey
    FOREIGN KEY (renter_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

    RAISE NOTICE 'Added bookings_renter_id_fkey to profiles';
  ELSE
    RAISE NOTICE 'bookings_renter_id_fkey already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error adding bookings_renter_id_fkey: %', SQLERRM;
END $$;

-- 1.3 Add FK from bookings.owner_id to profiles.id (if owner_id column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'owner_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'bookings_owner_id_fkey'
      AND table_name = 'bookings'
      AND constraint_type = 'FOREIGN KEY'
    ) THEN
      ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

      RAISE NOTICE 'Added bookings_owner_id_fkey to profiles';
    ELSE
      RAISE NOTICE 'bookings_owner_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'bookings.owner_id column does not exist';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error adding bookings_owner_id_fkey: %', SQLERRM;
END $$;

-- ============================================
-- PART 2: WALLET FUNCTIONS AND VIEWS
-- ============================================

-- 2.1 Create wallets table if not exists
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 0,
  locked_balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- 2.2 Create wallet_transactions table if not exists
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'completed',
  reference_id UUID,
  description TEXT,
  provider TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 2.3 Create v_wallet_history view
DROP VIEW IF EXISTS public.wallet_history;
DROP VIEW IF EXISTS public.v_wallet_history;

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

-- 2.4 Create wallet_get_balance function
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

GRANT EXECUTE ON FUNCTION public.wallet_get_balance(UUID) TO authenticated;

-- ============================================
-- PART 3: USER VERIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_verifications (
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

CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON public.user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON public.user_verifications(status);

ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verifications" ON public.user_verifications;
CREATE POLICY "Users can view own verifications" ON public.user_verifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own verifications" ON public.user_verifications;
CREATE POLICY "Users can insert own verifications" ON public.user_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 4: BOOKING VIEWS
-- ============================================

-- Check if bookings has the columns we need
DO $$
BEGIN
  -- Add owner_id to bookings if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'owner_id') THEN
    ALTER TABLE public.bookings ADD COLUMN owner_id UUID;

    -- Populate from cars table
    UPDATE public.bookings b
    SET owner_id = c.owner_id
    FROM public.cars c
    WHERE b.car_id = c.id AND b.owner_id IS NULL;

    RAISE NOTICE 'Added and populated owner_id column in bookings';
  END IF;

  -- Add total_price if missing (some schemas use total_amount)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'total_price') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'total_amount') THEN
      ALTER TABLE public.bookings ADD COLUMN total_price NUMERIC GENERATED ALWAYS AS (total_amount) STORED;
      RAISE NOTICE 'Added total_price as computed column from total_amount';
    ELSE
      ALTER TABLE public.bookings ADD COLUMN total_price NUMERIC DEFAULT 0;
      RAISE NOTICE 'Added total_price column';
    END IF;
  END IF;
END $$;

-- 4.1 Create my_bookings view (simplified to avoid column issues)
DROP VIEW IF EXISTS public.my_bookings;
CREATE OR REPLACE VIEW public.my_bookings AS
SELECT
  b.id,
  b.car_id,
  b.renter_id,
  COALESCE(b.owner_id, c.owner_id) as owner_id,
  b.start_at,
  b.end_at,
  COALESCE(b.total_price, b.total_amount, 0) as total_price,
  b.currency,
  b.status,
  b.created_at,
  b.updated_at,
  c.brand,
  c.model,
  c.year,
  c.city,
  (SELECT url FROM car_photos cp WHERE cp.car_id = c.id ORDER BY cp.position LIMIT 1) as car_image,
  p.full_name as owner_name,
  p.avatar_url as owner_avatar
FROM bookings b
JOIN cars c ON b.car_id = c.id
LEFT JOIN profiles p ON COALESCE(b.owner_id, c.owner_id) = p.id
WHERE b.renter_id = auth.uid() OR COALESCE(b.owner_id, c.owner_id) = auth.uid();

GRANT SELECT ON public.my_bookings TO authenticated;

-- 4.2 Create owner_bookings view
DROP VIEW IF EXISTS public.owner_bookings;
CREATE OR REPLACE VIEW public.owner_bookings AS
SELECT
  b.id,
  b.car_id,
  b.renter_id,
  COALESCE(b.owner_id, c.owner_id) as owner_id,
  b.start_at,
  b.end_at,
  COALESCE(b.total_price, b.total_amount, 0) as total_price,
  b.currency,
  b.status,
  b.created_at,
  b.updated_at,
  c.title as car_title,
  c.brand as car_brand,
  c.model as car_model,
  pr.full_name as renter_name,
  pr.avatar_url as renter_avatar
FROM bookings b
JOIN cars c ON c.id = b.car_id
LEFT JOIN profiles pr ON pr.id = b.renter_id
WHERE c.owner_id = auth.uid();

GRANT SELECT ON public.owner_bookings TO authenticated;

-- ============================================
-- PART 5: ADDITIONAL TABLES AND COLUMNS
-- ============================================

-- 5.1 Risk assessments table
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

-- 5.2 Add rating_avg to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_avg NUMERIC DEFAULT 0;

-- 5.3 Create wallet trigger for new users
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

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_fk_count INTEGER;
  v_view_count INTEGER;
  v_func_count INTEGER;
BEGIN
  -- Check FK constraints
  SELECT COUNT(*) INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE constraint_name IN ('cars_owner_id_fkey', 'bookings_renter_id_fkey')
  AND constraint_type = 'FOREIGN KEY';

  -- Check views
  SELECT COUNT(*) INTO v_view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
  AND table_name IN ('v_wallet_history', 'my_bookings', 'owner_bookings');

  -- Check functions
  SELECT COUNT(*) INTO v_func_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name = 'wallet_get_balance';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE '  FK Constraints: % found', v_fk_count;
  RAISE NOTICE '  Views created: % found', v_view_count;
  RAISE NOTICE '  Functions: % found', v_func_count;
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Schema fix script completed!';
END $$;
