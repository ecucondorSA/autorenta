-- ============================================================================
-- AUTORENTAR - FGO v1.1 ENHANCEMENTS
-- ============================================================================
-- Implementación completa de FGO v1.1 según política operativa
--
-- OBJETIVO:
-- - Parámetros dinámicos por país/bucket
-- - PEM (Pérdida Esperada Mensual) y RC dinámico
-- - Waterfall automatizado de cobros
-- - Gates de solvencia (3 niveles)
-- - Evidencias y snapshots de riesgo
-- - Soporte multimoneda con FX
-- ============================================================================

-- ============================================================================
-- PARTE 1: NUEVAS TABLAS
-- ============================================================================

-- 1.1 TABLA DE PARÁMETROS POR PAÍS/BUCKET
-- ============================================================================

CREATE TABLE IF NOT EXISTS fgo_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  country_code TEXT NOT NULL,
  bucket TEXT NOT NULL,  -- 'economy', 'premium', 'luxury', 'default'

  -- Alpha dinámico
  alpha NUMERIC(5,4) NOT NULL DEFAULT 0.1500 CHECK (alpha >= 0 AND alpha <= 1),
  alpha_min NUMERIC(5,4) NOT NULL DEFAULT 0.1000 CHECK (alpha_min >= 0),
  alpha_max NUMERIC(5,4) NOT NULL DEFAULT 0.2000 CHECK (alpha_max <= 1),

  -- Umbrales RC
  rc_floor NUMERIC(6,3) NOT NULL DEFAULT 0.900 CHECK (rc_floor > 0),
  rc_hard_floor NUMERIC(6,3) NOT NULL DEFAULT 0.800 CHECK (rc_hard_floor > 0 AND rc_hard_floor < rc_floor),
  rc_soft_ceiling NUMERIC(6,3) NOT NULL DEFAULT 1.200,

  -- Umbrales LR
  loss_ratio_target NUMERIC(6,3) NOT NULL DEFAULT 0.800 CHECK (loss_ratio_target > 0),

  -- Límites operativos
  monthly_payout_cap NUMERIC(6,3) NOT NULL DEFAULT 0.080,  -- 8% del saldo
  per_user_limit INTEGER NOT NULL DEFAULT 2 CHECK (per_user_limit > 0),
  event_cap_usd NUMERIC(10,2) NOT NULL DEFAULT 800.00 CHECK (event_cap_usd > 0),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(country_code, bucket)
);

COMMENT ON TABLE fgo_parameters IS 'Parámetros operativos del FGO por país y bucket';
COMMENT ON COLUMN fgo_parameters.alpha IS 'Porcentaje de aporte actual (α)';
COMMENT ON COLUMN fgo_parameters.rc_floor IS 'RC mínimo para operación normal';
COMMENT ON COLUMN fgo_parameters.rc_hard_floor IS 'RC crítico (solo micro-pagos)';
COMMENT ON COLUMN fgo_parameters.event_cap_usd IS 'Tope máximo de cobertura por evento en USD';

-- Insertar parámetros iniciales para Argentina
INSERT INTO fgo_parameters (country_code, bucket, alpha, alpha_min, alpha_max, rc_floor, rc_hard_floor, event_cap_usd, per_user_limit)
VALUES
  ('AR', 'default', 0.1500, 0.1000, 0.2000, 0.900, 0.800, 800.00, 2),
  ('AR', 'economy', 0.1800, 0.1500, 0.2200, 0.950, 0.850, 600.00, 2),
  ('AR', 'premium', 0.1500, 0.1000, 0.2000, 0.900, 0.800, 1200.00, 3),
  ('AR', 'luxury', 0.1200, 0.0800, 0.1800, 0.850, 0.750, 2000.00, 3)
ON CONFLICT (country_code, bucket) DO NOTHING;

