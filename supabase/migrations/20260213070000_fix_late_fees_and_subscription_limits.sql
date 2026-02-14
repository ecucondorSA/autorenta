-- ============================================================================
-- AUTORENTA - Late Fees & Subscription Limits
-- ============================================================================
-- Implementa lógica de negocio para multas por retraso y límites de riesgo
-- ============================================================================

-- 1. RPC: Calcular multas por entrega tardía
CREATE OR REPLACE FUNCTION public.calculate_late_fees(
  p_booking_id UUID,
  p_actual_return_time TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_hours_late NUMERIC;
  v_days_late INTEGER;
  v_price_per_day NUMERIC;
  v_penalty_fee NUMERIC := 0;
  v_extra_days_fee NUMERIC := 0;
  v_total_fee NUMERIC := 0;
  v_grace_period_hours INTEGER := 1; -- 1 hora de gracia
BEGIN
  -- Obtener datos de la reserva
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  v_price_per_day := v_booking.price_per_day;
  
  -- Calcular retraso en horas
  v_hours_late := EXTRACT(EPOCH FROM (p_actual_return_time - v_booking.end_at)) / 3600;
  
  -- Si está dentro del periodo de gracia, no hay multa
  IF v_hours_late <= v_grace_period_hours THEN
    RETURN jsonb_build_object(
      'success', true,
      'late_fee_cents', 0,
      'hours_late', v_hours_late,
      'is_late', false
    );
  END IF;

  -- Calcular días extra (redondeo hacia arriba)
  v_days_late := CEIL(v_hours_late / 24.0);
  
  -- Lógica de multa:
  -- 1. Cobrar los días extra a precio normal
  v_extra_days_fee := v_days_late * v_price_per_day;
  
  -- 2. Penalización del 50% extra sobre el valor del tiempo excedido
  v_penalty_fee := v_extra_days_fee * 0.50;
  
  v_total_fee := v_extra_days_fee + v_penalty_fee;

  RETURN jsonb_build_object(
    'success', true,
    'late_fee_cents', ROUND(v_total_fee * 100), -- Retornar en centavos
    'hours_late', ROUND(v_hours_late, 2),
    'days_late', v_days_late,
    'base_charge', v_extra_days_fee,
    'penalty_charge', v_penalty_fee,
    'currency', 'USD', -- Asumimos USD base por ahora
    'is_late', true
  );
END;
$$;

-- 2. RPC: Verificar límite de cobertura de suscripción
CREATE OR REPLACE FUNCTION public.check_subscription_risk_limit(
  p_user_id UUID,
  p_policy_limit_usd NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage_usd NUMERIC;
BEGIN
  -- Calcular uso actual de gap coverage (riesgo cubierto por la plataforma)
  -- Esto suma los siniestros pagados por el FGO para este usuario en el último año
  SELECT COALESCE(SUM(amount_approved), 0)
  INTO v_usage_usd
  FROM public.fgo_claims
  WHERE claimant_id = p_user_id
    AND status = 'paid'
    AND created_at > (NOW() - INTERVAL '1 year');

  RETURN jsonb_build_object(
    'success', true,
    'usage_usd', v_usage_usd,
    'limit_usd', p_policy_limit_usd,
    'remaining_usd', GREATEST(0, p_policy_limit_usd - v_usage_usd),
    'is_limit_exceeded', v_usage_usd >= p_policy_limit_usd
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_late_fees(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_subscription_risk_limit(UUID, NUMERIC) TO authenticated;
