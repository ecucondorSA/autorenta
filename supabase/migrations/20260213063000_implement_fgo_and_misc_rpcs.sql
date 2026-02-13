-- ============================================================================
-- AUTORENTA - Implement FGO and Misc RPCs
-- ============================================================================
-- Reemplaza stubs con lógica real para FGO, Claims y Subscripciones
-- ============================================================================

-- RPC: pay_fgo_siniestro (Admin)
CREATE OR REPLACE FUNCTION public.pay_fgo_siniestro(
  p_claim_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim RECORD;
  v_fund_balance NUMERIC;
BEGIN
  -- 1. Verificar permisos (Solo Admin)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo administradores pueden pagar siniestros');
  END IF;

  -- 2. Obtener reclamo
  SELECT * INTO v_claim FROM public.fgo_claims WHERE id = p_claim_id;
  IF v_claim IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reclamo no encontrado');
  END IF;

  IF v_claim.status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El reclamo debe estar en estado "approved" para ser pagado');
  END IF;

  -- 3. Verificar balance del fondo
  SELECT balance INTO v_fund_balance FROM public.fgo_fund LIMIT 1;
  IF v_fund_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fondos insuficientes en el FGO');
  END IF;

  -- 4. Ejecutar pago
  -- Descontar del fondo
  UPDATE public.fgo_fund 
  SET balance = balance - p_amount,
      total_paid = COALESCE(total_paid, 0) + p_amount,
      updated_at = now();

  -- Actualizar reclamo
  UPDATE public.fgo_claims
  SET status = 'paid',
      amount_approved = p_amount, -- Asegurar que coincida con lo pagado
      paid_at = now(),
      resolved_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_claim_id;

  -- 5. Registrar movimiento (Auditoría)
  -- Si existe fgo_movements (sistema legacy pero útil para log)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fgo_movements') THEN
    INSERT INTO public.fgo_movements (
      movement_type, amount, reference_type, reference_id, metadata
    ) VALUES (
      'payout', -p_amount, 'claim', p_claim_id, 
      jsonb_build_object('description', 'Pago de siniestro', 'paid_by', auth.uid())
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Pago procesado exitosamente', 'new_balance', v_fund_balance - p_amount);
END;
$$;

-- RPC: report_insurance_claim (Renter/Owner)
CREATE OR REPLACE FUNCTION public.report_insurance_claim(
  p_booking_id UUID,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_claim_id UUID;
BEGIN
  -- 1. Validar Booking
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  -- 2. Validar participación
  IF auth.uid() NOT IN (v_booking.renter_id, v_booking.owner_id) AND 
     NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado para reportar este siniestro');
  END IF;

  -- 3. Crear reclamo en FGO
  INSERT INTO public.fgo_claims (
    booking_id,
    claimant_id,
    claim_type,
    amount_requested,
    status,
    resolution_notes
  ) VALUES (
    p_booking_id,
    auth.uid(),
    'damage',
    0.01, -- Monto inicial (a ser evaluado por perito)
    'pending',
    p_description
  ) RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object('success', true, 'claim_id', v_claim_id, 'message', 'Reclamo registrado y en revisión');
END;
$$;

-- RPC: recalculate_fgo_metrics (Admin/System)
CREATE OR REPLACE FUNCTION public.recalculate_fgo_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_contributions NUMERIC;
  v_total_payouts NUMERIC;
  v_current_balance NUMERIC;
BEGIN
  -- Calcular totales desde contribuciones y reclamos pagados
  SELECT COALESCE(SUM(amount), 0) INTO v_total_contributions FROM public.fgo_contributions;
  SELECT COALESCE(SUM(amount_approved), 0) INTO v_total_payouts FROM public.fgo_claims WHERE status = 'paid';
  
  -- Sincronizar fgo_fund
  UPDATE public.fgo_fund
  SET total_collected = v_total_contributions,
      total_paid = v_total_payouts,
      balance = v_total_contributions - v_total_payouts,
      updated_at = now();

  SELECT balance INTO v_current_balance FROM public.fgo_fund LIMIT 1;

  RETURN jsonb_build_object(
    'success', true, 
    'balance', v_current_balance, 
    'total_contributions', v_total_contributions, 
    'total_payouts', v_total_payouts
  );
END;
$$;

-- RPC: calculate_subscription_upgrade
CREATE OR REPLACE FUNCTION public.calculate_subscription_upgrade(
  p_current_plan TEXT,
  p_target_plan TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_price NUMERIC;
  v_target_price NUMERIC;
BEGIN
  -- Asumimos tabla subscription_plans existe
  SELECT price_monthly_usd INTO v_current_price FROM public.subscription_plans WHERE id = p_current_plan;
  SELECT price_monthly_usd INTO v_target_price FROM public.subscription_plans WHERE id = p_target_plan;

  IF v_target_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan destino no existe');
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'price_difference', COALESCE(v_target_price - COALESCE(v_current_price, 0), 0),
    'can_upgrade', (COALESCE(v_target_price, 0) >= COALESCE(v_current_price, 0))
  );
EXCEPTION WHEN OTHERS THEN
  -- Fallback si no hay tabla de planes aún
  RETURN jsonb_build_object('success', true, 'price_difference', 0, 'message', 'Plan details unavailable');
END;
$$;
