-- ============================================================================
-- AUTORENTAR - FGO v1.1 FIXES
-- ============================================================================
-- Corrección de nombres de columnas (locador_id → cars.owner_id, locatario_id → renter_id)
-- ============================================================================

-- 1. RECREAR VISTA: v_bookings_with_risk_snapshot
-- ============================================================================

DROP VIEW IF EXISTS v_bookings_with_risk_snapshot;

CREATE OR REPLACE VIEW v_bookings_with_risk_snapshot AS
SELECT
  b.id AS booking_id,
  b.car_id,
  c.owner_id AS locador_id,      -- 🔧 FIX: Obtener owner_id desde cars
  b.renter_id AS locatario_id,   -- 🔧 FIX: renter_id es el locatario
  b.status AS booking_status,
  b.start_at AS start_date,
  b.end_at AS end_date,
  b.total_cents AS total_price_cents,

  -- Risk snapshot
  brs.country_code,
  brs.bucket,
  brs.currency,
  brs.fx_snapshot,
  brs.franchise_usd,
  brs.estimated_hold_amount,
  brs.estimated_deposit,
  brs.has_card,
  brs.has_wallet_security,

  -- Inspections
  (SELECT COUNT(*) FROM booking_inspections WHERE booking_id = b.id) AS inspection_count,
  (SELECT signed_at FROM booking_inspections WHERE booking_id = b.id AND stage = 'check_in' LIMIT 1) AS check_in_signed_at,
  (SELECT signed_at FROM booking_inspections WHERE booking_id = b.id AND stage = 'check_out' LIMIT 1) AS check_out_signed_at,

  b.created_at,
  b.updated_at
FROM bookings b
LEFT JOIN cars c ON b.car_id = c.id
LEFT JOIN booking_risk_snapshot brs ON b.id = brs.booking_id
ORDER BY b.created_at DESC;

COMMENT ON VIEW v_bookings_with_risk_snapshot IS 'Bookings con snapshots de riesgo e inspecciones (v1.1) - FIXED';

-- 2. RECREAR RLS POLICY: booking_risk_snapshot (SELECT)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own booking risk snapshots" ON booking_risk_snapshot;

CREATE POLICY "Users can view own booking risk snapshots"
  ON booking_risk_snapshot FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = booking_risk_snapshot.booking_id
      AND (c.owner_id = auth.uid() OR b.renter_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- 3. RECREAR RLS POLICY: booking_inspections (SELECT)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own booking inspections" ON booking_inspections;

CREATE POLICY "Users can view own booking inspections"
  ON booking_inspections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = booking_inspections.booking_id
      AND (c.owner_id = auth.uid() OR b.renter_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- 4. RECREAR RLS POLICY: booking_inspections (INSERT)
-- ============================================================================

DROP POLICY IF EXISTS "Locador/Locatario can insert inspections" ON booking_inspections;

CREATE POLICY "Owner/Renter can insert inspections"
  ON booking_inspections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = booking_inspections.booking_id
      AND (c.owner_id = auth.uid() OR b.renter_id = auth.uid())
    )
  );

-- 5. RECREAR FUNCIÓN: fgo_assess_eligibility (FIX user query)
-- ============================================================================

