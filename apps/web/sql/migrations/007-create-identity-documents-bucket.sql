-- Migration: Create identity-documents Storage Bucket
-- Purpose: Secure storage bucket for Level 2-3 identity verification documents
-- Created: 2025-11-05
--
-- IMPORTANT: This migration creates the bucket configuration in the database.
-- The actual bucket must be created via Supabase Dashboard or CLI:
--
-- Via CLI:
--   supabase storage create identity-documents --public false
--
-- Via Dashboard:
--   Storage → New Bucket → Name: "identity-documents", Public: No

-- =====================================================
-- STORAGE BUCKET: identity-documents
-- =====================================================

-- Insert bucket configuration (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-documents',
  'identity-documents',
  false, -- Private bucket (not publicly accessible)
  10485760, -- 10MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS POLICIES: identity-documents bucket
-- =====================================================

-- Policy 1: Users can upload to their own folder
CREATE POLICY "Users can upload own identity documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can update their own files
CREATE POLICY "Users can update own identity documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can delete their own files
CREATE POLICY "Users can delete own identity documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can view their own files (download)
CREATE POLICY "Users can view own identity documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 5: Service role has full access (for edge functions)
CREATE POLICY "Service role full access to identity documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'identity-documents')
WITH CHECK (bucket_id = 'identity-documents');

-- Policy 6: Admins can view all documents (for manual review)
CREATE POLICY "Admins can view all identity documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Users can upload own identity documents" ON storage.objects IS
'Allows authenticated users to upload identity documents (DNI, licenses, selfies) to their own folder';

COMMENT ON POLICY "Users can update own identity documents" ON storage.objects IS
'Allows users to update/replace their identity documents';

COMMENT ON POLICY "Users can delete own identity documents" ON storage.objects IS
'Allows users to delete their identity documents (for retry/correction)';

COMMENT ON POLICY "Users can view own identity documents" ON storage.objects IS
'Allows users to download/view their own identity documents';

COMMENT ON POLICY "Service role full access to identity documents" ON storage.objects IS
'Allows edge functions (service role) to access all documents for AI verification';

COMMENT ON POLICY "Admins can view all identity documents" ON storage.objects IS
'Allows admin users to view documents for manual review/verification';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify bucket was created
DO $$
DECLARE
  v_bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'identity-documents'
  ) INTO v_bucket_exists;

  IF v_bucket_exists THEN
    RAISE NOTICE 'SUCCESS: identity-documents bucket configuration created';
  ELSE
    RAISE EXCEPTION 'ERROR: identity-documents bucket not created';
  END IF;
END $$;

-- Verify RLS policies were created
DO $$
DECLARE
  v_policy_count INT;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%identity documents%';

  IF v_policy_count >= 6 THEN
    RAISE NOTICE 'SUCCESS: All % identity-documents RLS policies created', v_policy_count;
  ELSE
    RAISE WARNING 'Only % of 6 expected policies created', v_policy_count;
  END IF;
END $$;

-- =====================================================
-- USAGE NOTES
-- =====================================================

/*
STORAGE PATH CONVENTION:
  - Format: {user_id}/{filename}
  - Example: "550e8400-e29b-41d4-a716-446655440000/selfie_video_1699999999.mp4"

FILE TYPES ALLOWED:
  - Images: JPEG, PNG, WEBP (for DNI, licenses)
  - Videos: MP4, WebM, QuickTime (for selfies)
  - Documents: PDF (for scanned documents)

SIZE LIMITS:
  - Max 10MB per file

SECURITY:
  - Bucket is private (not publicly accessible)
  - Users can only access their own folder
  - Service role (edge functions) has full access for AI processing
  - Admins can view all documents for manual review

ACCESSING FILES FROM ANGULAR:

  // Upload
  const filePath = `${userId}/${filename}`;
  await supabase.storage
    .from('identity-documents')
    .upload(filePath, file);

  // Get signed URL (private bucket)
  const { data } = await supabase.storage
    .from('identity-documents')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  // Delete
  await supabase.storage
    .from('identity-documents')
    .remove([filePath]);
*/