-- 1.2 TABLA DE SNAPSHOTS DE RIESGO POR BOOKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_risk_snapshot (
  booking_id UUID PRIMARY KEY REFERENCES bookings(id),

  country_code TEXT NOT NULL,
  bucket TEXT NOT NULL,

  -- FX snapshot (al momento de crear el booking)
  fx_snapshot NUMERIC(14,6) NOT NULL DEFAULT 1.0,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Garantías estimadas (en moneda local)
  estimated_hold_amount NUMERIC(16,4),
  estimated_deposit NUMERIC(16,4),

  -- Franquicia calculada (en USD)
  franchise_usd NUMERIC(12,2) NOT NULL,

  -- Flags
  has_card BOOLEAN NOT NULL DEFAULT FALSE,
  has_wallet_security BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_risk_snapshot_country_bucket ON booking_risk_snapshot(country_code, bucket);

COMMENT ON TABLE booking_risk_snapshot IS 'Snapshot de riesgo y FX por booking al momento de creación';
COMMENT ON COLUMN booking_risk_snapshot.fx_snapshot IS 'Tipo de cambio moneda local → USD al momento del booking';
COMMENT ON COLUMN booking_risk_snapshot.franchise_usd IS 'Franquicia calculada en USD (según bucket)';

-- 1.3 TABLA DE INSPECCIONES DE VEHÍCULO
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  booking_id UUID NOT NULL REFERENCES bookings(id),
  stage TEXT NOT NULL CHECK (stage IN ('check_in', 'check_out')),
  inspector_id UUID NOT NULL REFERENCES profiles(id),

  -- Evidencias
  photos JSONB NOT NULL,  -- [{ url, type, caption }]
  odometer INTEGER CHECK (odometer >= 0),
  fuel_level NUMERIC(5,2) CHECK (fuel_level >= 0 AND fuel_level <= 100),
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),

  -- Flags
  signed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(booking_id, stage)
);

CREATE INDEX idx_booking_inspections_booking ON booking_inspections(booking_id);
CREATE INDEX idx_booking_inspections_stage ON booking_inspections(stage);

COMMENT ON TABLE booking_inspections IS 'Evidencias de inspección de vehículo (check-in/out)';
COMMENT ON COLUMN booking_inspections.photos IS 'Array JSON de evidencias fotográficas';
COMMENT ON COLUMN booking_inspections.signed_at IS 'Timestamp de firma digital de la inspección';

-- ============================================================================
-- PARTE 2: EXTENSIONES A TABLAS EXISTENTES
-- ============================================================================

-- 2.1 EXTENDER fgo_movements
-- ============================================================================

