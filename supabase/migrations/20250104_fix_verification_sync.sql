-- Migration: Fix verification sync issues
--
-- Issues fixed:
-- 1. document_verified_at vs id_verified_at misalignment
-- 2. current_level not updating after verification
-- 3. update_profile_from_ocr not syncing to user_identity_levels

-- =====================================================
-- 1. Create trigger function to sync and recalculate level
-- =====================================================

CREATE OR REPLACE FUNCTION sync_verification_level()
RETURNS TRIGGER AS $$
DECLARE
  v_email_verified BOOLEAN;
  v_phone_verified BOOLEAN;
  v_doc_verified BOOLEAN;
  v_license_verified BOOLEAN;
  v_selfie_verified BOOLEAN;
  v_new_level INT;
BEGIN
  -- Check email verification (from auth.users or user_identity_levels)
  SELECT
    COALESCE(
      (SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE id = NEW.user_id),
      NEW.email_verified_at IS NOT NULL
    )
  INTO v_email_verified;

  -- Check phone verification
  SELECT
    COALESCE(
      (SELECT phone_confirmed_at IS NOT NULL FROM auth.users WHERE id = NEW.user_id),
      NEW.phone_verified_at IS NOT NULL
    )
  INTO v_phone_verified;

  -- Check document verification (use id_verified_at or document_verified_at)
  v_doc_verified := NEW.id_verified_at IS NOT NULL OR NEW.document_verified_at IS NOT NULL;

  -- Check license verification
  v_license_verified := NEW.driver_license_verified_at IS NOT NULL;

  -- Check selfie verification
  v_selfie_verified := NEW.selfie_verified_at IS NOT NULL;

  -- Calculate new level
  -- Level 0: Nothing verified
  -- Level 1: Email OR Phone verified
  -- Level 2: Level 1 + DNI AND License verified
  -- Level 3: Level 2 + Selfie verified
  IF v_selfie_verified AND v_doc_verified AND v_license_verified AND (v_email_verified OR v_phone_verified) THEN
    v_new_level := 3;
  ELSIF v_doc_verified AND v_license_verified AND (v_email_verified OR v_phone_verified) THEN
    v_new_level := 2;
  ELSIF v_email_verified OR v_phone_verified THEN
    v_new_level := 1;
  ELSE
    v_new_level := 0;
  END IF;

  -- Update current_level if changed
  IF NEW.current_level IS DISTINCT FROM v_new_level THEN
    NEW.current_level := v_new_level;
  END IF;

  -- Sync document_verified_at to id_verified_at if needed
  IF NEW.document_verified_at IS NOT NULL AND NEW.id_verified_at IS NULL THEN
    NEW.id_verified_at := NEW.document_verified_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_sync_verification_level ON user_identity_levels;

-- Create trigger
CREATE TRIGGER trg_sync_verification_level
  BEFORE INSERT OR UPDATE ON user_identity_levels
  FOR EACH ROW
  EXECUTE FUNCTION sync_verification_level();

-- =====================================================
-- 2. Update update_profile_from_ocr to sync to user_identity_levels
-- =====================================================

CREATE OR REPLACE FUNCTION update_profile_from_ocr(
  p_user_id uuid,
  p_full_name text,
  p_date_of_birth date,
  p_document_number text,
  p_country text,
  p_ocr_confidence numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing record;
  v_result jsonb;
BEGIN
  -- Check if profile exists and is already locked
  SELECT identity_locked, identity_verified_at, full_name, date_of_birth
  INTO v_existing
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PROFILE_NOT_FOUND',
      'message', 'User profile not found'
    );
  END IF;

  -- If already locked, don't update
  IF v_existing.identity_locked = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_LOCKED',
      'message', 'Identity already verified and locked',
      'verified_at', v_existing.identity_verified_at
    );
  END IF;

  -- Only auto-verify if confidence >= 70%
  IF p_ocr_confidence < 70 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'LOW_CONFIDENCE',
      'message', 'OCR confidence too low for automatic verification',
      'confidence', p_ocr_confidence
    );
  END IF;

  -- Update profile with OCR data and lock it
  UPDATE profiles
  SET
    full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
    date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
    identity_document_number = p_document_number,
    identity_country = p_country,
    identity_verified_at = now(),
    identity_locked = true,
    id_verified = true,
    updated_at = now()
  WHERE id = p_user_id;

  -- IMPORTANT: Also sync to user_identity_levels
  -- This ensures get_verification_progress sees the verification
  INSERT INTO user_identity_levels (user_id, id_verified_at, document_verified_at, updated_at)
  VALUES (p_user_id, now(), now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    id_verified_at = COALESCE(user_identity_levels.id_verified_at, now()),
    document_verified_at = COALESCE(user_identity_levels.document_verified_at, now()),
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile updated and identity locked',
    'verified_at', now(),
    'full_name', p_full_name,
    'document_number', CASE
      WHEN length(p_document_number) > 4
      THEN repeat('*', length(p_document_number) - 4) || right(p_document_number, 4)
      ELSE p_document_number
    END
  );
END;
$$;

-- =====================================================
-- 3. Fix existing data: sync document_verified_at to id_verified_at
-- =====================================================

UPDATE user_identity_levels
SET
  id_verified_at = document_verified_at,
  updated_at = now()
WHERE document_verified_at IS NOT NULL
  AND id_verified_at IS NULL;

-- =====================================================
-- 4. Update get_verification_progress to also check document_verified_at
-- =====================================================

CREATE OR REPLACE FUNCTION get_verification_progress()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  v_face_match_score NUMERIC;
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

  -- Get identity level data (now including selfie_verified_at and face_match_score)
  SELECT current_level, email_verified_at, phone_verified_at,
         id_verified_at, document_verified_at, driver_license_verified_at,
         selfie_verified_at, face_match_score
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

  -- FIX: Check BOTH id_verified_at AND document_verified_at
  v_doc_verified := COALESCE(v_profile.id_verified, false)
                    OR v_identity_level.id_verified_at IS NOT NULL
                    OR v_identity_level.document_verified_at IS NOT NULL;

  v_license_verified := v_identity_level.driver_license_verified_at IS NOT NULL;

  -- FIX: Read selfie_verified_at from user_identity_levels
  v_selfie_verified := v_identity_level.selfie_verified_at IS NOT NULL;
  v_face_match_score := v_identity_level.face_match_score;

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
        'face_match_score', v_face_match_score
      )
    ),
    'missing_requirements', COALESCE(to_json(v_missing_requirements), '[]'::json),
    'can_access_level_2', v_level_1_complete,
    'can_access_level_3', v_level_2_complete
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_verification_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_from_ocr(uuid, text, date, text, text, numeric) TO service_role;
