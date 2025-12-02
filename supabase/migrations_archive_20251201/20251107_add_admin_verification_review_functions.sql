-- ============================================================================
-- ADMIN VERIFICATION REVIEW SYSTEM
-- RPC functions for admins to approve/reject user identity verifications
-- Related to Issue #125 - Build Verification Review Queue
-- ============================================================================

BEGIN;

-- ============================================================================
-- RPC FUNCTION: admin_get_pending_verifications
-- Returns all verifications requiring manual review with user details
-- SECURITY: Only admins can execute
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_pending_verifications(
  p_verification_type TEXT DEFAULT NULL,  -- 'level_2', 'level_3', or NULL for all
  p_status TEXT DEFAULT 'PENDING',        -- 'PENDING', 'APPROVED', 'REJECTED', or NULL for all
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  current_level INT,

  -- Level 2 verification data
  document_type TEXT,
  document_number TEXT,
  document_front_url TEXT,
  document_back_url TEXT,
  document_verified_at TIMESTAMPTZ,
  document_ai_score NUMERIC,

  -- Level 3 verification data
  selfie_url TEXT,
  selfie_verified_at TIMESTAMPTZ,
  face_match_score NUMERIC,
  liveness_score NUMERIC,

  -- Manual review data
  manual_review_required BOOLEAN,
  manual_review_decision TEXT,
  manual_review_notes TEXT,
  manual_reviewed_by UUID,
  manual_reviewed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  -- Extracted data
  extracted_full_name TEXT,
  extracted_birth_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access verification queue';
  END IF;

  -- Return verifications based on filters
  RETURN QUERY
  SELECT
    uil.user_id,
    p.full_name,
    au.email,
    uil.current_level,

    -- Level 2 data
    uil.document_type,
    uil.document_number,
    uil.document_front_url,
    uil.document_back_url,
    uil.document_verified_at,
    uil.document_ai_score,

    -- Level 3 data
    uil.selfie_url,
    uil.selfie_verified_at,
    uil.face_match_score,
    uil.liveness_score,

    -- Manual review data
    uil.manual_review_required,
    uil.manual_review_decision,
    uil.manual_review_notes,
    uil.manual_reviewed_by,
    uil.manual_reviewed_at,

    -- Metadata
    uil.created_at,
    uil.updated_at,

    -- Extracted data
    uil.extracted_full_name,
    uil.extracted_birth_date
  FROM public.user_identity_levels uil
  INNER JOIN public.profiles p ON p.id = uil.user_id
  LEFT JOIN auth.users au ON au.id = uil.user_id
  WHERE
    -- Filter by verification type
    (p_verification_type IS NULL OR
     (p_verification_type = 'level_2' AND uil.document_front_url IS NOT NULL) OR
     (p_verification_type = 'level_3' AND uil.selfie_url IS NOT NULL))
    AND
    -- Filter by manual review status
    (p_status IS NULL OR
     (p_status = 'PENDING' AND uil.manual_review_required = true AND uil.manual_review_decision IS NULL) OR
     (p_status = 'APPROVED' AND uil.manual_review_decision = 'APPROVED') OR
     (p_status = 'REJECTED' AND uil.manual_review_decision = 'REJECTED'))
  ORDER BY
    -- Pending reviews first, then by submission date
    CASE WHEN uil.manual_review_required = true AND uil.manual_review_decision IS NULL THEN 0 ELSE 1 END,
    uil.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_get_pending_verifications IS 'Admin-only: Returns verification queue with filters for type and status';

GRANT EXECUTE ON FUNCTION public.admin_get_pending_verifications TO authenticated;

-- ============================================================================
-- RPC FUNCTION: admin_get_verification_stats
-- Returns verification statistics for admin dashboard
-- SECURITY: Only admins can execute
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_verification_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access verification stats';
  END IF;

  -- Build statistics
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM public.user_identity_levels),
    'pending_reviews', (SELECT COUNT(*) FROM public.user_identity_levels
                        WHERE manual_review_required = true AND manual_review_decision IS NULL),
    'approved_today', (SELECT COUNT(*) FROM public.user_identity_levels
                       WHERE manual_review_decision = 'APPROVED' AND manual_reviewed_at::date = CURRENT_DATE),
    'rejected_today', (SELECT COUNT(*) FROM public.user_identity_levels
                       WHERE manual_review_decision = 'REJECTED' AND manual_reviewed_at::date = CURRENT_DATE),
    'level_1_users', (SELECT COUNT(*) FROM public.user_identity_levels WHERE current_level = 1),
    'level_2_users', (SELECT COUNT(*) FROM public.user_identity_levels WHERE current_level = 2),
    'level_3_users', (SELECT COUNT(*) FROM public.user_identity_levels WHERE current_level = 3),
    'pending_level_2', (SELECT COUNT(*) FROM public.user_identity_levels
                        WHERE document_front_url IS NOT NULL AND document_verified_at IS NULL),
    'pending_level_3', (SELECT COUNT(*) FROM public.user_identity_levels
                        WHERE selfie_url IS NOT NULL AND selfie_verified_at IS NULL)
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

