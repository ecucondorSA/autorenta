-- ============================================================================
-- MERCADO PAGO ONBOARDING STATES
-- ============================================================================
-- Required for OAuth flow with MercadoPago Marketplace
-- Edge Function: mercadopago-initiate-onboarding needs this table
-- ============================================================================

-- Create table for OAuth state tracking
CREATE TABLE IF NOT EXISTS public.mp_onboarding_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth flow fields (used by Edge Function)
  state_token TEXT,                    -- Random token for OAuth CSRF protection
  expires_at TIMESTAMPTZ,              -- When the state token expires

  -- MercadoPago credentials (filled after successful OAuth)
  collector_id BIGINT,                 -- MP seller ID (required for split payments)
  public_key TEXT,                     -- MP public key
  access_token TEXT,                   -- MP API access token
  refresh_token TEXT,                  -- Token to refresh access_token
  token_expires_at TIMESTAMPTZ,        -- When access_token expires

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'expired')),

  -- Legacy fields for compatibility
  auth_code TEXT,
  redirect_url TEXT,

  -- Audit
  completed_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_user_id ON public.mp_onboarding_states(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_status ON public.mp_onboarding_states(status);
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_state_token ON public.mp_onboarding_states(state_token);

-- Enable RLS
ALTER TABLE public.mp_onboarding_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "mp_onboarding_select_own" ON public.mp_onboarding_states
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "mp_onboarding_insert_own" ON public.mp_onboarding_states
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mp_onboarding_update_own" ON public.mp_onboarding_states
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role policy for Edge Functions
CREATE POLICY "mp_onboarding_service_all" ON public.mp_onboarding_states
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_mp_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mp_onboarding_updated_at ON public.mp_onboarding_states;
CREATE TRIGGER trigger_mp_onboarding_updated_at
  BEFORE UPDATE ON public.mp_onboarding_states
  FOR EACH ROW
  EXECUTE FUNCTION update_mp_onboarding_updated_at();

-- Comments
COMMENT ON TABLE public.mp_onboarding_states IS 'MercadoPago OAuth onboarding state tracking';
COMMENT ON COLUMN public.mp_onboarding_states.state_token IS 'CSRF token for OAuth flow validation';
COMMENT ON COLUMN public.mp_onboarding_states.collector_id IS 'MP seller ID required for split payments';
