-- ============================================================================
-- USER VERIFICATIONS SUPPORT
-- Creates the user_verifications table to persist AI-driven document status
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_verifications (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('driver', 'owner')),
  status TEXT NOT NULL CHECK (status IN ('VERIFICADO', 'PENDIENTE', 'RECHAZADO')) DEFAULT 'PENDIENTE',
  missing_docs JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_status
  ON public.user_verifications(status);

ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their verification status"
  ON public.user_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage verification status"
  ON public.user_verifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update verification status"
  ON public.user_verifications FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete verification status"
  ON public.user_verifications FOR DELETE
  USING (auth.role() = 'service_role');

CREATE TRIGGER set_user_verifications_updated_at
  BEFORE UPDATE ON public.user_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
