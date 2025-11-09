-- Migration: Add email column to profiles and sync from auth.users
-- Issue: PR #150 - Fix TypeScript compilation errors
-- Problem: Frontend needs email but Supabase doesn't allow nested queries to auth.users
-- Solution: Add email to profiles table and sync from auth.users

-- ============================================================================
-- STEP 1: Add email column to profiles
-- ============================================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;

-- ============================================================================
-- STEP 2: Sync existing emails from auth.users
-- ============================================================================

-- Sync emails from auth.users to profiles
-- Note: This requires SECURITY DEFINER to access auth.users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users in auth.users and sync to profiles
  FOR user_record IN 
    SELECT id, email 
    FROM auth.users 
    WHERE email IS NOT NULL
  LOOP
    -- Update profile if it exists, otherwise it will be created by trigger
    UPDATE public.profiles 
    SET email = user_record.email 
    WHERE id = user_record.id AND (email IS NULL OR email != user_record.email);
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Create trigger function to sync email on auth.users updates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile email when auth.users email changes
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 4: Create trigger on auth.users
-- ============================================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS sync_email_on_auth_update ON auth.users;

-- Create trigger to sync email when auth.users.email is updated
CREATE TRIGGER sync_email_on_auth_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_profile_email_from_auth();

-- ============================================================================
-- STEP 5: Create trigger to sync email on new user creation
-- ============================================================================

-- Function to sync email when new user is created
CREATE OR REPLACE FUNCTION public.sync_profile_email_on_user_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile email when new user is created
  -- This handles the case where profile exists before user creation
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id AND (email IS NULL OR email != NEW.email);
  
  RETURN NEW;
END;
$$;

-- Create trigger on user creation
DROP TRIGGER IF EXISTS sync_email_on_user_create ON auth.users;

CREATE TRIGGER sync_email_on_user_create
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email_on_user_create();

-- ============================================================================
-- STEP 6: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN public.profiles.email IS 'User email synced from auth.users. Automatically maintained by triggers.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify emails were synced
-- SELECT COUNT(*) as total_profiles, 
--        COUNT(email) as profiles_with_email,
--        COUNT(*) - COUNT(email) as profiles_without_email
-- FROM public.profiles;

-- Check for any mismatches (should return 0 rows)
-- SELECT p.id, p.email as profile_email, u.email as auth_email
-- FROM public.profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE p.email IS DISTINCT FROM u.email;

