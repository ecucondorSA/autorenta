-- Fix: process_manual_identity_review_email used ::text casts on document_kind enum column
-- PostgreSQL error: "operator does not exist: document_kind = text"
-- Changed ARRAY['...'::text] to ARRAY['...'::document_kind] in both APPROVED and REJECTED branches

CREATE OR REPLACE FUNCTION public.process_manual_identity_review_email(
  p_token_hash text,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_now timestamptz := now();
  v_decision text;
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);

  IF v_role IS NOT NULL AND v_role <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO v_request
  FROM public.manual_identity_review_email_requests
  WHERE token_hash = p_token_hash
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  IF v_request.status <> 'PENDING' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'status', v_request.status,
      'user_id', v_request.user_id
    );
  END IF;

  IF v_request.expires_at < v_now THEN
    UPDATE public.manual_identity_review_email_requests
    SET status = 'EXPIRED',
        decided_at = v_now
    WHERE id = v_request.id;

    RETURN jsonb_build_object('success', false, 'error', 'EXPIRED');
  END IF;

  v_decision := upper(trim(coalesce(p_decision, '')));

  IF v_decision = 'SI' OR v_decision = 'YES' OR v_decision = 'APPROVE' OR v_decision = 'APPROVED' THEN
    v_decision := 'APPROVED';
  ELSIF v_decision = 'NO' OR v_decision = 'REJECT' OR v_decision = 'REJECTED' THEN
    v_decision := 'REJECTED';
  END IF;

  IF v_decision NOT IN ('APPROVED', 'REJECTED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_DECISION');
  END IF;

  UPDATE public.manual_identity_review_email_requests
  SET status = v_decision,
      decided_at = v_now,
      decision_notes = p_notes
  WHERE id = v_request.id;

  INSERT INTO public.user_identity_levels (
    user_id,
    manual_review_required,
    manual_reviewed_at,
    manual_review_decision,
    manual_review_notes,
    updated_at
  )
  VALUES (
    v_request.user_id,
    false,
    v_now,
    v_decision,
    p_notes,
    v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    manual_review_required = false,
    manual_reviewed_at = v_now,
    manual_review_decision = v_decision,
    manual_review_notes = p_notes,
    updated_at = v_now;

  IF v_decision = 'APPROVED' THEN
    UPDATE public.profiles
    SET id_verified = true,
        updated_at = v_now
    WHERE id = v_request.user_id
      AND (id_verified IS DISTINCT FROM true);

    UPDATE public.user_identity_levels
    SET
      id_verified_at = COALESCE(id_verified_at, v_now),
      document_verified_at = COALESCE(document_verified_at, v_now),
      driver_license_verified_at = COALESCE(driver_license_verified_at, v_now),
      updated_at = v_now
    WHERE user_id = v_request.user_id;

    UPDATE public.user_documents
    SET status = 'verified',
        reviewed_at = v_now,
        notes = COALESCE(NULLIF(p_notes, ''), notes)
    WHERE user_id = v_request.user_id
      AND kind = ANY (ARRAY['gov_id_front'::document_kind, 'gov_id_back'::document_kind, 'driver_license'::document_kind, 'license_front'::document_kind, 'license_back'::document_kind]);

    UPDATE public.user_verifications
    SET status = 'VERIFICADO',
        missing_docs = '{}'::text[],
        verified_at = COALESCE(verified_at, v_now),
        notes = COALESCE(NULLIF(p_notes, ''), notes),
        updated_at = v_now
    WHERE user_id = v_request.user_id
      AND role = 'driver';
  ELSE
    UPDATE public.user_documents
    SET status = 'rejected',
        reviewed_at = v_now,
        notes = COALESCE(NULLIF(p_notes, ''), notes)
    WHERE user_id = v_request.user_id
      AND kind = ANY (ARRAY['gov_id_front'::document_kind, 'gov_id_back'::document_kind, 'driver_license'::document_kind, 'license_front'::document_kind, 'license_back'::document_kind])
      AND status IS DISTINCT FROM 'verified';

    UPDATE public.user_verifications
    SET status = 'RECHAZADO',
        missing_docs = '{}'::text[],
        notes = COALESCE(NULLIF(p_notes, ''), notes),
        updated_at = v_now
    WHERE user_id = v_request.user_id
      AND role = 'driver';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_decision,
    'user_id', v_request.user_id
  );
END;
$$;