-- Agregar columnas para multimoneda
ALTER TABLE fgo_movements
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS fx_snapshot NUMERIC(14,6) DEFAULT 1.0;

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_fgo_movements_country ON fgo_movements(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fgo_movements_currency ON fgo_movements(currency);

COMMENT ON COLUMN fgo_movements.country_code IS 'País del movimiento (para métricas por región)';
COMMENT ON COLUMN fgo_movements.currency IS 'Moneda original del movimiento';
COMMENT ON COLUMN fgo_movements.fx_snapshot IS 'Tipo de cambio a USD al momento del movimiento';

-- 2.2 EXTENDER fgo_metrics
-- ============================================================================

-- Agregar campos de PEM y rolling metrics
ALTER TABLE fgo_metrics
ADD COLUMN IF NOT EXISTS pem_cents BIGINT,
ADD COLUMN IF NOT EXISTS pem_window_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS lr_90d NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS lr_365d NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS total_events_90d INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_recovery_rate NUMERIC(6,3);

COMMENT ON COLUMN fgo_metrics.pem_cents IS 'Pérdida Esperada Mensual en centavos (rolling 90d)';
COMMENT ON COLUMN fgo_metrics.lr_90d IS 'Loss Ratio rolling 90 días';
COMMENT ON COLUMN fgo_metrics.lr_365d IS 'Loss Ratio rolling 365 días';
COMMENT ON COLUMN fgo_metrics.avg_recovery_rate IS 'Tasa promedio de recupero (0.0 - 1.0)';

-- ============================================================================
-- PARTE 3: FUNCIONES DE CÁLCULO
-- ============================================================================

-- 3.1 FUNCIÓN: CALCULAR PEM (Pérdida Esperada Mensual)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_pem(
  p_country_code TEXT DEFAULT NULL,
  p_bucket TEXT DEFAULT NULL,
  p_window_days INTEGER DEFAULT 90
)
RETURNS TABLE(
  country_code TEXT,
  bucket TEXT,
  pem_cents BIGINT,
  event_count INTEGER,
  avg_event_cents BIGINT,
  total_paid_cents BIGINT,
  total_recovered_cents BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH movements_window AS (
    SELECT
      COALESCE(fm.country_code, 'global') AS cc,
      COALESCE(brs.bucket, 'default') AS bk,
      fm.booking_id,
      fm.amount_cents,
      fm.movement_type,
      fm.operation
    FROM fgo_movements fm
    LEFT JOIN booking_risk_snapshot brs ON fm.booking_id = brs.booking_id
    WHERE
      fm.ts >= NOW() - (p_window_days || ' days')::INTERVAL
      AND (p_country_code IS NULL OR COALESCE(fm.country_code, 'global') = p_country_code)
      AND (p_bucket IS NULL OR COALESCE(brs.bucket, 'default') = p_bucket)
  ),
  aggregated AS (
    SELECT
      cc,
      bk,
      COUNT(DISTINCT booking_id) FILTER (WHERE movement_type IN ('siniestro_payment', 'franchise_payment')) AS event_cnt,

      -- Total pagado (débitos)
      COALESCE(SUM(amount_cents) FILTER (WHERE movement_type IN ('siniestro_payment', 'franchise_payment') AND operation = 'debit'), 0) AS total_paid,

      -- Total recuperado (créditos)
      COALESCE(SUM(amount_cents) FILTER (WHERE movement_type = 'recovery' AND operation = 'credit'), 0) AS total_recovered
    FROM movements_window
    GROUP BY cc, bk
  )
  SELECT
    agg.cc AS country_code,
    agg.bk AS bucket,

    -- PEM = (Pagos - Recuperos) * (30 / window_days) = Pérdida neta mensualizada
    (((agg.total_paid - agg.total_recovered) * 30.0) / p_window_days)::BIGINT AS pem_cents,

    agg.event_cnt AS event_count,

    CASE
      WHEN agg.event_cnt > 0 THEN (agg.total_paid / agg.event_cnt)::BIGINT
      ELSE 0
    END AS avg_event_cents,

    agg.total_paid AS total_paid_cents,
    agg.total_recovered AS total_recovered_cents

  FROM aggregated agg;
END;
$$;

COMMENT ON FUNCTION calculate_pem IS 'Calcula Pérdida Esperada Mensual (PEM) por país/bucket usando rolling window';

-- 3.2 FUNCIÓN: CALCULAR RC v1.1 (Dinámico con PEM)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_rc_v1_1(
  p_country_code TEXT DEFAULT NULL,
  p_bucket TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pem BIGINT;
  v_current_balance BIGINT;
  v_target_balance BIGINT;
  v_rc NUMERIC(10,4);
  v_target_months INTEGER;
  v_event_count INTEGER;
BEGIN
  -- Obtener target de meses de cobertura
  SELECT target_months_coverage INTO v_target_months
  FROM fgo_metrics
  WHERE id = TRUE;

  -- Calcular PEM para el país/bucket
  SELECT pem.pem_cents, pem.event_count INTO v_pem, v_event_count
  FROM calculate_pem(p_country_code, p_bucket, 90) pem
  LIMIT 1;

  v_pem := COALESCE(v_pem, 0);
  v_event_count := COALESCE(v_event_count, 0);

  -- Saldo actual total del FGO
  SELECT SUM(balance_cents) INTO v_current_balance
  FROM fgo_subfunds;

  -- Target Balance = 12 × PEM
  v_target_balance := v_pem * v_target_months;

  -- Calcular RC
  IF v_target_balance > 0 THEN
    v_rc := v_current_balance::NUMERIC / v_target_balance::NUMERIC;
  ELSE
    -- Sin suficiente historial, asumir healthy
    v_rc := NULL;
  END IF;

  -- Determinar estado
  RETURN jsonb_build_object(
    'pem_cents', v_pem,
    'current_balance_cents', v_current_balance,
    'target_balance_cents', v_target_balance,
    'rc', v_rc,
    'event_count', v_event_count,
    'status', CASE
      WHEN v_rc IS NULL THEN 'healthy'
      WHEN v_rc >= 1.0 THEN 'healthy'
      WHEN v_rc >= 0.9 THEN 'warning'
      ELSE 'critical'
    END,
    'calculated_at', NOW()
  );
END;
$$;

COMMENT ON FUNCTION calculate_rc_v1_1 IS 'Calcula RC (Coverage Ratio) dinámico basado en PEM (v1.1)';

-- 3.3 FUNCIÓN: AJUSTE AUTOMÁTICO DE ALPHA
-- ============================================================================

CREATE OR REPLACE FUNCTION adjust_alpha_dynamic(
  p_country_code TEXT DEFAULT 'AR',
  p_bucket TEXT DEFAULT 'default'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rc NUMERIC(10,4);
  v_current_alpha NUMERIC(5,4);
  v_new_alpha NUMERIC(5,4);
  v_alpha_min NUMERIC(5,4);
  v_alpha_max NUMERIC(5,4);
  v_rc_floor NUMERIC(6,3);
  v_rc_ceiling NUMERIC(6,3);
  rec JSONB;
BEGIN
  -- Obtener parámetros del país/bucket
  SELECT alpha, alpha_min, alpha_max, rc_floor, rc_soft_ceiling
  INTO v_current_alpha, v_alpha_min, v_alpha_max, v_rc_floor, v_rc_ceiling
  FROM fgo_parameters
  WHERE country_code = p_country_code AND bucket = p_bucket;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parameters not found for country=%, bucket=%', p_country_code, p_bucket;
  END IF;

  -- Calcular RC actual
  rec := calculate_rc_v1_1(p_country_code, p_bucket);
  v_rc := (rec->>'rc')::NUMERIC;

  -- Lógica de ajuste según gates
  IF v_rc IS NULL OR v_rc >= v_rc_ceiling THEN
    -- RC alto → bajar α (reducir aportes)
    v_new_alpha := GREATEST(v_alpha_min, v_current_alpha - 0.02);

  ELSIF v_rc < v_rc_floor THEN
    -- RC bajo → subir α (aumentar aportes)
    v_new_alpha := LEAST(v_alpha_max, v_current_alpha + 0.05);

  ELSE
    -- RC dentro de rango óptimo → mantener
    v_new_alpha := v_current_alpha;
  END IF;

  -- Actualizar parámetros si cambió
  IF v_new_alpha != v_current_alpha THEN
    UPDATE fgo_parameters
    SET
      alpha = v_new_alpha,
      updated_at = NOW()
    WHERE country_code = p_country_code AND bucket = p_bucket;
  END IF;

  RETURN jsonb_build_object(
    'country_code', p_country_code,
    'bucket', p_bucket,
    'rc', v_rc,
    'previous_alpha', v_current_alpha,
    'new_alpha', v_new_alpha,
    'adjusted', v_new_alpha != v_current_alpha,
    'adjustment_delta', v_new_alpha - v_current_alpha,
    'timestamp', NOW()
  );
END;
$$;

COMMENT ON FUNCTION adjust_alpha_dynamic IS 'Ajusta α dinámicamente según RC aplicando gates policy (v1.1)';

-- ============================================================================
-- PARTE 4: RPCs PARA WATERFALL
-- ============================================================================

-- 4.1 RPC: EVALUAR ELEGIBILIDAD PARA COBERTURA FGO
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
    -- RC crítico → solo micro-pagos
    v_eligible := FALSE;
    v_reasons := array_append(v_reasons, format('RC below hard floor (%.2f < %.2f) - critical', v_rc, v_params.rc_hard_floor));
    v_max_cover_cents := 10000;  -- USD 100 máximo

  ELSIF v_rc < v_params.rc_floor THEN
    -- RC bajo → franquicia interna 20%
    v_franchise_pct := 20.00;
    v_reasons := array_append(v_reasons, format('RC below floor (%.2f < %.2f) - 20%% franchise applied', v_rc, v_params.rc_floor));

  END IF;

  -- GATE 2: Límite mensual (% del saldo)
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

  -- GATE 3: Límite por usuario (eventos por trimestre)
  SELECT COUNT(DISTINCT fm.booking_id) INTO v_user_events
  FROM fgo_movements fm
  JOIN bookings b ON fm.booking_id = b.id
  WHERE
    b.locatario_id = (SELECT locatario_id FROM bookings WHERE id = p_booking_id)
    AND fm.movement_type IN ('siniestro_payment', 'franchise_payment')
    AND fm.operation = 'debit'
    AND fm.ts >= NOW() - INTERVAL '3 months';

  IF v_user_events >= v_params.per_user_limit THEN
    v_eligible := FALSE;
    v_reasons := array_append(v_reasons, format('User limit exceeded (%s events this quarter, max %s)',
      v_user_events, v_params.per_user_limit));
  END IF;

  -- GATE 4: Tope por evento en USD
  v_event_cap_usd := v_params.event_cap_usd;

  -- Calcular máximo a cubrir (en moneda local)
  v_max_cover_cents := LEAST(
    (v_event_cap_usd * 100 * v_snapshot.fx_snapshot)::BIGINT,
    p_claim_amount_cents
  );

  -- Aplicar franquicia interna si corresponde
  IF v_franchise_pct > 0 THEN
    v_max_cover_cents := (v_max_cover_cents * (100 - v_franchise_pct) / 100)::BIGINT;
  END IF;

  -- Asegurar que no excede saldo disponible
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

COMMENT ON FUNCTION fgo_assess_eligibility IS 'Evalúa elegibilidad para cobertura FGO aplicando gates de solvencia (v1.1)';

-- 4.2 RPC: EJECUTAR WATERFALL DE COBROS
-- ============================================================================

CREATE OR REPLACE FUNCTION fgo_execute_waterfall(
  p_booking_id UUID,
  p_total_claim_cents BIGINT,
  p_description TEXT,
  p_evidence_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot RECORD;
  v_eligibility JSONB;
  v_remaining BIGINT;
  v_hold_captured BIGINT := 0;
  v_wallet_debited BIGINT := 0;
  v_extra_charged BIGINT := 0;
  v_fgo_paid BIGINT := 0;
  v_ref VARCHAR(128);
  v_movement_id UUID;
  v_franchise_cents BIGINT;
  v_already_charged BIGINT;
  v_max_extra BIGINT;
BEGIN
  -- Validar evidencias
  IF NOT EXISTS (
    SELECT 1 FROM booking_inspections
    WHERE booking_id = p_booking_id AND stage = 'check_out'
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Missing check-out inspection evidence'
    );
  END IF;

  -- Obtener snapshot
  SELECT * INTO v_snapshot
  FROM booking_risk_snapshot
  WHERE booking_id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'No risk snapshot found for booking'
    );
  END IF;

  -- Validar elegibilidad FGO
  v_eligibility := fgo_assess_eligibility(p_booking_id, p_total_claim_cents);

  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Not eligible for FGO coverage',
      'eligibility', v_eligibility
    );
  END IF;

  v_remaining := p_total_claim_cents;

  -- STEP 1: Capturar hold de tarjeta (si existe)
  IF v_snapshot.has_card AND v_snapshot.estimated_hold_amount > 0 THEN
    v_hold_captured := LEAST(v_remaining, v_snapshot.estimated_hold_amount::BIGINT);
    v_remaining := v_remaining - v_hold_captured;

    RAISE NOTICE '[Waterfall] Step 1: Captured hold = % cents', v_hold_captured;
  END IF;

  -- STEP 2: Debitar crédito de seguridad wallet (si existe)
  IF v_snapshot.has_wallet_security AND v_snapshot.estimated_deposit > 0 AND v_remaining > 0 THEN
    v_wallet_debited := LEAST(v_remaining, v_snapshot.estimated_deposit::BIGINT);
    v_remaining := v_remaining - v_wallet_debited;

    RAISE NOTICE '[Waterfall] Step 2: Debited wallet security = % cents', v_wallet_debited;
  END IF;

  -- STEP 3: Cobro adicional (card-on-file / top-up) hasta franquicia
  IF v_remaining > 0 THEN
    v_franchise_cents := (v_snapshot.franchise_usd * 100 * v_snapshot.fx_snapshot)::BIGINT;
    v_already_charged := v_hold_captured + v_wallet_debited;
    v_max_extra := GREATEST(0, v_franchise_cents - v_already_charged);

    v_extra_charged := LEAST(v_remaining, v_max_extra);

    IF v_extra_charged > 0 THEN
      RAISE NOTICE '[Waterfall] Step 3: Extra charge requested = % cents (up to franchise)', v_extra_charged;
      v_remaining := v_remaining - v_extra_charged;
    END IF;
  END IF;

  -- STEP 4: FGO cubre remanente (hasta tope)
  IF v_remaining > 0 THEN
    v_fgo_paid := LEAST(
      v_remaining,
      (v_eligibility->>'max_cover_cents')::BIGINT
    );

    IF v_fgo_paid > 0 THEN
      -- Verificar saldo suficiente en liquidez
      DECLARE
        v_liquidity_balance BIGINT;
      BEGIN
        SELECT balance_cents INTO v_liquidity_balance
        FROM fgo_subfunds
        WHERE subfund_type = 'liquidity'
        FOR UPDATE;  -- Lock pesimista

        IF v_liquidity_balance < v_fgo_paid THEN
          RAISE EXCEPTION 'Insufficient liquidity in FGO (balance: %, required: %)',
            v_liquidity_balance, v_fgo_paid;
        END IF;
      END;

      -- Registrar pago FGO
      v_ref := 'fgo-waterfall-' || p_booking_id || '-' || extract(epoch from now())::TEXT;

      INSERT INTO fgo_movements (
        movement_type,
        subfund_type,
        amount_cents,
        operation,
        booking_id,
        country_code,
        currency,
        fx_snapshot,
        ref,
        meta
      )
      VALUES (
        'siniestro_payment',
        'liquidity',
        v_fgo_paid,
        'debit',
        p_booking_id,
        v_snapshot.country_code,
        v_snapshot.currency,
        v_snapshot.fx_snapshot,
        v_ref,
        jsonb_build_object(
          'description', p_description,
          'evidence_url', p_evidence_url,
          'waterfall_breakdown', jsonb_build_object(
            'total_claim_cents', p_total_claim_cents,
            'hold_captured', v_hold_captured,
            'wallet_debited', v_wallet_debited,
            'extra_charged', v_extra_charged,
            'fgo_paid', v_fgo_paid,
            'remaining_uncovered', v_remaining - v_fgo_paid
          ),
          'eligibility_check', v_eligibility
        )
      )
      RETURNING id INTO v_movement_id;

      v_remaining := v_remaining - v_fgo_paid;

      RAISE NOTICE '[Waterfall] Step 4: FGO paid = % cents', v_fgo_paid;
    END IF;
  END IF;

  -- Recalcular métricas FGO
  PERFORM calculate_fgo_metrics();

  -- Retornar resultado completo
  RETURN jsonb_build_object(
    'ok', true,
    'booking_id', p_booking_id,
    'total_claim_cents', p_total_claim_cents,
    'breakdown', jsonb_build_object(
      'hold_captured', v_hold_captured,
      'wallet_debited', v_wallet_debited,
      'extra_charged', v_extra_charged,
      'fgo_paid', v_fgo_paid,
      'remaining_uncovered', v_remaining
    ),
    'fgo_movement_id', v_movement_id,
    'fgo_ref', v_ref,
    'eligibility', v_eligibility,
    'executed_at', NOW()
  );
END;
$$;

COMMENT ON FUNCTION fgo_execute_waterfall IS 'Ejecuta waterfall completo de cobros: hold → wallet → extra → FGO (v1.1)';

-- ============================================================================
-- PARTE 5: VISTAS EXTENDIDAS
-- ============================================================================

-- 5.1 VISTA: Estado FGO v1.1 (Extendida)
-- ============================================================================

CREATE OR REPLACE VIEW v_fgo_status_v1_1 AS
SELECT
  -- Saldos por subfondo (backward compatible v1.0)
  (SELECT balance_cents FROM fgo_subfunds WHERE subfund_type = 'liquidity') as liquidity_balance_cents,
  (SELECT balance_cents FROM fgo_subfunds WHERE subfund_type = 'capitalization') as capitalization_balance_cents,
  (SELECT balance_cents FROM fgo_subfunds WHERE subfund_type = 'profitability') as profitability_balance_cents,
  (SELECT SUM(balance_cents) FROM fgo_subfunds) as total_fgo_balance_cents,

  -- Métricas v1.0
  m.alpha_percentage,
  m.target_months_coverage,
  m.total_contributions_cents,
  m.total_siniestros_paid_cents,
  m.total_siniestros_count,
  m.coverage_ratio,
  m.loss_ratio,
  m.target_balance_cents,
  m.status,

  -- 🆕 Métricas v1.1
  m.pem_cents,
  m.lr_90d,
  m.lr_365d,
  m.total_events_90d,
  m.avg_recovery_rate,

  m.last_calculated_at,
  m.updated_at
FROM fgo_metrics m
WHERE m.id = TRUE;

COMMENT ON VIEW v_fgo_status_v1_1 IS 'Estado completo FGO v1.1 con métricas extendidas (PEM, LR rolling)';

-- 5.2 VISTA: Resumen de Parámetros
-- ============================================================================

CREATE OR REPLACE VIEW v_fgo_parameters_summary AS
SELECT
  country_code,
  bucket,
  (alpha * 100)::NUMERIC(5,2) AS alpha_pct,
  rc_floor,
  rc_hard_floor,
  rc_soft_ceiling,
  event_cap_usd,
  (monthly_payout_cap * 100)::NUMERIC(5,2) AS monthly_cap_pct,
  per_user_limit,
  updated_at
FROM fgo_parameters
ORDER BY country_code, bucket;

COMMENT ON VIEW v_fgo_parameters_summary IS 'Resumen de parámetros FGO por país/bucket (v1.1)';

-- 5.3 VISTA: Bookings con Snapshots de Riesgo
-- ============================================================================

CREATE OR REPLACE VIEW v_bookings_with_risk_snapshot AS
SELECT
  b.id AS booking_id,
  b.car_id,
  b.locador_id,
  b.locatario_id,
  b.status AS booking_status,
  b.start_date,
  b.end_date,
  b.total_price_cents,

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
LEFT JOIN booking_risk_snapshot brs ON b.id = brs.booking_id
ORDER BY b.created_at DESC;

COMMENT ON VIEW v_bookings_with_risk_snapshot IS 'Bookings con snapshots de riesgo e inspecciones (v1.1)';

-- ============================================================================
-- PARTE 6: RLS POLICIES
-- ============================================================================

-- 6.1 RLS para fgo_parameters
-- ============================================================================

ALTER TABLE fgo_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view FGO parameters"
  ON fgo_parameters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update FGO parameters"
  ON fgo_parameters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- 6.2 RLS para booking_risk_snapshot
-- ============================================================================

ALTER TABLE booking_risk_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booking risk snapshots"
  ON booking_risk_snapshot FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_risk_snapshot.booking_id
      AND (b.locador_id = auth.uid() OR b.locatario_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- 6.3 RLS para booking_inspections
-- ============================================================================

ALTER TABLE booking_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booking inspections"
  ON booking_inspections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_inspections.booking_id
      AND (b.locador_id = auth.uid() OR b.locatario_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Locador/Locatario can insert inspections"
  ON booking_inspections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_inspections.booking_id
      AND (b.locador_id = auth.uid() OR b.locatario_id = auth.uid())
    )
  );

-- ============================================================================
-- PARTE 7: GRANTS
-- ============================================================================

-- Service role full access
GRANT ALL ON fgo_parameters TO service_role;
GRANT ALL ON booking_risk_snapshot TO service_role;
GRANT ALL ON booking_inspections TO service_role;

-- Authenticated users read access
GRANT SELECT ON fgo_parameters TO authenticated;
GRANT SELECT ON booking_risk_snapshot TO authenticated;
GRANT SELECT ON booking_inspections TO authenticated;
GRANT INSERT ON booking_inspections TO authenticated;

-- Views
GRANT SELECT ON v_fgo_status_v1_1 TO authenticated;
GRANT SELECT ON v_fgo_parameters_summary TO authenticated;
GRANT SELECT ON v_bookings_with_risk_snapshot TO authenticated;

-- Functions
GRANT EXECUTE ON FUNCTION calculate_pem TO service_role;
GRANT EXECUTE ON FUNCTION calculate_rc_v1_1 TO service_role;
GRANT EXECUTE ON FUNCTION adjust_alpha_dynamic TO service_role;
GRANT EXECUTE ON FUNCTION fgo_assess_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION fgo_execute_waterfall TO service_role;

-- ============================================================================
-- FIN DE MIGRACIÓN FGO v1.1
-- ============================================================================

COMMENT ON SCHEMA public IS 'FGO v1.1 enhancements applied: parameters, PEM, RC dynamic, waterfall, gates';
