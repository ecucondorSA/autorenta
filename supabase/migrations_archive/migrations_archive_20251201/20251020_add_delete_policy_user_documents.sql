-- Migration: Add DELETE policy for user_documents
-- Date: 2025-10-20
-- Purpose: Allow users to delete their own documents

-- Add DELETE policy for user_documents
CREATE POLICY "owner can delete own documents"
ON user_documents
FOR DELETE
USING (auth.uid() = user_id);

-- Add UPDATE policy for user_documents (might be needed in future)
CREATE POLICY "owner can update own documents"
ON user_documents
FOR UPDATE
USING (auth.uid() = user_id);

-- Verify policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'user_documents'
ORDER BY cmd, policyname;
