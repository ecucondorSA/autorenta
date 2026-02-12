-- Fix: Add missing identity columns to profiles table
-- These were defined in archive migration 03_archive but never executed on this DB.
-- The RPC update_profile_from_ocr references these columns but they don't exist,
-- causing it to crash at runtime with "column does not exist" errors.

-- 1. Add missing columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gov_id_type text,
  ADD COLUMN IF NOT EXISTS gov_id_number text,
  ADD COLUMN IF NOT EXISTS identity_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_document_number text,
  ADD COLUMN IF NOT EXISTS identity_country text;

-- 2. Extend RPC: add p_gov_id_type parameter, sync gov_id_type + gov_id_number
CREATE OR REPLACE FUNCTION public.update_profile_from_ocr(
  p_user_id uuid,
  p_full_name text,
  p_date_of_birth date,
  p_document_number text,
  p_country text,
  p_ocr_confidence numeric,
  p_gov_id_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing record;
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
    gov_id_type = COALESCE(NULLIF(TRIM(p_gov_id_type), ''), gov_id_type),
    gov_id_number = COALESCE(NULLIF(TRIM(p_document_number), ''), gov_id_number),
    identity_document_number = p_document_number,
    identity_country = p_country,
    identity_verified_at = now(),
    identity_locked = true,
    id_verified = true,
    updated_at = now()
  WHERE id = p_user_id;

  -- Also sync to user_identity_levels
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
