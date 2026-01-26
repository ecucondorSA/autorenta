-- Migration: Create push_tokens table
-- Date: 2025-10-26

-- This table stores the push notification tokens for each user's devices.
CREATE TABLE public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficiently querying tokens for a user.
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own push tokens.
CREATE POLICY "Users can manage their own push tokens"
ON public.push_tokens FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.push_tokens IS 'Stores device tokens for sending push notifications.';
