-- Add TikTok OAuth support to profiles table
-- Adds provider and provider_id columns to track OAuth authentication source

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email' CHECK (provider IN ('email', 'google', 'github', 'tiktok')),
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD CONSTRAINT unique_provider_id UNIQUE(provider, provider_id) WHERE provider != 'email';

-- Create index for faster lookups by provider
CREATE INDEX IF NOT EXISTS idx_profiles_provider_id ON profiles(provider, provider_id)
WHERE provider != 'email';

-- Add comments
COMMENT ON COLUMN profiles.provider IS 'OAuth provider: email, google, github, tiktok';
COMMENT ON COLUMN profiles.provider_id IS 'Unique identifier from OAuth provider (google_id, github_id, tiktok_open_id, etc)';
