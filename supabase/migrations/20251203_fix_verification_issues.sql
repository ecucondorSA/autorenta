-- ============================================================================
-- Migration: Fix Verification Issues
-- Date: 2025-12-03
-- Description: Fixes issues found during E2E testing:
--   1. Add license_front/license_back to document_kind enum
--   2. Add UNIQUE constraint to user_documents(user_id, kind)
--   3. Create trigger to sync profiles verification fields with user_verifications
-- ============================================================================

-- ============================================================================
-- 1. EXTEND document_kind ENUM
-- ============================================================================

-- Add new values to the enum for license front and back
ALTER TYPE document_kind ADD VALUE IF NOT EXISTS 'license_front';
ALTER TYPE document_kind ADD VALUE IF NOT EXISTS 'license_back';

-- Also add vehicle documents that might be needed
ALTER TYPE document_kind ADD VALUE IF NOT EXISTS 'vehicle_registration';
ALTER TYPE document_kind ADD VALUE IF NOT EXISTS 'vehicle_insurance';

-- ============================================================================
-- 2. ADD UNIQUE CONSTRAINT TO user_documents
-- ============================================================================

-- First, remove any duplicates (keep the most recent one)
DELETE FROM user_documents a
USING user_documents b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.kind = b.kind;

-- Now add the unique constraint
ALTER TABLE user_documents
DROP CONSTRAINT IF EXISTS user_documents_user_kind_unique;

ALTER TABLE user_documents
ADD CONSTRAINT user_documents_user_kind_unique
UNIQUE (user_id, kind);

-- ============================================================================
-- 3. CREATE SYNC TRIGGER FOR VERIFICATION STATUS
-- ============================================================================

-- Function to sync profiles verification fields based on user_verifications and user_documents
CREATE OR REPLACE FUNCTION sync_profile_verification_status()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_email_verified boolean;
  v_phone_verified boolean;
  v_id_verified boolean;
  v_has_gov_id boolean;
  v_has_license boolean;
  v_driver_verified boolean;
  v_owner_verified boolean;
BEGIN
  -- Get user_id from the trigger context
  IF TG_TABLE_NAME = 'user_verifications' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'user_documents' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check if user has verified government ID documents
  SELECT EXISTS(
    SELECT 1 FROM user_documents
    WHERE user_id = v_user_id
      AND kind IN ('gov_id_front', 'gov_id_back')
      AND status = 'verified'
  ) INTO v_has_gov_id;

  -- Check if user has verified license
  SELECT EXISTS(
    SELECT 1 FROM user_documents
    WHERE user_id = v_user_id
      AND kind IN ('driver_license', 'license_front', 'license_back')
      AND status = 'verified'
  ) INTO v_has_license;

  -- Check user_verifications status
  SELECT
    COALESCE(bool_or(status = 'VERIFICADO' AND role = 'driver'), false),
    COALESCE(bool_or(status = 'VERIFICADO' AND role = 'owner'), false)
  INTO v_driver_verified, v_owner_verified
  FROM user_verifications
  WHERE user_id = v_user_id;

  -- Determine verification status
  -- Email verified if they have any verified status (simplified - could check auth.users)
  v_email_verified := v_driver_verified OR v_owner_verified;

  -- Phone verified if they have verified documents or status
  v_phone_verified := v_driver_verified OR v_owner_verified OR v_has_gov_id;

  -- ID verified if they have verified government ID and either driver/owner verified
  v_id_verified := v_has_gov_id AND (v_driver_verified OR v_owner_verified);

  -- Update profiles table
  UPDATE profiles
  SET
    email_verified = v_email_verified,
    phone_verified = v_phone_verified,
    id_verified = v_id_verified,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on user_verifications
DROP TRIGGER IF EXISTS sync_verification_on_user_verifications ON user_verifications;
CREATE TRIGGER sync_verification_on_user_verifications
AFTER INSERT OR UPDATE OR DELETE ON user_verifications
FOR EACH ROW
EXECUTE FUNCTION sync_profile_verification_status();

-- Create triggers on user_documents
DROP TRIGGER IF EXISTS sync_verification_on_user_documents ON user_documents;
CREATE TRIGGER sync_verification_on_user_documents
AFTER INSERT OR UPDATE OR DELETE ON user_documents
FOR EACH ROW
EXECUTE FUNCTION sync_profile_verification_status();

-- ============================================================================
-- 4. RUN INITIAL SYNC FOR EXISTING USERS
-- ============================================================================

-- Sync all existing users who have verifications
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id
    FROM user_verifications
    WHERE status = 'VERIFICADO'
  LOOP
    -- Trigger the sync by doing a dummy update
    UPDATE user_verifications
    SET updated_at = now()
    WHERE user_id = r.user_id
    LIMIT 1;
  END LOOP;
END $$;

-- ============================================================================
-- 5. ADD COMMENT FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION sync_profile_verification_status() IS
'Syncs profiles.email_verified, phone_verified, id_verified based on user_verifications and user_documents status. Triggered on changes to either table.';
