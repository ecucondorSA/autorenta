-- ============================================================================
-- PROGRESSIVE VERIFICATION SYSTEM - 3 LEVELS
-- Implements a gradual identity verification system
-- Level 1: Email + Phone (explore platform)
-- Level 2: Basic ID (publish car, book <$50k)
-- Level 3: Full verification with AI (unlimited access)
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: user_identity_levels
-- Stores progressive verification status for each user
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_identity_levels (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Current verification level (1, 2, or 3)
  current_level INT NOT NULL CHECK (current_level IN (1, 2, 3)) DEFAULT 1,

  -- Level 1: Email + Phone verification
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  phone_number TEXT,
  phone_country_code TEXT DEFAULT '+54', -- Argentina by default

  -- Level 2: Basic document verification
  document_type TEXT CHECK (document_type IN ('DNI', 'PASAPORTE', 'LC', 'LE', 'CI')),
  document_number TEXT,
  document_front_url TEXT, -- Supabase Storage URL
  document_back_url TEXT,  -- Supabase Storage URL
  document_verified_at TIMESTAMPTZ,
  document_ai_score NUMERIC(5,2) CHECK (document_ai_score >= 0 AND document_ai_score <= 100),
  document_ai_metadata JSONB DEFAULT '{}'::jsonb,

  -- Level 3: Advanced verification with face matching
  selfie_url TEXT, -- Supabase Storage URL
  selfie_verified_at TIMESTAMPTZ,
  face_match_score NUMERIC(5,2) CHECK (face_match_score >= 0 AND face_match_score <= 100),
  liveness_score NUMERIC(5,2) CHECK (liveness_score >= 0 AND liveness_score <= 100),

  -- Manual review for edge cases
  manual_review_required BOOLEAN DEFAULT false,
  manual_reviewed_by UUID REFERENCES public.profiles(id),
  manual_reviewed_at TIMESTAMPTZ,
  manual_review_notes TEXT,
  manual_review_decision TEXT CHECK (manual_review_decision IN ('APPROVED', 'REJECTED', 'PENDING')),

  -- Extracted data from documents (encrypted in production)
  extracted_full_name TEXT,
  extracted_birth_date DATE,
  extracted_gender TEXT CHECK (extracted_gender IN ('M', 'F', 'X', 'O')),
  extracted_nationality TEXT DEFAULT 'AR',

  -- Metadata
  verification_attempts JSONB DEFAULT '[]'::jsonb, -- Array of attempt logs
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_identity_levels IS 'Progressive verification system - 3 levels of identity validation';
COMMENT ON COLUMN public.user_identity_levels.current_level IS '1=Explorer, 2=Participant, 3=Full Verified';
COMMENT ON COLUMN public.user_identity_levels.document_ai_score IS 'AI confidence score from OCR and fake detection (0-100)';
COMMENT ON COLUMN public.user_identity_levels.face_match_score IS 'Face matching score between selfie and document (0-100)';
COMMENT ON COLUMN public.user_identity_levels.liveness_score IS 'Liveness detection score to prevent spoofing (0-100)';

-- Indexes for performance
CREATE INDEX idx_identity_levels_current_level ON public.user_identity_levels(current_level);
CREATE INDEX idx_identity_levels_manual_review ON public.user_identity_levels(manual_review_required)
  WHERE manual_review_required = true;
CREATE INDEX idx_identity_levels_document_verified ON public.user_identity_levels(document_verified_at)
  WHERE document_verified_at IS NOT NULL;
CREATE INDEX idx_identity_levels_selfie_verified ON public.user_identity_levels(selfie_verified_at)
  WHERE selfie_verified_at IS NOT NULL;

-- Updated timestamp trigger
CREATE TRIGGER set_identity_levels_updated_at
  BEFORE UPDATE ON public.user_identity_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.user_identity_levels ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification status
CREATE POLICY "Users can view own identity level"
  ON public.user_identity_levels FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own verification record (Level 1 only)
CREATE POLICY "Users can create own identity level"
  ON public.user_identity_levels FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    current_level = 1 -- Only Level 1 can be self-created
  );

-- Users can update their own verification data (limited fields)
CREATE POLICY "Users can update own verification data"
  ON public.user_identity_levels FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    -- Users can only update upload fields, not verification status
    (document_front_url IS DISTINCT FROM OLD.document_front_url OR
     document_back_url IS DISTINCT FROM OLD.document_back_url OR
     selfie_url IS DISTINCT FROM OLD.selfie_url OR
     phone_number IS DISTINCT FROM OLD.phone_number)
  );

-- Service role (Edge Functions) can manage all verification data
CREATE POLICY "Service role can manage identity levels"
  ON public.user_identity_levels FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admins can view all verification records for manual review
