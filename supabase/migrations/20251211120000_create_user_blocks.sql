-- Create table for user blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Policies for user_blocks
-- Users can see who they have blocked
CREATE POLICY "Users can view their own blocks" 
    ON public.user_blocks FOR SELECT 
    USING (auth.uid() = blocker_id);

-- Users can create blocks for themselves
CREATE POLICY "Users can block others" 
    ON public.user_blocks FOR INSERT 
    WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock (delete) their own blocks
CREATE POLICY "Users can unblock others" 
    ON public.user_blocks FOR DELETE 
    USING (auth.uid() = blocker_id);

-- Add index for performance check on message send
CREATE INDEX IF NOT EXISTS idx_user_blocks_lookup ON public.user_blocks(blocker_id, blocked_id);

-- Function to check if a user is blocked (useful for RLS reuse)
CREATE OR REPLACE FUNCTION public.is_blocked_by(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_blocks 
    WHERE blocker_id = target_user_id 
    AND blocked_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update messages policy to prevent blocked users from sending messages
-- We create a new specific policy for this restriction to be additive and clear.
-- "Users can send messages IF NOT BLOCKED"

-- Drop existing policy if it conflicts or is too permissive regarding blocks (usually existing policies just check auth.uid() = sender_id)
-- We will Add a restrictive policy using WITH CHECK.
-- Note: RLS policies are permissive (OR), so if an existing policy allows insert, adding another won't restrict it unless we modify the existing one 
-- OR use a TRIGGER to enforce the block.
-- A trigger is safer here because RLS policies are additive (if ANY policy allows it, it passes). 
-- To RESTRICT via RLS, all insert policies must include the check, which is messy if we don't know all policies.
-- A BEFORE INSERT TRIGGER is the most robust way to enforce a "DENY" rule like blocking.

CREATE OR REPLACE FUNCTION public.check_message_block()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM public.user_blocks 
    WHERE blocker_id = NEW.recipient_id 
    AND blocked_id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'Cannot send message: You have been blocked by this user.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_message_block
    BEFORE INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.check_message_block();