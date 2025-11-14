-- Fix RLS Policy for Notifications Table
-- Date: 2025-11-14
-- Problem: Car creation fails because notifications INSERT is blocked by RLS

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Add INSERT policy for notifications
-- This allows authenticated users to insert their own notifications
CREATE POLICY "Users can insert their own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Comment for documentation
COMMENT ON POLICY "Users can insert their own notifications" ON public.notifications IS 
'Allows authenticated users to create notifications for themselves. Required for car creation flow.';

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'notifications' AND cmd = 'INSERT';