-- Fix RLS Policy for Notifications Table
-- Problem: Users cannot insert notifications, blocking car creation

-- Add INSERT policy for notifications
-- This allows authenticated users to insert their own notifications
CREATE POLICY "Users can insert their own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Alternative: Allow system functions to insert notifications
-- (In case notifications are created by triggers or functions)
CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
TO authenticated  
WITH CHECK (true);

-- Verify policies
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    CASE 
        WHEN cmd = 'INSERT' THEN 'INSERT'
        WHEN cmd = 'SELECT' THEN 'SELECT'  
        WHEN cmd = 'UPDATE' THEN 'UPDATE'
        WHEN cmd = 'DELETE' THEN 'DELETE'
        ELSE cmd
    END as permission
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;