CREATE OR REPLACE FUNCTION fgo_assess_eligibility(
  p_booking_id UUID,
  p_claim_amount_cents BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot RECORD;
  v_params RECORD;
  v_rc_data JSONB;
  v_rc NUMERIC(10,4);
  v_monthly_payout BIGINT;
  v_monthly_cap BIGINT;
  v_user_events INTEGER;
  v_event_cap_usd NUMERIC(10,2);
  v_eligible BOOLEAN := TRUE;
  v_reasons TEXT[] := '{}';
  v_max_cover_cents BIGINT;
  v_franchise_pct NUMERIC(5,2) := 0.00;
  v_fgo_balance BIGINT;
BEGIN
  -- Validar claim amount
  IF p_claim_amount_cents <= 0 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reasons', ARRAY['Claim amount must be positive']
    );
  END IF;

  -- Obtener snapshot
  SELECT * INTO v_snapshot
  FROM booking_risk_snapshot
  WHERE booking_id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reasons', ARRAY['No risk snapshot found for booking']
    );
  END IF;

  -- Obtener parámetros
  SELECT * INTO v_params
  FROM fgo_parameters
  WHERE country_code = v_snapshot.country_code AND bucket = v_snapshot.bucket;

  IF NOT FOUND THEN
    -- Fallback a default
    SELECT * INTO v_params
    FROM fgo_parameters
    WHERE country_code = v_snapshot.country_code AND bucket = 'default';

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'eligible', false,
        'reasons', ARRAY['No parameters configured for country/bucket']
      );
    END IF;
  END IF;

  -- Calcular RC actual
  v_rc_data := calculate_rc_v1_1(v_snapshot.country_code, v_snapshot.bucket);
  v_rc := (v_rc_data->>'rc')::NUMERIC;

  -- Saldo FGO actual
  SELECT SUM(balance_cents) INTO v_fgo_balance
  FROM fgo_subfunds;

  -- GATE 1: Solvencia del FGO
  IF v_rc < v_params.rc_hard_floor THEN
    v_eligible := FALSE;
    v_reasons := array_append(v_reasons, format('RC below hard floor (%.2f < %.2f) - critical', v_rc, v_params.rc_hard_floor));
    v_max_cover_cents := 10000;

  ELSIF v_rc < v_params.rc_floor THEN
    v_franchise_pct := 20.00;
    v_reasons := array_append(v_reasons, format('RC below floor (%.2f < %.2f) - 20%% franchise applied', v_rc, v_params.rc_floor));
  END IF;

  -- GATE 2: Límite mensual
  v_monthly_cap := (v_fgo_balance * v_params.monthly_payout_cap)::BIGINT;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_monthly_payout
  FROM fgo_movements
  WHERE
    movement_type IN ('siniestro_payment', 'franchise_payment')
    AND operation = 'debit'
    AND ts >= DATE_TRUNC('month', NOW());

  IF v_monthly_payout + p_claim_amount_cents > v_monthly_cap THEN
    v_eligible := FALSE;
    v_reasons := array_append(v_reasons, format('Monthly payout cap exceeded (%s + %s > %s)',
      v_monthly_payout, p_claim_amount_cents, v_monthly_cap));
  END IF;

  -- GATE 3: Límite por usuario (🔧 FIX: usar renter_id)
  SELECT COUNT(DISTINCT fm.booking_id) INTO v_user_events
  FROM fgo_movements fm
  JOIN bookings b ON fm.booking_id = b.id
  WHERE
    b.renter_id = (SELECT renter_id FROM bookings WHERE id = p_booking_id)  -- 🔧 FIX
    AND fm.movement_type IN ('siniestro_payment', 'franchise_payment')
    AND fm.operation = 'debit'
    AND fm.ts >= NOW() - INTERVAL '3 months';

  IF v_user_events >= v_params.per_user_limit THEN
    v_eligible := FALSE;
    v_reasons := array_append(v_reasons, format('User limit exceeded (%s events this quarter, max %s)',
      v_user_events, v_params.per_user_limit));
  END IF;

  -- GATE 4: Tope por evento
  v_event_cap_usd := v_params.event_cap_usd;
  v_max_cover_cents := LEAST(
    (v_event_cap_usd * 100 * v_snapshot.fx_snapshot)::BIGINT,
    p_claim_amount_cents
  );

  -- Aplicar franquicia interna
  IF v_franchise_pct > 0 THEN
    v_max_cover_cents := (v_max_cover_cents * (100 - v_franchise_pct) / 100)::BIGINT;
  END IF;

  -- Límite por saldo disponible
  v_max_cover_cents := LEAST(v_max_cover_cents, v_fgo_balance);

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'reasons', v_reasons,
    'rc', v_rc,
    'rc_status', v_rc_data->>'status',
    'franchise_percentage', v_franchise_pct,
    'max_cover_cents', v_max_cover_cents,
    'max_cover_usd', v_max_cover_cents / 100.0 / v_snapshot.fx_snapshot,
    'event_cap_usd', v_event_cap_usd,
    'monthly_payout_used_cents', v_monthly_payout,
    'monthly_cap_cents', v_monthly_cap,
    'user_events_quarter', v_user_events,
    'user_event_limit', v_params.per_user_limit,
    'fgo_balance_cents', v_fgo_balance,
    'snapshot', jsonb_build_object(
      'country_code', v_snapshot.country_code,
      'bucket', v_snapshot.bucket,
      'currency', v_snapshot.currency,
      'fx_snapshot', v_snapshot.fx_snapshot
    )
  );
END;
$$;

COMMENT ON FUNCTION fgo_assess_eligibility IS 'Evalúa elegibilidad FGO con gates de solvencia (v1.1) - FIXED';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON v_bookings_with_risk_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION fgo_assess_eligibility TO authenticated;

-- ============================================================================
-- FIN DE CORRECCIONES
-- ============================================================================

COMMENT ON SCHEMA public IS 'FGO v1.1 fixes applied: column names corrected (renter_id, cars.owner_id)';
