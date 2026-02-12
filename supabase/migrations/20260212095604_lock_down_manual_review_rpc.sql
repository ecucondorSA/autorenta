-- Lock down manual review RPC (backend-only)
--
-- Supabase projects often have default privileges that grant EXECUTE on new functions
-- to `anon`/`authenticated`. This RPC must only be callable by backend contexts
-- (service_role via Edge Functions), even though the function itself also checks role.

BEGIN;

REVOKE ALL ON FUNCTION public.process_manual_identity_review_email(text, text, text) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.process_manual_identity_review_email(text, text, text) FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.process_manual_identity_review_email(text, text, text) FROM authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.process_manual_identity_review_email(text, text, text) TO service_role;
  END IF;
END $$;

COMMIT;