COMMENT ON FUNCTION public.admin_get_verification_stats IS 'Admin-only: Returns verification statistics for dashboard';

GRANT EXECUTE ON FUNCTION public.admin_get_verification_stats TO authenticated;

-- ============================================================================
-- RPC FUNCTION: admin_approve_verification
-- Approves a user's verification and upgrades their level
-- SECURITY: Only admins can execute
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_approve_verification(
  p_user_id UUID,
  p_verification_level INT,  -- 2 or 3
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_current_level INT;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Check if user is admin
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE id = auth.uid() AND is_admin = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve verifications';
  END IF;

  -- Validate verification level
  IF p_verification_level NOT IN (2, 3) THEN
    RAISE EXCEPTION 'Invalid verification level. Must be 2 or 3';
  END IF;

  -- Get current user data
  SELECT
    uil.current_level,
    au.email,
    p.full_name
  INTO
    v_current_level,
    v_user_email,
    v_user_name
  FROM public.user_identity_levels uil
  INNER JOIN public.profiles p ON p.id = uil.user_id
  LEFT JOIN auth.users au ON au.id = uil.user_id
  WHERE uil.user_id = p_user_id;

  IF v_current_level IS NULL THEN
    RAISE EXCEPTION 'User verification record not found';
  END IF;

  -- Update verification based on level
  IF p_verification_level = 2 THEN
    -- Approve Level 2 (document verification)
    UPDATE public.user_identity_levels
    SET
      current_level = GREATEST(current_level, 2),
      document_verified_at = COALESCE(document_verified_at, now()),
      manual_review_required = false,
      manual_review_decision = 'APPROVED',
      manual_reviewed_by = v_admin_id,
      manual_reviewed_at = now(),
      manual_review_notes = p_notes,
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_verification_level = 3 THEN
    -- Approve Level 3 (selfie + face match verification)
    UPDATE public.user_identity_levels
    SET
      current_level = 3,
      selfie_verified_at = COALESCE(selfie_verified_at, now()),
      manual_review_required = false,
      manual_review_decision = 'APPROVED',
      manual_reviewed_by = v_admin_id,
      manual_reviewed_at = now(),
      manual_review_notes = p_notes,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Return success response with user email for notification
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'user_email', v_user_email,
    'user_name', v_user_name,
    'approved_level', p_verification_level,
    'previous_level', v_current_level,
    'reviewed_by', v_admin_id,
    'reviewed_at', now(),
    'notes', p_notes
  );
END;
$$;

COMMENT ON FUNCTION public.admin_approve_verification IS 'Admin-only: Approves user verification and upgrades identity level';

GRANT EXECUTE ON FUNCTION public.admin_approve_verification TO authenticated;

