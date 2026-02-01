-- ============================================================================
-- MIGRATION: Trust Engine Core (Risk & Background Checks)
-- Date: 2026-02-01
-- Purpose: Centralize risk assessment and background checks storage.
-- ============================================================================

BEGIN;

-- 1. BACKGROUND CHECKS TABLE
CREATE TABLE IF NOT EXISTS public.background_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'internal', 'checkr', 'nosis', 'stripe_identity'
  provider_reference_id TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'clear', 'consider', 'rejected'
  report_url TEXT, -- Link to PDF or external report
  
  -- Structured Results
  criminal_record_found BOOLEAN DEFAULT FALSE,
  debt_record_found BOOLEAN DEFAULT FALSE,
  driving_infractions_count INTEGER DEFAULT 0,
  
  raw_data JSONB DEFAULT '{}'::jsonb, -- Full provider response
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bg_checks_user ON public.background_checks(user_id);

-- 2. RISK ASSESSMENTS TABLE
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100), -- 0 = High Risk, 100 = Low Risk
  risk_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  
  factors JSONB DEFAULT '[]'::jsonb, -- ["new_account", "verified_id", "high_debt"]
  
  decision TEXT DEFAULT 'approve', -- 'approve', 'manual_review', 'reject'
  decision_by UUID REFERENCES public.profiles(id), -- Admin or System (NULL)
  decision_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_user ON public.risk_assessments(user_id);

-- 3. RLS POLICIES (Strict Privacy)
ALTER TABLE public.background_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- Only Admins can see background checks details (GDPR/Sensitive)
-- Users can only see their status, not the raw report if it contains sensitive 3rd party info?
-- Actually, users usually have right to see their own data.
CREATE POLICY "Users view own background checks"
  ON public.background_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all background checks"
  ON public.background_checks FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users view own risk assessments"
  ON public.risk_assessments FOR SELECT
  USING (auth.uid() = user_id);

-- 4. FUNCTION: Calculate Risk Score (The Brain)
CREATE OR REPLACE FUNCTION public.calculate_user_risk_score(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER := 50; -- Start neutral
  v_factors TEXT[] := '{}';
  v_verified BOOLEAN;
  v_bg_check RECORD;
  v_booking_stats RECORD;
BEGIN
  -- 1. Identity Verification (Base Score)
  SELECT (status = 'VERIFICADO') INTO v_verified
  FROM public.user_verifications
  WHERE user_id = p_user_id AND role = 'driver';
  
  IF v_verified THEN
    v_score := v_score + 30;
    v_factors := array_append(v_factors, 'verified_identity');
  ELSE
    v_score := v_score - 10;
    v_factors := array_append(v_factors, 'unverified_identity');
  END IF;

  -- 2. Background Checks
  SELECT * INTO v_bg_check 
  FROM public.background_checks 
  WHERE user_id = p_user_id 
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_bg_check IS NOT NULL THEN
    IF v_bg_check.status = 'clear' THEN
      v_score := v_score + 20;
      v_factors := array_append(v_factors, 'clean_background');
    ELSIF v_bg_check.status = 'rejected' THEN
      v_score := 0; -- Critical fail
      v_factors := array_append(v_factors, 'failed_background');
    ELSIF v_bg_check.driving_infractions_count > 0 THEN
      v_score := v_score - (v_bg_check.driving_infractions_count * 5);
      v_factors := array_append(v_factors, 'driving_infractions');
    END IF;
  END IF;

  -- 3. Platform History (Bookings)
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'dispute') as disputed
  INTO v_booking_stats
  FROM public.bookings
  WHERE renter_id = p_user_id;
  
  IF v_booking_stats.completed > 0 THEN
    v_score := v_score + (LEAST(v_booking_stats.completed, 10) * 2); -- Max +20 pts
    v_factors := array_append(v_factors, 'good_history');
  END IF;
  
  IF v_booking_stats.disputed > 0 THEN
    v_score := v_score - (v_booking_stats.disputed * 20);
    v_factors := array_append(v_factors, 'previous_disputes');
  END IF;

  -- Cap Score
  IF v_score > 100 THEN v_score := 100; END IF;
  IF v_score < 0 THEN v_score := 0; END IF;

  -- Determine Level & Decision
  DECLARE
    v_level TEXT;
    v_decision TEXT;
  BEGIN
    IF v_score >= 80 THEN 
      v_level := 'low'; v_decision := 'approve';
    ELSIF v_score >= 50 THEN 
      v_level := 'medium'; v_decision := 'approve';
    ELSIF v_score >= 30 THEN 
      v_level := 'high'; v_decision := 'manual_review';
    ELSE 
      v_level := 'critical'; v_decision := 'reject';
    END IF;

    -- Record Assessment
    INSERT INTO public.risk_assessments (user_id, score, risk_level, factors, decision)
    VALUES (p_user_id, v_score, v_level, to_jsonb(v_factors), v_decision);
    
    RETURN jsonb_build_object(
      'score', v_score,
      'level', v_level,
      'decision', v_decision
    );
  END;
END;
$$;

-- 5. TRIGGER: Auto-Calculate Risk on Verification Change
CREATE OR REPLACE FUNCTION public.trigger_risk_recalc()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.calculate_user_risk_score(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_risk_on_verification
  AFTER UPDATE OF status ON public.user_verifications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trigger_risk_recalc();

COMMIT;
