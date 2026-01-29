-- Migration: Sync email verification between auth.users and profiles
-- Date: 2025-12-02
-- Description: Creates trigger to keep profiles.email_verified in sync with auth.users.email_confirmed_at

-- Function to sync email verification status
CREATE OR REPLACE FUNCTION sync_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- When email is confirmed in auth.users, update profiles
  IF NEW.email_confirmed_at IS NOT NULL AND
     (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN

    -- Update profiles table
    UPDATE public.profiles
    SET email_verified = TRUE,
        updated_at = NOW()
    WHERE id = NEW.id;

    -- Update user_identity_levels table
    UPDATE public.user_identity_levels
    SET email_verified_at = NEW.email_confirmed_at,
        updated_at = NOW()
    WHERE user_id = NEW.id
      AND email_verified_at IS NULL;

    -- Insert into user_identity_levels if not exists
    INSERT INTO public.user_identity_levels (user_id, current_level, email_verified_at, created_at, updated_at)
    VALUES (NEW.id, 1, NEW.email_confirmed_at, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (if not exists)
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_email_verification();

-- Also handle phone verification sync
CREATE OR REPLACE FUNCTION sync_phone_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- When phone is confirmed in auth.users, update profiles
  IF NEW.phone_confirmed_at IS NOT NULL AND
     (OLD.phone_confirmed_at IS NULL OR OLD.phone_confirmed_at != NEW.phone_confirmed_at) THEN

    -- Update profiles table
    UPDATE public.profiles
    SET phone_verified = TRUE,
        phone = NEW.phone,
        updated_at = NOW()
    WHERE id = NEW.id;

    -- Update user_identity_levels table
    UPDATE public.user_identity_levels
    SET phone_verified_at = NEW.phone_confirmed_at,
        updated_at = NOW()
    WHERE user_id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for phone
DROP TRIGGER IF EXISTS on_phone_confirmed ON auth.users;
CREATE TRIGGER on_phone_confirmed
  AFTER UPDATE OF phone_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_phone_verification();

-- Comment
COMMENT ON FUNCTION sync_email_verification() IS 'Syncs email verification from auth.users to profiles and user_identity_levels';
COMMENT ON FUNCTION sync_phone_verification() IS 'Syncs phone verification from auth.users to profiles and user_identity_levels';
