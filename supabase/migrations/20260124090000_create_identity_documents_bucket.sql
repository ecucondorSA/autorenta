-- Migration: Create identity-documents storage bucket (private)
-- Purpose: Store identity verification docs (DNI, licenses, selfies)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-documents',
  'identity-documents',
  false,
  10485760,
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

-- Users can upload to their own folder
DROP POLICY IF EXISTS "Users can upload own identity documents" ON storage.objects;
CREATE POLICY "Users can upload own identity documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own files
DROP POLICY IF EXISTS "Users can update own identity documents" ON storage.objects;
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

-- Users can delete their own files
DROP POLICY IF EXISTS "Users can delete own identity documents" ON storage.objects;
CREATE POLICY "Users can delete own identity documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own files
DROP POLICY IF EXISTS "Users can view own identity documents" ON storage.objects;
CREATE POLICY "Users can view own identity documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Service role full access (edge functions)
DROP POLICY IF EXISTS "Service role full access to identity documents" ON storage.objects;
CREATE POLICY "Service role full access to identity documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'identity-documents')
WITH CHECK (bucket_id = 'identity-documents');

-- Admins can view all documents for manual review
DROP POLICY IF EXISTS "Admins can view all identity documents" ON storage.objects;
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
