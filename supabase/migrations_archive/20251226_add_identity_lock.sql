-- ============================================================================
-- Add Identity Lock to Profiles
-- Purpose: Make user identity data (name, DOB, document) IMMUTABLE after OCR verification
-- ============================================================================

-- 1. Add identity lock columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS identity_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_document_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS identity_country text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.identity_verified_at IS 'Timestamp when identity was verified via OCR';
COMMENT ON COLUMN public.profiles.identity_locked IS 'When true, name/DOB cannot be changed by user';
COMMENT ON COLUMN public.profiles.identity_document_number IS 'Document number from OCR verification (hashed for privacy)';
COMMENT ON COLUMN public.profiles.identity_country IS 'Country of identity document (AR/EC)';

-- 2. Create trigger function to prevent changes to locked identity fields
CREATE OR REPLACE FUNCTION prevent_locked_identity_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- If identity is locked, prevent changes to protected fields
  IF OLD.identity_locked = true THEN
    -- Check if trying to change full_name
    IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
      RAISE EXCEPTION 'Cannot modify full_name: identity is locked after verification. Contact support.';
    END IF;

    -- Check if trying to change date_of_birth
    IF NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
      RAISE EXCEPTION 'Cannot modify date_of_birth: identity is locked after verification. Contact support.';
    END IF;

    -- Check if trying to change identity_document_number
    IF NEW.identity_document_number IS DISTINCT FROM OLD.identity_document_number THEN
      RAISE EXCEPTION 'Cannot modify identity_document_number: identity is locked after verification. Contact support.';
    END IF;

    -- Prevent unlocking (only admin should be able to do this via service_role)
    IF NEW.identity_locked = false AND OLD.identity_locked = true THEN
      -- Only service_role can unlock
      IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
        RAISE EXCEPTION 'Cannot unlock identity: requires admin privileges. Contact support.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger on profiles table
DROP TRIGGER IF EXISTS trg_prevent_locked_identity ON public.profiles;
CREATE TRIGGER trg_prevent_locked_identity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_identity_changes();

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_identity_locked
  ON public.profiles(identity_locked)
  WHERE identity_locked = true;

CREATE INDEX IF NOT EXISTS idx_profiles_identity_document
  ON public.profiles(identity_document_number)
  WHERE identity_document_number IS NOT NULL;

-- 5. RPC function for the edge function to update profile with OCR data
-- This uses service_role which bypasses RLS and the trigger check
CREATE OR REPLACE FUNCTION public.update_profile_from_ocr(
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
SET search_path = public
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

-- Grant execute permission to service_role (for edge functions)
GRANT EXECUTE ON FUNCTION public.update_profile_from_ocr TO service_role;

-- 6. Create view for admin to see verification status
CREATE OR REPLACE VIEW public.v_identity_verification_status AS
SELECT
  p.id as user_id,
  p.full_name,
  p.email,
  p.identity_verified_at,
  p.identity_locked,
  p.identity_country,
  CASE
    WHEN p.identity_document_number IS NOT NULL
    THEN repeat('*', length(p.identity_document_number) - 4) || right(p.identity_document_number, 4)
    ELSE NULL
  END as document_masked,
  uil.document_ai_score,
  uil.driver_license_ai_score,
  uil.document_verified_at,
  uil.driver_license_verified_at
FROM profiles p
LEFT JOIN user_identity_levels uil ON uil.user_id = p.id
WHERE p.identity_locked = true
ORDER BY p.identity_verified_at DESC;

-- Grant access to admins
GRANT SELECT ON public.v_identity_verification_status TO authenticated;

-- RLS for the view (only admins can see)
-- Note: Views inherit the RLS of underlying tables, but we add a check
CREATE POLICY "admins_view_identity_status" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id  -- User can see their own
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)  -- Admins can see all
  );

-- 7. Function to admin-unlock an identity (for support cases)
CREATE OR REPLACE FUNCTION public.admin_unlock_identity(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Get current user
  v_admin_id := auth.uid();

  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_ADMIN',
      'message', 'Only admins can unlock identities'
    );
  END IF;

  -- Unlock the identity
  UPDATE profiles
  SET
    identity_locked = false,
    identity_verified_at = NULL,
    updated_at = now()
  WHERE id = p_user_id;

  -- Log the action (you may want to insert into an audit table)
  RAISE NOTICE 'Identity unlocked for user % by admin % - Reason: %', p_user_id, v_admin_id, p_reason;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Identity unlocked successfully',
    'unlocked_by', v_admin_id,
    'reason', p_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unlock_identity TO authenticated;
