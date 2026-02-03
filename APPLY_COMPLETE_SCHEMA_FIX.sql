-- ============================================
-- COMPLETE SCHEMA FIX FOR NEW SUPABASE PROJECT
-- Project: aceacpaockyxgogxsfyc
-- Date: 2026-02-03
--
-- This file includes ALL missing objects identified from console errors.
-- Execute in SQL Editor:
-- https://supabase.com/dashboard/project/aceacpaockyxgogxsfyc/sql/new
-- ============================================

-- ============================================
-- PART 1: ENUMS
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_kind') THEN
        CREATE TYPE public.document_kind AS ENUM (
            'gov_id_front', 'gov_id_back', 'driver_license',
            'utility_bill', 'selfie', 'license_front', 'license_back',
            'vehicle_registration', 'vehicle_insurance', 'criminal_record'
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
        CREATE TYPE public.kyc_status AS ENUM (
            'not_started', 'pending', 'verified', 'rejected'
        );
    END IF;
END $$;

-- ============================================
-- PART 2: PROFILES COLUMNS
-- ============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_avg NUMERIC DEFAULT 0;

-- ============================================
-- PART 3: USER DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_documents (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind public.document_kind NOT NULL,
    storage_path TEXT NOT NULL,
    status public.kyc_status NOT NULL DEFAULT 'pending',
    metadata JSONB,
    notes TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_document_kind UNIQUE (user_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON public.user_documents(status);

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own documents" ON public.user_documents;
CREATE POLICY "Users can view own documents" ON public.user_documents
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.user_documents;
CREATE POLICY "Users can insert own documents" ON public.user_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 4: USER IDENTITY LEVELS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_identity_levels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  id_verified_at TIMESTAMPTZ,
  driver_license_verified_at TIMESTAMPTZ,
  document_verified_at TIMESTAMPTZ,
  document_ai_score NUMERIC(5,2),
  selfie_verified_at TIMESTAMPTZ,
  face_match_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_identity_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own identity level" ON public.user_identity_levels;
CREATE POLICY "Users can view own identity level" ON public.user_identity_levels
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- PART 5: REFERRAL SYSTEM TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  current_uses INTEGER DEFAULT 0 NOT NULL,
  max_uses INTEGER,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_code UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_id UUID NOT NULL REFERENCES auth.users(id),
  referral_code_id UUID REFERENCES public.referral_codes(id),
  status TEXT NOT NULL DEFAULT 'registered',
  reward_amount_referrer NUMERIC(10, 2) DEFAULT 10.00,
  reward_amount_referee NUMERIC(10, 2) DEFAULT 5.00,
  source TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_referral_pair UNIQUE (referred_id)
);

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES public.referrals(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reward_type TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'ARS',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read codes" ON public.referral_codes;
CREATE POLICY "Public read codes" ON public.referral_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "View own referrals" ON public.referrals;
CREATE POLICY "View own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "View own rewards" ON public.referral_rewards;
CREATE POLICY "View own rewards" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- PART 6: WALLET TABLES
-- ============================================

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

-- ============================================
-- PART 7: FOREIGN KEY RELATIONSHIPS
-- ============================================

-- Add FK from cars.owner_id to profiles.id (enables PostgREST joins)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cars_owner_id_fkey' AND table_name = 'cars'
  ) THEN
    ALTER TABLE public.cars
    ADD CONSTRAINT cars_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add cars_owner_id_fkey: %', SQLERRM;
END $$;

-- Add FK from bookings.renter_id to profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_renter_id_fkey' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_renter_id_fkey
    FOREIGN KEY (renter_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add bookings_renter_id_fkey: %', SQLERRM;
END $$;

-- ============================================
-- PART 8: VIEWS
-- ============================================

-- v_wallet_history view
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
  COALESCE(wt.provider, 'internal') as source_system
FROM wallet_transactions wt
WHERE wt.user_id = auth.uid();

GRANT SELECT ON public.v_wallet_history TO authenticated;

-- owner_bookings view
DROP VIEW IF EXISTS public.owner_bookings;
CREATE OR REPLACE VIEW public.owner_bookings AS
SELECT
  b.id, b.car_id, b.renter_id, b.start_at, b.end_at, b.status,
  b.total_amount, b.currency, b.created_at, b.updated_at,
  c.title as car_title, c.brand as car_brand, c.model as car_model,
  pr.full_name as renter_name, pr.avatar_url as renter_avatar
FROM bookings b
JOIN cars c ON c.id = b.car_id
LEFT JOIN profiles pr ON pr.id = b.renter_id
WHERE c.owner_id = auth.uid();

GRANT SELECT ON public.owner_bookings TO authenticated;

-- my_bookings view
DROP VIEW IF EXISTS public.my_bookings;
CREATE OR REPLACE VIEW public.my_bookings AS
SELECT
  b.id, b.car_id, b.renter_id, b.start_at, b.end_at, b.status,
  b.total_amount, b.currency, b.created_at, b.updated_at,
  c.brand, c.model, c.year, c.city, c.owner_id as car_owner_id,
  (SELECT url FROM car_photos cp WHERE cp.car_id = c.id ORDER BY cp.position LIMIT 1) as car_image,
  po.full_name as owner_name, po.avatar_url as owner_avatar
FROM bookings b
JOIN cars c ON b.car_id = c.id
LEFT JOIN profiles po ON po.id = c.owner_id
WHERE b.renter_id = auth.uid() OR c.owner_id = auth.uid();

GRANT SELECT ON public.my_bookings TO authenticated;

-- ============================================
-- PART 9: RPC FUNCTIONS
-- ============================================

-- wallet_get_balance
CREATE OR REPLACE FUNCTION public.wallet_get_balance(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  available_balance NUMERIC,
  locked_balance NUMERIC,
  total_balance NUMERIC,
  currency TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF EXISTS (SELECT 1 FROM wallets w WHERE w.user_id = v_user_id) THEN
    RETURN QUERY SELECT
      w.user_id, COALESCE(w.balance, 0)::NUMERIC,
      COALESCE(w.locked_balance, 0)::NUMERIC,
      (COALESCE(w.balance, 0) + COALESCE(w.locked_balance, 0))::NUMERIC,
      COALESCE(w.currency, 'USD')::TEXT
    FROM wallets w WHERE w.user_id = v_user_id;
  ELSE
    RETURN QUERY SELECT v_user_id, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 'USD'::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_get_balance(UUID) TO authenticated;

-- get_user_documents
CREATE OR REPLACE FUNCTION public.get_user_documents(p_user_id UUID DEFAULT NULL)
RETURNS SETOF user_documents
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF auth.uid() != v_user_id THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY SELECT * FROM user_documents WHERE user_id = v_user_id ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_documents(UUID) TO authenticated;

-- upsert_user_document
CREATE OR REPLACE FUNCTION public.upsert_user_document(
  p_user_id UUID, p_kind TEXT, p_storage_path TEXT, p_status TEXT DEFAULT 'pending'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF auth.uid() != p_user_id THEN RAISE EXCEPTION 'No autorizado'; END IF;

  INSERT INTO user_documents (user_id, kind, storage_path, status, created_at)
  VALUES (p_user_id, p_kind::document_kind, p_storage_path, p_status::kyc_status, NOW())
  ON CONFLICT (user_id, kind)
  DO UPDATE SET storage_path = EXCLUDED.storage_path, status = EXCLUDED.status,
    notes = NULL, reviewed_by = NULL, reviewed_at = NULL, analyzed_at = NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_document(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- get_verification_progress
CREATE OR REPLACE FUNCTION public.get_verification_progress()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_identity RECORD;
  v_auth_user RECORD;
  v_email_verified BOOLEAN;
  v_phone_verified BOOLEAN;
  v_doc_verified BOOLEAN;
  v_license_verified BOOLEAN;
  v_progress INT := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  SELECT email_verified, phone_verified, COALESCE(id_verified, false) as id_verified
  INTO v_profile FROM profiles WHERE id = v_user_id;

  SELECT email_verified_at, phone_verified_at, id_verified_at, driver_license_verified_at
  INTO v_identity FROM user_identity_levels WHERE user_id = v_user_id;

  SELECT email_confirmed_at, phone_confirmed_at
  INTO v_auth_user FROM auth.users WHERE id = v_user_id;

  v_email_verified := COALESCE(v_profile.email_verified, false)
    OR v_auth_user.email_confirmed_at IS NOT NULL
    OR v_identity.email_verified_at IS NOT NULL;

  v_phone_verified := COALESCE(v_profile.phone_verified, false)
    OR v_auth_user.phone_confirmed_at IS NOT NULL
    OR v_identity.phone_verified_at IS NOT NULL;

  v_doc_verified := COALESCE(v_profile.id_verified, false)
    OR v_identity.id_verified_at IS NOT NULL;

  v_license_verified := v_identity.driver_license_verified_at IS NOT NULL;

  IF v_email_verified THEN v_progress := v_progress + 25; END IF;
  IF v_phone_verified THEN v_progress := v_progress + 25; END IF;
  IF v_doc_verified THEN v_progress := v_progress + 25; END IF;
  IF v_license_verified THEN v_progress := v_progress + 25; END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'current_level', CASE WHEN v_license_verified THEN 3 WHEN v_doc_verified THEN 2 WHEN v_email_verified OR v_phone_verified THEN 1 ELSE 0 END,
    'progress_percentage', v_progress,
    'requirements', json_build_object(
      'email_verified', v_email_verified,
      'phone_verified', v_phone_verified,
      'document_verified', v_doc_verified,
      'driver_license_verified', v_license_verified
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_verification_progress() TO authenticated;

-- generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      INSERT INTO public.referral_codes (user_id, code, current_uses)
      VALUES (p_user_id, new_code, 0)
      ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code;
      SELECT code INTO new_code FROM public.referral_codes WHERE user_id = p_user_id;
      EXIT;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_referral_code(UUID) TO authenticated;

-- get_referral_stats_by_user
CREATE OR REPLACE FUNCTION public.get_referral_stats_by_user(p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_total_referrals INT;
  v_total_rewards NUMERIC;
BEGIN
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_total_referrals FROM referrals WHERE referrer_id = p_user_id;
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_rewards FROM referral_rewards WHERE user_id = p_user_id AND status = 'paid';

  RETURN json_build_object(
    'code', v_code,
    'total_referrals', v_total_referrals,
    'total_rewards_cents', v_total_rewards
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_stats_by_user(UUID) TO authenticated;

-- ============================================
-- PART 10: TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.ensure_user_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
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
  AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION ensure_user_wallet();

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_tables INT;
  v_functions INT;
  v_views INT;
BEGIN
  SELECT COUNT(*) INTO v_tables FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('wallets', 'user_documents', 'referral_codes', 'user_identity_levels');

  SELECT COUNT(*) INTO v_functions FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name IN ('wallet_get_balance', 'get_user_documents', 'get_verification_progress', 'generate_referral_code');

  SELECT COUNT(*) INTO v_views FROM information_schema.views
  WHERE table_schema = 'public' AND table_name IN ('v_wallet_history', 'owner_bookings', 'my_bookings');

  RAISE NOTICE '============================================';
  RAISE NOTICE 'VERIFICATION:';
  RAISE NOTICE '  Tables created: %/4', v_tables;
  RAISE NOTICE '  Functions created: %/4', v_functions;
  RAISE NOTICE '  Views created: %/3', v_views;
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Complete schema fix applied!';
END $$;
