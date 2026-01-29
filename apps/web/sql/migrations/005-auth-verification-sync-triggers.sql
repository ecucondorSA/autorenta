-- Migration: Auth Verification Sync Triggers
-- Purpose: Automatically sync email/phone verification status from auth.users to user_identity_levels
-- Created: 2025-11-05

-- =====================================================
-- FUNCTION: Sync Email Verification Status
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID from the trigger
  v_user_id := COALESCE(NEW.id, OLD.id);

  -- Only proceed if email_confirmed_at changed from NULL to timestamp
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN

    -- Update user_identity_levels
    UPDATE public.user_identity_levels
    SET
      email_verified_at = NEW.email_confirmed_at,
      updated_at = NOW()
    WHERE user_id = v_user_id;

    -- If no row exists, insert one
    IF NOT FOUND THEN
      INSERT INTO public.user_identity_levels (
        user_id,
        email_verified_at,
        current_level,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        NEW.email_confirmed_at,
        1, -- Email verified = Level 1
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        email_verified_at = EXCLUDED.email_verified_at,
        updated_at = NOW();
    END IF;

    RAISE LOG 'Email verified for user: %', v_user_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_email_verification() IS
'Automatically updates user_identity_levels when email is confirmed in auth.users';


-- =====================================================
-- FUNCTION: Sync Phone Verification Status
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_phone_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID from the trigger
  v_user_id := COALESCE(NEW.id, OLD.id);

  -- Only proceed if phone_confirmed_at changed from NULL to timestamp
  IF (OLD.phone_confirmed_at IS NULL AND NEW.phone_confirmed_at IS NOT NULL) THEN

    -- Update user_identity_levels
    UPDATE public.user_identity_levels
    SET
      phone_verified_at = NEW.phone_confirmed_at,
      phone_number = NEW.phone,
      updated_at = NOW()
    WHERE user_id = v_user_id;

    -- If no row exists, insert one
    IF NOT FOUND THEN
      INSERT INTO public.user_identity_levels (
        user_id,
        phone_verified_at,
        phone_number,
        current_level,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        NEW.phone_confirmed_at,
        NEW.phone,
        1, -- Phone verified = Level 1
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        phone_verified_at = EXCLUDED.phone_verified_at,
        phone_number = EXCLUDED.phone_number,
        updated_at = NOW();
    END IF;

    -- Also update profiles table if exists
    UPDATE public.profiles
    SET
      phone = NEW.phone,
      is_phone_verified = TRUE,
      updated_at = NOW()
    WHERE id = v_user_id;

    RAISE LOG 'Phone verified for user: %', v_user_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_phone_verification() IS
'Automatically updates user_identity_levels and profiles when phone is confirmed in auth.users';


-- =====================================================
-- FUNCTION: Auto-upgrade verification level
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_upgrade_verification_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_level INT;
BEGIN
  -- Calculate appropriate level based on completed verifications
  v_new_level := 1; -- Start at Level 1

  -- Level 1: Email OR Phone verified
  IF (NEW.email_verified_at IS NOT NULL OR NEW.phone_verified_at IS NOT NULL) THEN
    v_new_level := 1;
  END IF;

  -- Level 2: Documents verified (DNI + Driver License/Vehicle Docs)
  IF (NEW.document_front_url IS NOT NULL
      AND NEW.document_ai_score >= 70
      AND (NEW.driver_license_verified_at IS NOT NULL
           OR NEW.document_back_url IS NOT NULL)) THEN
    v_new_level := 2;
  END IF;

  -- Level 3: Selfie verified with good face match score
  IF (v_new_level >= 2
      AND NEW.selfie_verified_at IS NOT NULL
      AND NEW.face_match_score >= 70) THEN
    v_new_level := 3;
  END IF;

  -- Update current_level if higher than existing
  IF v_new_level > NEW.current_level THEN
    NEW.current_level := v_new_level;
    NEW.updated_at := NOW();

    RAISE LOG 'User % upgraded to Level %', NEW.user_id, v_new_level;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_upgrade_verification_level() IS
'Automatically upgrades user verification level when requirements are met';


-- =====================================================
-- TRIGGERS: Apply sync functions
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_phone_verified ON auth.users;
DROP TRIGGER IF EXISTS on_identity_level_change ON public.user_identity_levels;

-- Trigger for email verification
CREATE TRIGGER on_auth_user_email_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.sync_email_verification();

COMMENT ON TRIGGER on_auth_user_email_verified ON auth.users IS
'Syncs email verification status to user_identity_levels table';


-- Trigger for phone verification
CREATE TRIGGER on_auth_user_phone_verified
  AFTER UPDATE OF phone_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.phone_confirmed_at IS DISTINCT FROM NEW.phone_confirmed_at)
  EXECUTE FUNCTION public.sync_phone_verification();

COMMENT ON TRIGGER on_auth_user_phone_verified ON auth.users IS
'Syncs phone verification status to user_identity_levels and profiles tables';


-- Trigger for auto-level upgrade
CREATE TRIGGER on_identity_level_change
  BEFORE INSERT OR UPDATE ON public.user_identity_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_upgrade_verification_level();

COMMENT ON TRIGGER on_identity_level_change ON public.user_identity_levels IS
'Automatically upgrades verification level when requirements are met';


-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.sync_email_verification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_phone_verification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_upgrade_verification_level() TO authenticated;

-- Service role needs full access for edge functions
GRANT EXECUTE ON FUNCTION public.sync_email_verification() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_phone_verification() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_upgrade_verification_level() TO service_role;


-- =====================================================
-- INITIAL DATA SYNC (Backfill existing verified users)
-- =====================================================

-- Sync existing email verifications
DO $$
DECLARE
  v_count INT := 0;
BEGIN
  -- Update existing verified emails
  UPDATE public.user_identity_levels uil
  SET
    email_verified_at = au.email_confirmed_at,
    updated_at = NOW()
  FROM auth.users au
  WHERE
    uil.user_id = au.id
    AND au.email_confirmed_at IS NOT NULL
    AND uil.email_verified_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % email verifications', v_count;
END $$;

-- Sync existing phone verifications
DO $$
DECLARE
  v_count INT := 0;
BEGIN
  -- Update existing verified phones
  UPDATE public.user_identity_levels uil
  SET
    phone_verified_at = au.phone_confirmed_at,
    phone_number = au.phone,
    updated_at = NOW()
  FROM auth.users au
  WHERE
    uil.user_id = au.id
    AND au.phone_confirmed_at IS NOT NULL
    AND uil.phone_verified_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % phone verifications', v_count;

  -- Also sync to profiles
  UPDATE public.profiles p
  SET
    phone = au.phone,
    is_phone_verified = TRUE,
    updated_at = NOW()
  FROM auth.users au
  WHERE
    p.id = au.id
    AND au.phone_confirmed_at IS NOT NULL
    AND (p.is_phone_verified IS NULL OR p.is_phone_verified = FALSE);
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify triggers were created
DO $$
DECLARE
  v_trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name IN (
    'on_auth_user_email_verified',
    'on_auth_user_phone_verified',
    'on_identity_level_change'
  );

  IF v_trigger_count = 3 THEN
    RAISE NOTICE 'SUCCESS: All 3 triggers created successfully';
  ELSE
    RAISE EXCEPTION 'ERROR: Only % of 3 triggers created', v_trigger_count;
  END IF;
END $$;
