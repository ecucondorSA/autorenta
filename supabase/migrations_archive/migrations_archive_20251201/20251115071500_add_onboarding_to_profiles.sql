-- Add onboarding column to profiles table
-- This tracks the user's onboarding progress through the application

-- Check if column already exists (idempotent migration)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'onboarding'
  ) THEN
    -- Add the onboarding column with default 'incomplete'
    ALTER TABLE profiles 
    ADD COLUMN onboarding onboarding_status DEFAULT 'incomplete' NOT NULL;
    
    -- Create index for faster queries on onboarding status
    CREATE INDEX idx_profiles_onboarding ON profiles(onboarding);
    
    -- Add comment
    COMMENT ON COLUMN profiles.onboarding IS 
    'Tracks whether user has completed the initial onboarding flow';
  END IF;
END $$;

-- Update existing users to 'complete' if they have accepted TOS (legacy users)
UPDATE profiles 
SET onboarding = 'complete' 
WHERE tos_accepted_at IS NOT NULL 
  AND onboarding = 'incomplete';
