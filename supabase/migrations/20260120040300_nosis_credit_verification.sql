-- Migration: Nosis/Veraz Credit Verification System
-- Description: Adds credit report storage and verification for Argentina users
-- Date: 2026-01-20

-- ============================================================================
-- CREDIT REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Document info
  document_type TEXT NOT NULL CHECK (document_type IN ('DNI', 'CUIT', 'CUIL')),
  document_number TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'AR',

  -- Nosis response data
  provider TEXT NOT NULL DEFAULT 'nosis',
  raw_response JSONB,

  -- Extracted key metrics
  credit_score INTEGER, -- 1-999 (Nosis score)
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  bcra_status TEXT, -- BCRA classification (1-5)

  -- Financial flags
  has_bounced_checks BOOLEAN DEFAULT FALSE,
  bounced_checks_count INTEGER DEFAULT 0,
  has_lawsuits BOOLEAN DEFAULT FALSE,
  lawsuits_count INTEGER DEFAULT 0,
  has_bankruptcy BOOLEAN DEFAULT FALSE,
  has_tax_debt BOOLEAN DEFAULT FALSE,
  has_social_security_debt BOOLEAN DEFAULT FALSE,

  -- Estimated financials
  estimated_monthly_income DECIMAL(12,2),
  estimated_annual_revenue DECIMAL(12,2), -- For businesses (CUIT)
  total_debt_amount DECIMAL(12,2),
  monthly_commitment DECIMAL(12,2),

  -- Employment info (for individuals)
  employer_name TEXT,
  employment_status TEXT,

  -- Verification status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Reports expire after 30 days

  -- Error handling
  error_code TEXT,
  error_message TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_active_report UNIQUE (user_id, document_number, provider)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_credit_reports_user_id ON public.credit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_document ON public.credit_reports(document_number);
CREATE INDEX IF NOT EXISTS idx_credit_reports_status ON public.credit_reports(status);
CREATE INDEX IF NOT EXISTS idx_credit_reports_expires ON public.credit_reports(expires_at) WHERE status = 'completed';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.credit_reports ENABLE ROW LEVEL SECURITY;

-- Users can only view their own credit reports
CREATE POLICY "Users can view own credit reports"
  ON public.credit_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (via Edge Function)
CREATE POLICY "Service role can manage credit reports"
  ON public.credit_reports FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate risk level from Nosis score
CREATE OR REPLACE FUNCTION public.calculate_credit_risk_level(score INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF score IS NULL THEN
    RETURN 'high'; -- Unknown = high risk
  ELSIF score >= 700 THEN
    RETURN 'low';
  ELSIF score >= 500 THEN
    RETURN 'medium';
  ELSIF score >= 300 THEN
    RETURN 'high';
  ELSE
    RETURN 'critical';
  END IF;
END;
$$;

-- Function to get user's latest valid credit report
CREATE OR REPLACE FUNCTION public.get_user_credit_report(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  credit_score INTEGER,
  risk_level TEXT,
  bcra_status TEXT,
  has_bounced_checks BOOLEAN,
  has_lawsuits BOOLEAN,
  has_bankruptcy BOOLEAN,
  estimated_monthly_income DECIMAL,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.credit_score,
    cr.risk_level,
    cr.bcra_status,
    cr.has_bounced_checks,
    cr.has_lawsuits,
    cr.has_bankruptcy,
    cr.estimated_monthly_income,
    cr.verified_at,
    cr.expires_at,
    (cr.status = 'completed' AND cr.expires_at > NOW()) AS is_valid
  FROM public.credit_reports cr
  WHERE cr.user_id = p_user_id
    AND cr.status = 'completed'
  ORDER BY cr.verified_at DESC
  LIMIT 1;
END;
$$;

-- Function to check if user can rent based on credit
CREATE OR REPLACE FUNCTION public.check_credit_eligibility(
  p_user_id UUID,
  p_rental_daily_price DECIMAL DEFAULT 0
)
RETURNS TABLE (
  eligible BOOLEAN,
  reason TEXT,
  credit_score INTEGER,
  risk_level TEXT,
  requires_higher_deposit BOOLEAN,
  suggested_deposit_multiplier DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report RECORD;
  v_eligible BOOLEAN := TRUE;
  v_reason TEXT := 'OK';
  v_requires_higher_deposit BOOLEAN := FALSE;
  v_deposit_multiplier DECIMAL := 1.0;
BEGIN
  -- Get latest valid credit report
  SELECT * INTO v_report
  FROM public.credit_reports
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND expires_at > NOW()
  ORDER BY verified_at DESC
  LIMIT 1;

  -- No credit report = require verification first
  IF v_report IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'Verificacion crediticia requerida'::TEXT,
      NULL::INTEGER,
      NULL::TEXT,
      FALSE,
      1.0::DECIMAL;
    RETURN;
  END IF;

  -- Check for critical flags
  IF v_report.has_bankruptcy THEN
    v_eligible := FALSE;
    v_reason := 'Historial de quiebra detectado';
  ELSIF v_report.risk_level = 'critical' THEN
    v_eligible := FALSE;
    v_reason := 'Riesgo crediticio muy alto';
  ELSIF v_report.has_lawsuits AND v_report.lawsuits_count > 3 THEN
    v_eligible := FALSE;
    v_reason := 'Multiples juicios activos';
  ELSIF v_report.risk_level = 'high' THEN
    -- Allow but with higher deposit
    v_requires_higher_deposit := TRUE;
    v_deposit_multiplier := 2.0;
    v_reason := 'Riesgo alto - deposito adicional requerido';
  ELSIF v_report.risk_level = 'medium' THEN
    v_requires_higher_deposit := TRUE;
    v_deposit_multiplier := 1.5;
    v_reason := 'OK - deposito estandar aumentado';
  END IF;

  RETURN QUERY SELECT
    v_eligible,
    v_reason,
    v_report.credit_score,
    v_report.risk_level,
    v_requires_higher_deposit,
    v_deposit_multiplier;
END;
$$;

-- ============================================================================
-- UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_credit_report_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_credit_report_timestamp
  BEFORE UPDATE ON public.credit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_credit_report_timestamp();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON public.credit_reports TO authenticated;
GRANT ALL ON public.credit_reports TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_credit_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_credit_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_credit_risk_level TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.credit_reports IS 'Stores credit verification reports from Nosis/Veraz for Argentina users';
COMMENT ON COLUMN public.credit_reports.credit_score IS 'Nosis credit score (1-999), higher is better';
COMMENT ON COLUMN public.credit_reports.bcra_status IS 'BCRA classification: 1=Normal, 2=Risk, 3=Problems, 4=High Risk, 5=Uncollectable';
COMMENT ON FUNCTION public.check_credit_eligibility IS 'Checks if user can rent based on their credit report, returns eligibility and deposit requirements';