CREATE POLICY "Admins can view all identity levels"
  ON public.user_identity_levels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update manual review fields
CREATE POLICY "Admins can update manual review"
  ON public.user_identity_levels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    ) AND
    -- Admins can only update review-related fields
    (manual_review_required IS DISTINCT FROM OLD.manual_review_required OR
     manual_reviewed_by IS DISTINCT FROM OLD.manual_reviewed_by OR
     manual_reviewed_at IS DISTINCT FROM OLD.manual_reviewed_at OR
     manual_review_notes IS DISTINCT FROM OLD.manual_review_notes OR
     manual_review_decision IS DISTINCT FROM OLD.manual_review_decision OR
     current_level IS DISTINCT FROM OLD.current_level)
  );

-- ============================================================================
-- MIGRATE EXISTING DATA
-- Map existing profiles to Level 1 (email/phone verified users to Level 2)
-- ============================================================================

INSERT INTO public.user_identity_levels (
  user_id,
  current_level,
  email_verified_at,
  phone_verified_at,
  phone_number
)
SELECT
  p.id,
  CASE
    -- If both email and phone verified, assume Level 2 (legacy users)
    WHEN p.is_email_verified AND p.is_phone_verified THEN 2
    -- If only email verified, Level 1
    WHEN p.is_email_verified OR p.is_phone_verified THEN 1
    -- Default to Level 1
    ELSE 1
  END as current_level,
  CASE WHEN p.is_email_verified THEN now() ELSE NULL END as email_verified_at,
  CASE WHEN p.is_phone_verified THEN now() ELSE NULL END as phone_verified_at,
  p.phone as phone_number
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- RPC FUNCTION: check_user_level_access
-- Validates if user has required verification level for an action
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_user_level_access(
  p_user_id UUID DEFAULT NULL,
  p_required_level INT DEFAULT 2,
  p_action TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_level INT;
  v_result JSONB;
BEGIN
  -- Use provided user_id or current auth user
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Not authenticated',
      'current_level', 0,
      'required_level', p_required_level
    );
  END IF;

  -- Get current verification level
  SELECT current_level INTO v_current_level
  FROM public.user_identity_levels
  WHERE user_id = v_user_id;

  -- If no record exists, create Level 1 entry
  IF v_current_level IS NULL THEN
    INSERT INTO public.user_identity_levels (user_id, current_level)
    VALUES (v_user_id, 1)
    ON CONFLICT (user_id) DO NOTHING;

    v_current_level := 1;
  END IF;

  -- Check if user has required level
  IF v_current_level >= p_required_level THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current_level', v_current_level,
      'required_level', p_required_level
    );
  ELSE
    RETURN jsonb_build_object(
      'allowed', false,
      'current_level', v_current_level,
      'required_level', p_required_level,
      'action', p_action,
      'upgrade_url', '/verification/upgrade?required=' || p_required_level ||
                     '&current=' || v_current_level ||
                     CASE WHEN p_action IS NOT NULL THEN '&action=' || p_action ELSE '' END,
      'message', CASE p_required_level
        WHEN 2 THEN 'Necesitás verificar tu identidad con DNI para realizar esta acción'
        WHEN 3 THEN 'Esta acción requiere verificación completa con selfie'
        ELSE 'Necesitás un nivel de verificación mayor'
      END
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.check_user_level_access IS 'Validates if user meets required verification level for an action';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_level_access TO authenticated;

-- ============================================================================
-- RPC FUNCTION: get_user_verification_status
-- Returns detailed verification status for current user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_verification_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status JSONB;
  v_level_data RECORD;
BEGIN
  -- Get verification level data
  SELECT * INTO v_level_data
  FROM public.user_identity_levels
  WHERE user_id = auth.uid();

  -- If no record, return default Level 1 status
  IF v_level_data IS NULL THEN
    RETURN jsonb_build_object(
      'current_level', 1,
      'level_1_complete', false,
      'level_2_complete', false,
      'level_3_complete', false,
      'email_verified', false,
      'phone_verified', false,
      'document_verified', false,
      'selfie_verified', false,
      'manual_review_required', false,
      'can_upgrade', true
    );
  END IF;

  -- Build detailed status
  RETURN jsonb_build_object(
    'current_level', v_level_data.current_level,
    'level_1_complete', (v_level_data.email_verified_at IS NOT NULL AND v_level_data.phone_verified_at IS NOT NULL),
    'level_2_complete', (v_level_data.document_verified_at IS NOT NULL),
    'level_3_complete', (v_level_data.selfie_verified_at IS NOT NULL),
    'email_verified', (v_level_data.email_verified_at IS NOT NULL),
    'phone_verified', (v_level_data.phone_verified_at IS NOT NULL),
    'document_verified', (v_level_data.document_verified_at IS NOT NULL),
    'selfie_verified', (v_level_data.selfie_verified_at IS NOT NULL),
    'document_ai_score', v_level_data.document_ai_score,
    'face_match_score', v_level_data.face_match_score,
    'liveness_score', v_level_data.liveness_score,
    'manual_review_required', COALESCE(v_level_data.manual_review_required, false),
    'manual_review_decision', v_level_data.manual_review_decision,
    'can_upgrade', (v_level_data.current_level < 3 AND v_level_data.manual_review_required = false),
    'phone_number', v_level_data.phone_number,
    'document_type', v_level_data.document_type,
    'document_number', v_level_data.document_number,
    'created_at', v_level_data.created_at,
    'updated_at', v_level_data.updated_at
  );
END;
$$;

COMMENT ON FUNCTION public.get_user_verification_status IS 'Returns detailed verification status for authenticated user';

GRANT EXECUTE ON FUNCTION public.get_user_verification_status TO authenticated;

-- ============================================================================
-- RPC FUNCTION: get_verification_limits
-- Returns what user can do based on their verification level
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_verification_limits(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_level INT;
  v_limits JSONB;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  SELECT current_level INTO v_current_level
  FROM public.user_identity_levels
  WHERE user_id = v_user_id;

  -- Default to Level 1 if not found
  v_current_level := COALESCE(v_current_level, 1);

  -- Define limits per level
  CASE v_current_level
    WHEN 1 THEN
      v_limits := jsonb_build_object(
        'level', 1,
        'level_name', 'Explorador',
        'can_publish_cars', false,
        'max_cars', 0,
        'can_book', false,
        'max_booking_days', 0,
        'max_booking_amount', 0,
        'can_deposit', false,
        'max_deposit_amount', 0,
        'can_withdraw', false,
        'max_withdraw_monthly', 0,
        'premium_insurance', false,
        'priority_support', false,
        'features', jsonb_build_array(
          'Ver catálogo completo',
          'Filtrar búsquedas',
          'Ver perfiles de propietarios',
          'Agregar a favoritos',
          'Contactar soporte'
        )
      );
    WHEN 2 THEN
      v_limits := jsonb_build_object(
        'level', 2,
        'level_name', 'Participante',
        'can_publish_cars', true,
        'max_cars', 1,
        'can_book', true,
        'max_booking_days', 7,
        'max_booking_amount', 50000, -- ARS
        'can_deposit', true,
        'max_deposit_amount', 100000, -- ARS
        'can_withdraw', true,
        'max_withdraw_monthly', 50000, -- ARS
        'premium_insurance', false,
        'priority_support', false,
        'features', jsonb_build_array(
          'Publicar 1 auto',
          'Reservas hasta 7 días',
          'Transacciones hasta $50k ARS',
          'Retiros hasta $50k/mes',
          'Ver contacto en reservas confirmadas'
        )
      );
    WHEN 3 THEN
      v_limits := jsonb_build_object(
        'level', 3,
        'level_name', 'Verificado Full',
        'can_publish_cars', true,
        'max_cars', NULL, -- unlimited
        'can_book', true,
        'max_booking_days', NULL, -- unlimited
        'max_booking_amount', NULL, -- unlimited
        'can_deposit', true,
        'max_deposit_amount', NULL, -- unlimited
        'can_withdraw', true,
        'max_withdraw_monthly', NULL, -- unlimited
        'premium_insurance', true,
        'priority_support', true,
        'features', jsonb_build_array(
          'Publicar autos ilimitados',
          'Reservas sin límite',
          'Transacciones sin límite',
          'Retiros sin límite',
          'Seguros premium',
          'Soporte prioritario'
        )
      );
  END CASE;

  RETURN v_limits;
END;
$$;

COMMENT ON FUNCTION public.get_verification_limits IS 'Returns user capabilities based on verification level';

GRANT EXECUTE ON FUNCTION public.get_verification_limits TO authenticated;

-- ============================================================================
-- STORAGE BUCKET: identity-documents
-- Secure storage for identity documents and selfies
-- ============================================================================

-- Note: Run this in Supabase Dashboard SQL Editor or via Supabase CLI
-- CREATE BUCKET if not exists 'identity-documents' with PUBLIC = false;

-- RLS for identity-documents bucket
-- CREATE POLICY "Users can upload own identity documents"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'identity-documents' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- CREATE POLICY "Users can read own identity documents"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'identity-documents' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- CREATE POLICY "Service role can read all identity documents"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'identity-documents' AND
--     auth.role() = 'service_role'
--   );

-- CREATE POLICY "Admins can read all identity documents"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'identity-documents' AND
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE id = auth.uid() AND is_admin = true
--     )
--   );

COMMIT;
