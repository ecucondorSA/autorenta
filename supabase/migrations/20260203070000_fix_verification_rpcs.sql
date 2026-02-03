-- ============================================================================
-- FIX: Create missing verification infrastructure
-- Date: 2026-02-03
-- Fixes: get_verification_progress (400), get_user_documents (404)
-- ============================================================================

-- ============================================================================
-- PART 1: Enum types (idempotent)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_kind') THEN
        CREATE TYPE public.document_kind AS ENUM (
            'gov_id_front',
            'gov_id_back',
            'driver_license',
            'utility_bill',
            'selfie',
            'license_front',
            'license_back',
            'vehicle_registration',
            'vehicle_insurance',
            'criminal_record'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
        CREATE TYPE public.kyc_status AS ENUM (
            'not_started',
            'pending',
            'verified',
            'rejected'
        );
    END IF;
END
$$;

-- ============================================================================
-- PART 2: user_documents table
-- ============================================================================

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
CREATE POLICY "Users can view own documents"
    ON public.user_documents FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.user_documents;
CREATE POLICY "Users can insert own documents"
    ON public.user_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.user_documents;
CREATE POLICY "Users can update own documents"
    ON public.user_documents FOR UPDATE
    USING (auth.uid() = user_id);

GRANT ALL ON public.user_documents TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_documents_id_seq TO authenticated;

-- ============================================================================
-- PART 3: user_identity_levels table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_identity_levels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  id_verified_at TIMESTAMPTZ,
  driver_license_verified_at TIMESTAMPTZ,
  selfie_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  country TEXT,
  document_type TEXT,
  document_number TEXT,
  document_verified_at TIMESTAMPTZ,
  document_ai_score NUMERIC(5,2),
  document_province TEXT,
  extracted_full_name TEXT,
  extracted_birth_date DATE,
  driver_license_number TEXT,
  driver_license_categories TEXT[],
  driver_license_expiry DATE,
  driver_license_ai_score NUMERIC(5,2),
  selfie_url TEXT,
  face_match_score NUMERIC(5,2),
  liveness_score NUMERIC(5,2)
);

CREATE INDEX IF NOT EXISTS idx_user_identity_levels_level ON public.user_identity_levels(current_level);

ALTER TABLE public.user_identity_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own identity level" ON public.user_identity_levels;
CREATE POLICY "Users can view own identity level"
    ON public.user_identity_levels FOR SELECT
    USING (auth.uid() = user_id);

GRANT SELECT ON public.user_identity_levels TO authenticated;

-- ============================================================================
-- PART 4: get_user_documents RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_documents(p_user_id UUID DEFAULT NULL)
RETURNS SETOF public.user_documents
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF auth.uid() != v_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT * FROM public.user_documents
  WHERE user_id = v_user_id
  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_documents(UUID) TO authenticated;

-- ============================================================================
-- PART 5: upsert_user_document RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_user_document(
  p_user_id UUID,
  p_kind TEXT,
  p_storage_path TEXT,
  p_status TEXT DEFAULT 'pending'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  INSERT INTO public.user_documents (user_id, kind, storage_path, status, created_at)
  VALUES (p_user_id, p_kind::document_kind, p_storage_path, p_status::kyc_status, NOW())
  ON CONFLICT (user_id, kind)
  DO UPDATE SET
    storage_path = EXCLUDED.storage_path,
    status = EXCLUDED.status,
    notes = NULL,
    reviewed_by = NULL,
    reviewed_at = NULL,
    analyzed_at = NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_document(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- PART 6: get_verification_progress RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_verification_progress()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_identity_level RECORD;
  v_auth_user RECORD;
  v_level_1_complete BOOLEAN;
  v_level_2_complete BOOLEAN;
  v_level_3_complete BOOLEAN;
  v_progress INT;
  v_email_verified BOOLEAN;
  v_phone_verified BOOLEAN;
  v_doc_verified BOOLEAN;
  v_license_verified BOOLEAN;
  v_selfie_verified BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  -- Get profile data (may not exist for new users)
  SELECT email_verified, phone_verified, id_verified
  INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  -- Get identity level data (may not exist)
  SELECT current_level, email_verified_at, phone_verified_at,
         id_verified_at, driver_license_verified_at, selfie_verified_at
  INTO v_identity_level
  FROM public.user_identity_levels
  WHERE user_id = v_user_id;

  -- Get auth user data
  SELECT email_confirmed_at, phone_confirmed_at
  INTO v_auth_user
  FROM auth.users
  WHERE id = v_user_id;

  -- Determine verification status
  v_email_verified := COALESCE(v_profile.email_verified, false)
                      OR v_auth_user.email_confirmed_at IS NOT NULL
                      OR v_identity_level.email_verified_at IS NOT NULL;

  v_phone_verified := COALESCE(v_profile.phone_verified, false)
                      OR v_auth_user.phone_confirmed_at IS NOT NULL
                      OR v_identity_level.phone_verified_at IS NOT NULL;

  v_doc_verified := COALESCE(v_profile.id_verified, false)
                    OR v_identity_level.id_verified_at IS NOT NULL;

  v_license_verified := v_identity_level.driver_license_verified_at IS NOT NULL;
  v_selfie_verified := v_identity_level.selfie_verified_at IS NOT NULL;

  -- Level completion
  v_level_1_complete := v_email_verified OR v_phone_verified;
  v_level_2_complete := v_doc_verified AND v_license_verified;
  v_level_3_complete := v_selfie_verified;

  -- Progress percentage
  v_progress := 0;
  IF v_email_verified THEN v_progress := v_progress + 25; END IF;
  IF v_phone_verified THEN v_progress := v_progress + 25; END IF;
  IF v_doc_verified THEN v_progress := v_progress + 15; END IF;
  IF v_license_verified THEN v_progress := v_progress + 15; END IF;
  IF v_selfie_verified THEN v_progress := v_progress + 20; END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'current_level', CASE
      WHEN v_level_3_complete THEN 3
      WHEN v_level_2_complete THEN 2
      WHEN v_level_1_complete THEN 1
      ELSE 0
    END,
    'progress_percentage', v_progress,
    'requirements', json_build_object(
      'level_1', json_build_object(
        'email_verified', v_email_verified,
        'phone_verified', v_phone_verified,
        'completed', v_level_1_complete
      ),
      'level_2', json_build_object(
        'document_verified', v_doc_verified,
        'driver_license_verified', v_license_verified,
        'completed', v_level_2_complete
      ),
      'level_3', json_build_object(
        'selfie_verified', v_selfie_verified,
        'completed', v_level_3_complete
      )
    ),
    'can_access_level_2', v_level_1_complete,
    'can_access_level_3', v_level_2_complete
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_verification_progress() TO authenticated;

COMMENT ON FUNCTION public.get_verification_progress IS 'Returns verification progress for current user';
COMMENT ON FUNCTION public.get_user_documents IS 'Returns documents uploaded by user';
