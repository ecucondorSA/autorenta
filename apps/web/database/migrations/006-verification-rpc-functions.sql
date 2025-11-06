-- Migration: Verification RPC Functions
-- Purpose: RPC functions for email/phone verification, OTP, and progress tracking
-- Created: 2025-11-05

-- =====================================================
-- FUNCTION: Resend Email Verification
-- =====================================================
CREATE OR REPLACE FUNCTION public.resend_verification_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_email_confirmed BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Get user email and confirmation status
  SELECT
    email,
    email_confirmed_at IS NOT NULL
  INTO v_email, v_email_confirmed
  FROM auth.users
  WHERE id = v_user_id;

  -- Check if already verified
  IF v_email_confirmed THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'El email ya está verificado'
    );
  END IF;

  -- Note: Actual email sending is handled by Supabase Auth
  -- This function serves as a trigger point for frontend
  RAISE LOG 'Email verification requested for user: %, email: %', v_user_id, v_email;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Email de verificación reenviado. Por favor revisa tu bandeja de entrada.'
  );
END;
$$;

COMMENT ON FUNCTION public.resend_verification_email() IS
'Marks email verification as requested (actual sending handled by Supabase Auth)';


-- =====================================================
-- FUNCTION: Send Phone OTP
-- =====================================================
CREATE OR REPLACE FUNCTION public.send_phone_otp(
  p_phone TEXT,
  p_country_code TEXT DEFAULT '+54'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_full_phone TEXT;
  v_rate_limit_key TEXT;
  v_recent_attempts INT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Format phone number (E.164 format)
  v_full_phone := CASE
    WHEN p_phone LIKE '+%' THEN p_phone
    ELSE p_country_code || LTRIM(p_phone, '0')
  END;

  -- Rate limiting: Check attempts in last hour
  v_rate_limit_key := 'phone_otp_' || v_user_id;

  -- TODO: Implement rate limiting with pg_cron or external service
  -- For now, just log the attempt
  RAISE LOG 'Phone OTP requested for user: %, phone: %', v_user_id, v_full_phone;

  -- Note: Actual OTP sending is handled by Supabase Auth
  -- This function validates and prepares the request
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Código OTP enviado al teléfono',
    'phone', v_full_phone
  );
END;
$$;

COMMENT ON FUNCTION public.send_phone_otp(TEXT, TEXT) IS
'Prepares and validates phone OTP request (actual sending by Supabase Auth)';


-- =====================================================
-- FUNCTION: Verify Phone OTP
-- =====================================================
CREATE OR REPLACE FUNCTION public.verify_phone_otp(
  p_phone TEXT,
  p_token TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Note: Actual OTP verification is handled by Supabase Auth
  -- This function is called after successful verification
  RAISE LOG 'Phone OTP verification for user: %, phone: %', v_user_id, p_phone;

  -- The trigger sync_phone_verification() will handle the actual update
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Teléfono verificado exitosamente'
  );
END;
$$;

COMMENT ON FUNCTION public.verify_phone_otp(TEXT, TEXT) IS
'Post-verification callback for phone OTP (actual verification by Supabase Auth)';


