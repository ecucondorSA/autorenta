-- Migration: Create get_verification_progress RPC
-- Date: 2025-12-02
-- Description: Returns detailed verification progress for the current user

DROP FUNCTION IF EXISTS get_verification_progress();

CREATE OR REPLACE FUNCTION get_verification_progress()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_identity_level RECORD;
  v_auth_user RECORD;
  v_result JSON;
  v_level_1_complete BOOLEAN;
  v_level_2_complete BOOLEAN;
  v_level_3_complete BOOLEAN;
  v_progress INT;
  v_missing_requirements JSON[];
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

  -- Get profile data
  SELECT email_verified, phone_verified, id_verified
  INTO v_profile
  FROM profiles
  WHERE id = v_user_id;

  -- Get identity level data
  SELECT current_level, email_verified_at, phone_verified_at,
         id_verified_at, driver_license_verified_at
  INTO v_identity_level
  FROM user_identity_levels
  WHERE user_id = v_user_id;

  -- Get auth user data
  SELECT email_confirmed_at, phone_confirmed_at
  INTO v_auth_user
  FROM auth.users
  WHERE id = v_user_id;

  -- Determine verification status (check multiple sources)
  v_email_verified := COALESCE(v_profile.email_verified, false)
                      OR v_auth_user.email_confirmed_at IS NOT NULL
                      OR v_identity_level.email_verified_at IS NOT NULL;

  v_phone_verified := COALESCE(v_profile.phone_verified, false)
                      OR v_auth_user.phone_confirmed_at IS NOT NULL
                      OR v_identity_level.phone_verified_at IS NOT NULL;

  v_doc_verified := COALESCE(v_profile.id_verified, false)
                    OR v_identity_level.id_verified_at IS NOT NULL;

  v_license_verified := v_identity_level.driver_license_verified_at IS NOT NULL;

  v_selfie_verified := false; -- No selfie column yet

  -- Calculate level completion
  -- Level 1: Email OR Phone verified
  v_level_1_complete := v_email_verified OR v_phone_verified;
  -- Level 2: DNI AND License verified
  v_level_2_complete := v_doc_verified AND v_license_verified;
  -- Level 3: Selfie verified
  v_level_3_complete := v_selfie_verified;

  -- Calculate progress percentage
  -- Email: 25%, Phone: 25%, DNI: 15%, License: 15%, Selfie: 20%
  v_progress := 0;
  IF v_email_verified THEN v_progress := v_progress + 25; END IF;
  IF v_phone_verified THEN v_progress := v_progress + 25; END IF;
  IF v_doc_verified THEN v_progress := v_progress + 15; END IF;
  IF v_license_verified THEN v_progress := v_progress + 15; END IF;
  IF v_selfie_verified THEN v_progress := v_progress + 20; END IF;

  -- Build missing requirements array
  v_missing_requirements := ARRAY[]::JSON[];

  IF NOT v_email_verified THEN
    v_missing_requirements := array_append(v_missing_requirements,
      json_build_object('requirement', 'email_verified', 'label', 'Verificar email', 'level', 1));
  END IF;

  IF NOT v_phone_verified THEN
    v_missing_requirements := array_append(v_missing_requirements,
      json_build_object('requirement', 'phone_verified', 'label', 'Verificar teléfono', 'level', 1));
  END IF;

  IF NOT v_doc_verified THEN
    v_missing_requirements := array_append(v_missing_requirements,
      json_build_object('requirement', 'document_verified', 'label', 'Subir DNI', 'level', 2));
  END IF;

  IF NOT v_license_verified THEN
    v_missing_requirements := array_append(v_missing_requirements,
      json_build_object('requirement', 'driver_license_verified', 'label', 'Subir licencia', 'level', 2));
  END IF;

  IF NOT v_selfie_verified THEN
    v_missing_requirements := array_append(v_missing_requirements,
      json_build_object('requirement', 'selfie_verified', 'label', 'Verificar con selfie', 'level', 3));
  END IF;

  -- Build and return result
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
        'completed', v_level_2_complete,
        'ai_score', null,
        'driver_license_score', null
      ),
      'level_3', json_build_object(
        'selfie_verified', v_selfie_verified,
        'completed', v_level_3_complete,
        'face_match_score', null
      )
    ),
    'missing_requirements', COALESCE(to_json(v_missing_requirements), '[]'::json),
    'can_access_level_2', v_level_1_complete,
    'can_access_level_3', v_level_2_complete
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_verification_progress() TO authenticated;

-- Comment
COMMENT ON FUNCTION get_verification_progress() IS 'Returns detailed verification progress for the current authenticated user';
