-- Manual identity review via email (YES/NO) for low-confidence document verification
--
-- Goal:
-- - When automatic verification cannot reach high confidence, request a manual review.
-- - Send an email to a reviewer with signed URLs + one-click approve/reject links.
-- - Keep the flow secure (one-time token, hashed at rest) and non-regressive (idempotent DDL).
--
-- Notes:
-- - `user_identity_levels` currently allows authenticated users to UPDATE their own row (RLS).
--   We must prevent regular users from mutating `manual_review_*` fields.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Ensure pgcrypto available (gen_random_uuid)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Fix schema drift: add missing column used by admin review RPCs
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_identity_levels
  ADD COLUMN IF NOT EXISTS manual_review_notes text;

-- ---------------------------------------------------------------------------
-- 2) Manual review email requests (token hashed at rest)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manual_identity_review_email_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reviewer_email text NOT NULL,
  token_hash text NOT NULL,
  fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  decided_at timestamptz,
  decision_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manual_identity_review_email_requests_status_check'
  ) THEN
    ALTER TABLE public.manual_identity_review_email_requests
      ADD CONSTRAINT manual_identity_review_email_requests_status_check
      CHECK (status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'EXPIRED'::text, 'CANCELLED'::text]));
  END IF;

  IF to_regclass('auth.users') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'manual_identity_review_email_requests_user_id_fkey'
    ) THEN
      ALTER TABLE public.manual_identity_review_email_requests
        ADD CONSTRAINT manual_identity_review_email_requests_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS manual_identity_review_email_requests_token_hash_key
  ON public.manual_identity_review_email_requests (token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS manual_identity_review_email_requests_one_pending_per_user
  ON public.manual_identity_review_email_requests (user_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_manual_identity_review_email_requests_status
  ON public.manual_identity_review_email_requests (status);

CREATE INDEX IF NOT EXISTS idx_manual_identity_review_email_requests_expires_at
  ON public.manual_identity_review_email_requests (expires_at);

ALTER TABLE public.manual_identity_review_email_requests ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: only service_role (bypassrls) should read/write.

-- ---------------------------------------------------------------------------
-- 3) Harden: block regular users from editing manual-review fields in user_identity_levels
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_user_identity_levels_manual_review_edits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
  v_is_admin boolean;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);

  -- Allow internal/admin contexts and service role.
  IF v_role IS NULL OR v_role IN ('service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF v_role = 'authenticated' THEN
    SELECT p.is_admin
    INTO v_is_admin
    FROM public.profiles p
    WHERE p.id = auth.uid();

    IF v_is_admin = true THEN
      RETURN NEW;
    END IF;
  END IF;

  IF (NEW.manual_review_required IS DISTINCT FROM OLD.manual_review_required)
    OR (NEW.manual_reviewed_by IS DISTINCT FROM OLD.manual_reviewed_by)
    OR (NEW.manual_reviewed_at IS DISTINCT FROM OLD.manual_reviewed_at)
    OR (NEW.manual_review_decision IS DISTINCT FROM OLD.manual_review_decision)
    OR (NEW.manual_review_notes IS DISTINCT FROM OLD.manual_review_notes) THEN
    RAISE EXCEPTION 'Unauthorized: manual review fields are server-controlled';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_user_identity_levels_manual_review_edits ON public.user_identity_levels;

CREATE TRIGGER trg_block_user_identity_levels_manual_review_edits
  BEFORE UPDATE ON public.user_identity_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.block_user_identity_levels_manual_review_edits();

-- ---------------------------------------------------------------------------
-- 4) Atomic decision processor (used by public Edge Function)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_manual_identity_review_email(
  p_token_hash text,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_request record;
  v_now timestamptz := now();
  v_decision text;
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);

  -- Only backend contexts should call this RPC.
  -- If the claim is present and not service_role, reject.
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

  -- Record manual review result on identity levels (ensure row exists)
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
    -- Level 2 identity gate used by the marketplace.
    UPDATE public.profiles
    SET id_verified = true,
        updated_at = v_now
    WHERE id = v_request.user_id
      AND (id_verified IS DISTINCT FROM true);

    -- Set timestamps so level calculations can advance (no-op if already set).
    UPDATE public.user_identity_levels
    SET
      id_verified_at = COALESCE(id_verified_at, v_now),
      document_verified_at = COALESCE(document_verified_at, v_now),
      driver_license_verified_at = COALESCE(driver_license_verified_at, v_now),
      updated_at = v_now
    WHERE user_id = v_request.user_id;

    -- Mark the specific docs as verified.
    UPDATE public.user_documents
    SET status = 'verified',
        reviewed_at = v_now,
        notes = COALESCE(NULLIF(p_notes, ''), notes)
    WHERE user_id = v_request.user_id
      AND kind = ANY (ARRAY['gov_id_front'::text, 'gov_id_back'::text, 'driver_license'::text, 'license_front'::text, 'license_back'::text]);

    -- Mirror status in user_verifications (if present).
    UPDATE public.user_verifications
    SET status = 'VERIFICADO',
        missing_docs = '{}'::text[],
        verified_at = COALESCE(verified_at, v_now),
        notes = COALESCE(NULLIF(p_notes, ''), notes),
        updated_at = v_now
    WHERE user_id = v_request.user_id
      AND role = 'driver';
  ELSE
    -- Reject the docs (do not auto-unverify profile here).
    UPDATE public.user_documents
    SET status = 'rejected',
        reviewed_at = v_now,
        notes = COALESCE(NULLIF(p_notes, ''), notes)
    WHERE user_id = v_request.user_id
      AND kind = ANY (ARRAY['gov_id_front'::text, 'gov_id_back'::text, 'driver_license'::text, 'license_front'::text, 'license_back'::text])
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

REVOKE ALL ON FUNCTION public.process_manual_identity_review_email(text, text, text) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.process_manual_identity_review_email(text, text, text) TO service_role;
  END IF;
END $$;

COMMIT;