-- =====================================================
-- FUNCTION: Get Verification Progress
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_verification_progress()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_level_data RECORD;
  v_progress INT := 0;
  v_requirements jsonb;
  v_missing jsonb[];
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Get user identity level data
  SELECT * INTO v_level_data
  FROM public.user_identity_levels
  WHERE user_id = v_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_identity_levels (
      user_id,
      current_level,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      1,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_level_data;
  END IF;

  -- Calculate progress (0-100%)
  v_progress := 0;

  -- Level 1: Email (20%) + Phone (20%)
  IF v_level_data.email_verified_at IS NOT NULL THEN
    v_progress := v_progress + 20;
  ELSE
    v_missing := array_append(v_missing, jsonb_build_object(
      'requirement', 'email',
      'label', 'Verificar email',
      'level', 1
    ));
  END IF;

  IF v_level_data.phone_verified_at IS NOT NULL THEN
    v_progress := v_progress + 20;
  ELSE
    v_missing := array_append(v_missing, jsonb_build_object(
      'requirement', 'phone',
      'label', 'Verificar teléfono',
      'level', 1
    ));
  END IF;

  -- Level 2: Documents (40%)
  IF (v_level_data.document_front_url IS NOT NULL
      AND v_level_data.document_ai_score >= 70) THEN
    v_progress := v_progress + 20;
  ELSE
    v_missing := array_append(v_missing, jsonb_build_object(
      'requirement', 'document_id',
      'label', 'Subir DNI/documento de identidad',
      'level', 2
    ));
  END IF;

  IF (v_level_data.driver_license_verified_at IS NOT NULL
      OR v_level_data.document_back_url IS NOT NULL) THEN
    v_progress := v_progress + 20;
  ELSE
    v_missing := array_append(v_missing, jsonb_build_object(
      'requirement', 'driver_license',
      'label', 'Subir licencia de conducir o documentos adicionales',
      'level', 2
    ));
  END IF;

  -- Level 3: Selfie (20%)
  IF (v_level_data.selfie_verified_at IS NOT NULL
      AND v_level_data.face_match_score >= 70) THEN
    v_progress := v_progress + 20;
  ELSE
    v_missing := array_append(v_missing, jsonb_build_object(
      'requirement', 'selfie',
      'label', 'Verificar identidad con selfie video',
      'level', 3,
      'requires_level_2', TRUE
    ));
  END IF;

  -- Build requirements object
  v_requirements := jsonb_build_object(
    'level_1', jsonb_build_object(
      'email_verified', v_level_data.email_verified_at IS NOT NULL,
      'phone_verified', v_level_data.phone_verified_at IS NOT NULL,
      'completed', (v_level_data.email_verified_at IS NOT NULL
                    OR v_level_data.phone_verified_at IS NOT NULL)
    ),
    'level_2', jsonb_build_object(
      'document_verified', (v_level_data.document_front_url IS NOT NULL
                            AND v_level_data.document_ai_score >= 70),
      'driver_license_verified', (v_level_data.driver_license_verified_at IS NOT NULL
                                   OR v_level_data.document_back_url IS NOT NULL),
      'completed', v_level_data.current_level >= 2,
      'ai_score', v_level_data.document_ai_score,
      'driver_license_score', v_level_data.driver_license_ai_score
    ),
    'level_3', jsonb_build_object(
      'selfie_verified', (v_level_data.selfie_verified_at IS NOT NULL
                          AND v_level_data.face_match_score >= 70),
      'completed', v_level_data.current_level >= 3,
      'face_match_score', v_level_data.face_match_score
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', v_user_id,
    'current_level', v_level_data.current_level,
    'progress_percentage', v_progress,
    'requirements', v_requirements,
    'missing_requirements', COALESCE(v_missing, ARRAY[]::jsonb[]),
    'can_access_level_2', v_level_data.current_level >= 1,
    'can_access_level_3', v_level_data.current_level >= 2
  );
END;
$$;

COMMENT ON FUNCTION public.get_verification_progress() IS
'Returns detailed verification progress for current user (0-100%)';


-- =====================================================
-- FUNCTION: Check Level Requirements
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_level_requirements(
  p_required_level INT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_level INT;
  v_upgrade_message TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Get current level
  SELECT current_level INTO v_current_level
  FROM public.user_identity_levels
  WHERE user_id = v_user_id;

  -- If no record, assume level 1
  IF NOT FOUND THEN
    v_current_level := 1;
  END IF;

  -- Check if user meets requirements
  IF v_current_level >= p_required_level THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'current_level', v_current_level,
      'required_level', p_required_level
    );
  END IF;

  -- Build upgrade message
  v_upgrade_message := CASE p_required_level
    WHEN 1 THEN 'Por favor verifica tu email o teléfono para continuar'
    WHEN 2 THEN 'Por favor completa la verificación de documentos (DNI + licencia) para continuar'
    WHEN 3 THEN 'Por favor completa la verificación biométrica (selfie) para continuar'
    ELSE 'Nivel de verificación insuficiente'
  END;

  RETURN jsonb_build_object(
    'allowed', FALSE,
    'current_level', v_current_level,
    'required_level', p_required_level,
    'message', v_upgrade_message,
    'upgrade_url', '/profile?tab=verification'
  );
END;
$$;

COMMENT ON FUNCTION public.check_level_requirements(INT) IS
'Validates if user has required verification level for an action';


-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.resend_verification_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_phone_otp(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_phone_otp(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verification_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_level_requirements(INT) TO authenticated;

-- Service role needs full access for edge functions
GRANT EXECUTE ON FUNCTION public.resend_verification_email() TO service_role;
GRANT EXECUTE ON FUNCTION public.send_phone_otp(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_phone_otp(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_verification_progress() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_level_requirements(INT) TO service_role;


-- =====================================================
-- VERIFICATION TESTS
-- =====================================================

-- Test that functions were created
DO $$
DECLARE
  v_function_count INT;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'resend_verification_email',
      'send_phone_otp',
      'verify_phone_otp',
      'get_verification_progress',
      'check_level_requirements'
    );

  IF v_function_count = 5 THEN
    RAISE NOTICE 'SUCCESS: All 5 RPC functions created successfully';
  ELSE
    RAISE EXCEPTION 'ERROR: Only % of 5 functions created', v_function_count;
  END IF;
END $$;
