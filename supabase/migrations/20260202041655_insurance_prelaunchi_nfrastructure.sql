-- ============================================================================
-- INSURANCE PRE-LAUNCH INFRASTRUCTURE
-- ============================================================================
-- Métricas para negociar con aseguradoras y simular quotes
-- 
-- Phase 1.5: Loss Ratio Dashboard + Quote Simulator
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. RPC: get_insurance_metrics (Loss Ratio Dashboard)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_insurance_metrics(
  p_from_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '12 months'),
  p_to_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_booking_stats RECORD;
  v_claim_stats RECORD;
  v_fgo_stats RECORD;
BEGIN
  -- Booking statistics
  SELECT 
    COUNT(*) as total_bookings,
    COUNT(DISTINCT car_id) as unique_cars,
    COUNT(DISTINCT renter_id) as unique_renters,
    SUM(total_price) as total_gmv,
    AVG(total_price) as avg_booking_value,
    SUM(EXTRACT(DAY FROM (end_date - start_date))) as total_rental_days
  INTO v_booking_stats
  FROM public.bookings
  WHERE status = 'completed'
    AND completed_at BETWEEN p_from_date AND p_to_date;
  
  -- Claim statistics from FGO
  SELECT 
    COUNT(*) as total_claims,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_claims,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_claims,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_claims,
    COALESCE(SUM(amount_requested), 0) as total_requested,
    COALESCE(SUM(amount_approved), 0) as total_approved,
    COALESCE(AVG(amount_approved) FILTER (WHERE status = 'paid'), 0) as avg_claim_severity,
    COUNT(*) FILTER (WHERE claim_type = 'damage') as damage_claims,
    COUNT(*) FILTER (WHERE claim_type = 'theft') as theft_claims,
    COUNT(*) FILTER (WHERE claim_type = 'non_payment') as non_payment_claims
  INTO v_claim_stats
  FROM public.fgo_claims
  WHERE created_at BETWEEN p_from_date AND p_to_date;
  
  -- FGO Fund status
  SELECT 
    balance,
    total_collected,
    total_claims_paid
  INTO v_fgo_stats
  FROM public.fgo_fund
  LIMIT 1;
  
  -- Build result
  v_result := jsonb_build_object(
    'period', jsonb_build_object(
      'from', p_from_date,
      'to', p_to_date,
      'months', EXTRACT(MONTH FROM AGE(p_to_date, p_from_date))
    ),
    'bookings', jsonb_build_object(
      'total', COALESCE(v_booking_stats.total_bookings, 0),
      'unique_cars', COALESCE(v_booking_stats.unique_cars, 0),
      'unique_renters', COALESCE(v_booking_stats.unique_renters, 0),
      'total_gmv', COALESCE(v_booking_stats.total_gmv, 0),
      'avg_booking_value', COALESCE(v_booking_stats.avg_booking_value, 0),
      'total_rental_days', COALESCE(v_booking_stats.total_rental_days, 0)
    ),
    'claims', jsonb_build_object(
      'total', COALESCE(v_claim_stats.total_claims, 0),
      'approved', COALESCE(v_claim_stats.approved_claims, 0),
      'rejected', COALESCE(v_claim_stats.rejected_claims, 0),
      'paid', COALESCE(v_claim_stats.paid_claims, 0),
      'total_requested', COALESCE(v_claim_stats.total_requested, 0),
      'total_approved', COALESCE(v_claim_stats.total_approved, 0),
      'avg_severity', COALESCE(v_claim_stats.avg_claim_severity, 0),
      'by_type', jsonb_build_object(
        'damage', COALESCE(v_claim_stats.damage_claims, 0),
        'theft', COALESCE(v_claim_stats.theft_claims, 0),
        'non_payment', COALESCE(v_claim_stats.non_payment_claims, 0)
      )
    ),
    'fgo_fund', jsonb_build_object(
      'current_balance', COALESCE(v_fgo_stats.balance, 0),
      'total_collected', COALESCE(v_fgo_stats.total_collected, 0),
      'total_claims_paid', COALESCE(v_fgo_stats.total_claims_paid, 0)
    ),
    'ratios', jsonb_build_object(
      'loss_ratio', CASE 
        WHEN COALESCE(v_booking_stats.total_gmv, 0) > 0 
        THEN ROUND((COALESCE(v_claim_stats.total_approved, 0) / v_booking_stats.total_gmv) * 100, 2)
        ELSE 0 
      END,
      'claims_frequency', CASE 
        WHEN COALESCE(v_booking_stats.total_bookings, 0) > 0 
        THEN ROUND((COALESCE(v_claim_stats.total_claims, 0)::DECIMAL / v_booking_stats.total_bookings) * 100, 2)
        ELSE 0 
      END,
      'approval_rate', CASE 
        WHEN COALESCE(v_claim_stats.total_claims, 0) > 0 
        THEN ROUND((COALESCE(v_claim_stats.approved_claims, 0)::DECIMAL / v_claim_stats.total_claims) * 100, 2)
        ELSE 0 
      END
    )
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_insurance_metrics IS 
  'Genera métricas de siniestralidad para presentar a aseguradoras';

-- ============================================================================
-- 2. RPC: simulate_insurance_quote
-- ============================================================================

CREATE OR REPLACE FUNCTION public.simulate_insurance_quote(
  p_vehicle_value_usd DECIMAL,
  p_rental_days INTEGER DEFAULT 7,
  p_renter_reputation_score DECIMAL DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_base_daily_rate DECIMAL;
  v_risk_multiplier DECIMAL;
  v_daily_premium DECIMAL;
  v_total_premium DECIMAL;
  v_coverage_limit DECIMAL;
  v_deductible DECIMAL;
BEGIN
  -- Base rate: 0.3% of vehicle value per day (industry benchmark for P2P)
  v_base_daily_rate := p_vehicle_value_usd * 0.003;
  
  -- Risk multiplier based on reputation (50 = neutral, <50 = riskier, >50 = safer)
  v_risk_multiplier := CASE
    WHEN p_renter_reputation_score >= 80 THEN 0.7   -- 30% discount
    WHEN p_renter_reputation_score >= 60 THEN 0.85  -- 15% discount
    WHEN p_renter_reputation_score >= 40 THEN 1.0   -- No adjustment
    WHEN p_renter_reputation_score >= 20 THEN 1.25  -- 25% surcharge
    ELSE 1.5  -- 50% surcharge for very low scores
  END;
  
  -- Calculate premiums
  v_daily_premium := ROUND(v_base_daily_rate * v_risk_multiplier, 2);
  v_total_premium := v_daily_premium * p_rental_days;
  
  -- Coverage limits (tiered by vehicle value)
  v_coverage_limit := CASE
    WHEN p_vehicle_value_usd >= 50000 THEN 30000
    WHEN p_vehicle_value_usd >= 30000 THEN 20000
    WHEN p_vehicle_value_usd >= 15000 THEN 10000
    ELSE 5000
  END;
  
  -- Deductible (10% of coverage limit, minimum $200)
  v_deductible := GREATEST(v_coverage_limit * 0.10, 200);
  
  RETURN jsonb_build_object(
    'quote_type', 'simulated',
    'vehicle_value_usd', p_vehicle_value_usd,
    'rental_days', p_rental_days,
    'renter_reputation', p_renter_reputation_score,
    'pricing', jsonb_build_object(
      'base_daily_rate', v_base_daily_rate,
      'risk_multiplier', v_risk_multiplier,
      'daily_premium', v_daily_premium,
      'total_premium', v_total_premium
    ),
    'coverage', jsonb_build_object(
      'limit_usd', v_coverage_limit,
      'deductible_usd', v_deductible,
      'covers', ARRAY['collision', 'theft', 'third_party_liability'],
      'excludes', ARRAY['wear_and_tear', 'mechanical_failure', 'personal_belongings']
    ),
    'disclaimer', 'This is a simulated quote for planning purposes. Actual insurance premiums will be determined by partnered insurers.',
    'generated_at', NOW()
  );
END;
$$;

COMMENT ON FUNCTION public.simulate_insurance_quote IS 
  'Simula quote de seguro basado en valor del vehículo y reputation del renter';

-- ============================================================================
-- 3. VIEW: v_insurance_ready_metrics (Snapshot para aseguradoras)
-- ============================================================================

DROP VIEW IF EXISTS public.v_insurance_ready_metrics;

CREATE OR REPLACE VIEW public.v_insurance_ready_metrics AS
WITH booking_stats AS (
  SELECT 
    COUNT(*) as total_bookings,
    COUNT(DISTINCT car_id) as fleet_size,
    AVG(total_price) as avg_booking_value,
    SUM(total_price) as total_gmv
  FROM public.bookings
  WHERE status = 'completed'
    AND completed_at > NOW() - INTERVAL '12 months'
),
claim_stats AS (
  SELECT 
    COUNT(*) as total_claims,
    COALESCE(SUM(amount_approved), 0) as total_paid,
    COALESCE(AVG(amount_approved), 0) as avg_severity
  FROM public.fgo_claims
  WHERE status IN ('approved', 'paid')
    AND created_at > NOW() - INTERVAL '12 months'
)
SELECT
  bs.total_bookings,
  bs.fleet_size,
  bs.avg_booking_value,
  bs.total_gmv,
  cs.total_claims,
  cs.total_paid as total_claims_paid,
  cs.avg_severity as avg_claim_severity,
  CASE WHEN bs.total_gmv > 0 
    THEN ROUND((cs.total_paid / bs.total_gmv) * 100, 2) 
    ELSE 0 
  END as loss_ratio_percent,
  CASE WHEN bs.total_bookings > 0 
    THEN ROUND((cs.total_claims::DECIMAL / bs.total_bookings) * 100, 2) 
    ELSE 0 
  END as claim_frequency_percent,
  NOW() as snapshot_at
FROM booking_stats bs, claim_stats cs;

COMMENT ON VIEW public.v_insurance_ready_metrics IS 
  'Métricas listas para presentar a aseguradoras';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_insurance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.simulate_insurance_quote TO authenticated;
GRANT SELECT ON public.v_insurance_ready_metrics TO authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Insurance Pre-Launch Infrastructure completada';
  RAISE NOTICE '   RPCs: get_insurance_metrics, simulate_insurance_quote';
  RAISE NOTICE '   View: v_insurance_ready_metrics';
END $$;

COMMIT;
