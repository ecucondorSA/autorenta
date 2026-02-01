-- ============================================================================
-- MIGRATION: Push Tokens Hardening
-- Date: 2026-02-01
-- Purpose: Ensure push_tokens table exists and has correct RLS policies.
-- ============================================================================

BEGIN;

-- 1. CREATE TABLE IF NOT EXISTS (Idempotent)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'fcm', 'apns')),
  device_info JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE INDEXES IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_is_active ON public.push_tokens(is_active);

-- 3. ENABLE RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES (Drop first to avoid duplicates)
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.push_tokens;
CREATE POLICY "Users can manage their own tokens"
  ON public.push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access push_tokens" ON public.push_tokens;
CREATE POLICY "Service role full access push_tokens"
  ON public.push_tokens FOR ALL TO service_role USING (true);

-- 5. HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.get_active_tokens_for_user(p_user_id UUID)
RETURNS TABLE (token TEXT, platform TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.token, t.platform
  FROM public.push_tokens t
  WHERE t.user_id = p_user_id AND t.is_active = TRUE;
END;
$$;

COMMIT;