-- ============================================================================
-- RPC FUNCTION: admin_reject_verification
-- Rejects a user's verification with reason
-- SECURITY: Only admins can execute
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_reject_verification(
  p_user_id UUID,
  p_verification_level INT,  -- 2 or 3
  p_reason TEXT              -- Required rejection reason
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_current_level INT;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Check if user is admin
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE id = auth.uid() AND is_admin = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject verifications';
  END IF;

  -- Validate verification level
  IF p_verification_level NOT IN (2, 3) THEN
    RAISE EXCEPTION 'Invalid verification level. Must be 2 or 3';
  END IF;

  -- Require rejection reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Get current user data
  SELECT
    uil.current_level,
    au.email,
    p.full_name
  INTO
    v_current_level,
    v_user_email,
    v_user_name
  FROM public.user_identity_levels uil
  INNER JOIN public.profiles p ON p.id = uil.user_id
  LEFT JOIN auth.users au ON au.id = uil.user_id
  WHERE uil.user_id = p_user_id;

  IF v_current_level IS NULL THEN
    RAISE EXCEPTION 'User verification record not found';
  END IF;

  -- Update verification with rejection
  IF p_verification_level = 2 THEN
    -- Reject Level 2 (document verification)
    UPDATE public.user_identity_levels
    SET
      document_verified_at = NULL,  -- Clear verification timestamp
      manual_review_required = true,
      manual_review_decision = 'REJECTED',
      manual_reviewed_by = v_admin_id,
      manual_reviewed_at = now(),
      manual_review_notes = p_reason,
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_verification_level = 3 THEN
    -- Reject Level 3 (selfie verification)
    UPDATE public.user_identity_levels
    SET
      selfie_verified_at = NULL,  -- Clear verification timestamp
      manual_review_required = true,
      manual_review_decision = 'REJECTED',
      manual_reviewed_by = v_admin_id,
      manual_reviewed_at = now(),
      manual_review_notes = p_reason,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Return response with user email for notification
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'user_email', v_user_email,
    'user_name', v_user_name,
    'rejected_level', p_verification_level,
    'current_level', v_current_level,
    'reviewed_by', v_admin_id,
    'reviewed_at', now(),
    'reason', p_reason
  );
END;
$$;

COMMENT ON FUNCTION public.admin_reject_verification IS 'Admin-only: Rejects user verification with required reason';

GRANT EXECUTE ON FUNCTION public.admin_reject_verification TO authenticated;

-- ============================================================================
-- RPC FUNCTION: admin_flag_verification_suspicious
-- Flags a verification as suspicious for further investigation
-- SECURITY: Only admins can execute
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_flag_verification_suspicious(
  p_user_id UUID,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Check if user is admin
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE id = auth.uid() AND is_admin = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can flag verifications';
  END IF;

  -- Update verification with suspicious flag
  UPDATE public.user_identity_levels
  SET
    manual_review_required = true,
    manual_review_decision = 'PENDING',
    manual_reviewed_by = v_admin_id,
    manual_reviewed_at = now(),
    manual_review_notes = '[SUSPICIOUS] ' || COALESCE(p_notes, 'Flagged for investigation'),
    updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User verification record not found';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'flagged_by', v_admin_id,
    'flagged_at', now(),
    'notes', p_notes
  );
END;
$$;

COMMENT ON FUNCTION public.admin_flag_verification_suspicious IS 'Admin-only: Flags verification as suspicious';

GRANT EXECUTE ON FUNCTION public.admin_flag_verification_suspicious TO authenticated;

-- ============================================================================
-- RPC FUNCTION: admin_request_additional_documents
-- Requests additional documents from user
-- SECURITY: Only admins can execute
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_request_additional_documents(
  p_user_id UUID,
  p_requested_docs TEXT  -- Description of what documents are needed
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Check if user is admin
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE id = auth.uid() AND is_admin = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can request additional documents';
  END IF;

  IF p_requested_docs IS NULL OR trim(p_requested_docs) = '' THEN
    RAISE EXCEPTION 'Document request description is required';
  END IF;

  -- Get user data
  SELECT
    au.email,
    p.full_name
  INTO
    v_user_email,
    v_user_name
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE p.id = p_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update verification with pending status and request notes
  UPDATE public.user_identity_levels
  SET
    manual_review_required = true,
    manual_review_decision = 'PENDING',
    manual_reviewed_by = v_admin_id,
    manual_reviewed_at = now(),
    manual_review_notes = '[ADDITIONAL DOCS REQUIRED] ' || p_requested_docs,
    updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User verification record not found';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'user_email', v_user_email,
    'user_name', v_user_name,
    'requested_by', v_admin_id,
    'requested_at', now(),
    'requested_docs', p_requested_docs
  );
END;
$$;

COMMENT ON FUNCTION public.admin_request_additional_documents IS 'Admin-only: Requests additional documents from user';

GRANT EXECUTE ON FUNCTION public.admin_request_additional_documents TO authenticated;

COMMIT;
