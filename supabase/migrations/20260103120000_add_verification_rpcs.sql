-- Migration: Add verification RPCs for document upload flow
-- Date: 2026-01-03
-- Description: Creates missing RPC functions called by VerificationService.ts
--              - upsert_user_document (line 98)
--              - get_user_documents (line 190)

-- ============================================================================
-- RPC: upsert_user_document
-- Used by: VerificationService.uploadDocument()
-- Purpose: Creates or updates a document record when user uploads verification doc
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_user_document(
  p_user_id UUID,
  p_kind TEXT,
  p_storage_path TEXT,
  p_status TEXT DEFAULT 'pending'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- User can only upsert their own documents
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado: solo puedes subir tus propios documentos';
  END IF;

  -- Insert or update document record
  -- Uses UNIQUE constraint: user_documents_user_kind_unique (user_id, kind)
  INSERT INTO user_documents (user_id, kind, storage_path, status, created_at)
  VALUES (p_user_id, p_kind::document_kind, p_storage_path, p_status::kyc_status, NOW())
  ON CONFLICT (user_id, kind)
  DO UPDATE SET
    storage_path = EXCLUDED.storage_path,
    status = EXCLUDED.status,
    notes = NULL,  -- Clear previous notes on re-upload
    reviewed_by = NULL,
    reviewed_at = NULL,
    analyzed_at = NULL;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_user_document(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.upsert_user_document IS
  'Upserts a user document record. Called after uploading to storage. User can only modify their own documents.';

-- ============================================================================
-- RPC: get_user_documents
-- Used by: VerificationService.loadDocuments()
-- Purpose: Retrieves all documents uploaded by a user for verification display
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_documents(p_user_id UUID DEFAULT NULL)
RETURNS SETOF user_documents
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Use provided user_id or default to current user
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- User can only view their own documents (security check)
  IF auth.uid() != v_user_id THEN
    RAISE EXCEPTION 'No autorizado: solo puedes ver tus propios documentos';
  END IF;

  -- Return all documents for the user, ordered by creation date
  RETURN QUERY
  SELECT * FROM user_documents
  WHERE user_id = v_user_id
  ORDER BY created_at DESC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_documents(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_user_documents IS
  'Returns all verification documents for a user. User can only access their own documents.';
