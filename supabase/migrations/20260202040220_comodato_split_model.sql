-- ============================================================================
-- COMODATO MODEL: 15-70-15 Payment Split
-- ============================================================================
-- Migración para implementar el modelo de distribución de pagos Comodato
-- 
-- Distribución:
--   15% → Plataforma (Autorentar revenue)
--   70% → Reward Pool (distribución mensual a owners)
--   15% → FGO (Fondo de Garantía de Owners)
--
-- Fecha: 2026-02-02
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. REWARD POOL BALANCES (Períodos mensuales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_pool_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_collected DECIMAL(12,2) DEFAULT 0,
  total_distributed DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'collecting' CHECK (status IN ('collecting', 'distributing', 'closed')),
  distributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_period UNIQUE (period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_reward_pool_status ON public.reward_pool_balances(status);
CREATE INDEX IF NOT EXISTS idx_reward_pool_period ON public.reward_pool_balances(period_start DESC);

COMMENT ON TABLE public.reward_pool_balances IS 'Períodos mensuales de acumulación del Reward Pool';

-- ============================================================================
-- 2. REWARD POOL CONTRIBUTIONS (Aportes por booking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_pool_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.reward_pool_balances(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_booking_contribution UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_rpc_pool ON public.reward_pool_contributions(pool_id);
CREATE INDEX IF NOT EXISTS idx_rpc_owner ON public.reward_pool_contributions(owner_id);
CREATE INDEX IF NOT EXISTS idx_rpc_booking ON public.reward_pool_contributions(booking_id);

COMMENT ON TABLE public.reward_pool_contributions IS '70% de cada pago de booking va a este registro';

-- ============================================================================
-- 3. REWARD POOL PAYOUTS (Pagos mensuales a owners)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_pool_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.reward_pool_balances(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  share_percentage DECIMAL(7,4),
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')),
  mercadopago_payout_id TEXT,
  error_message TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rpp_pool ON public.reward_pool_payouts(pool_id);
CREATE INDEX IF NOT EXISTS idx_rpp_owner ON public.reward_pool_payouts(owner_id);
CREATE INDEX IF NOT EXISTS idx_rpp_status ON public.reward_pool_payouts(payout_status);

COMMENT ON TABLE public.reward_pool_payouts IS 'Distribución mensual del Reward Pool a cada owner';

-- ============================================================================
-- 4. FGO FUND (Singleton - Fondo de Garantía)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fgo_fund (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance DECIMAL(12,2) DEFAULT 0,
  total_collected DECIMAL(12,2) DEFAULT 0,
  total_claims_paid DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear registro singleton si no existe
INSERT INTO public.fgo_fund (balance, total_collected, total_claims_paid)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.fgo_fund);

COMMENT ON TABLE public.fgo_fund IS 'Fondo de Garantía de Owners - 15% de cada pago';

-- ============================================================================
-- 5. FGO CONTRIBUTIONS (Aportes al fondo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fgo_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_fgo_booking UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_fgo_contrib_booking ON public.fgo_contributions(booking_id);

COMMENT ON TABLE public.fgo_contributions IS '15% de cada pago de booking va al FGO';

-- ============================================================================
-- 6. FGO CLAIMS (Reclamos contra el fondo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fgo_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  claimant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('damage', 'theft', 'non_payment', 'other')),
  amount_requested DECIMAL(10,2) NOT NULL CHECK (amount_requested > 0),
  amount_approved DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'paid')),
  evidence_urls TEXT[],
  resolution_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fgo_claims_booking ON public.fgo_claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_fgo_claims_claimant ON public.fgo_claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_fgo_claims_status ON public.fgo_claims(status);

COMMENT ON TABLE public.fgo_claims IS 'Reclamos de owners para cobrar del FGO';

-- ============================================================================
-- 7. RPC: calculate_payment_split (Comodato 15-70-15)
-- ============================================================================

DROP FUNCTION IF EXISTS public.calculate_payment_split(DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS public.calculate_payment_split(BIGINT);

CREATE OR REPLACE FUNCTION public.calculate_payment_split(
  p_total_amount_cents BIGINT
)
RETURNS TABLE (
  total_cents BIGINT,
  platform_fee_cents BIGINT,
  reward_pool_cents BIGINT,
  fgo_cents BIGINT,
  owner_direct_cents BIGINT
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_platform BIGINT;
  v_reward BIGINT;
  v_fgo BIGINT;
  v_remainder BIGINT;
BEGIN
  -- 15% plataforma
  v_platform := ROUND(p_total_amount_cents * 0.15);
  
  -- 70% reward pool
  v_reward := ROUND(p_total_amount_cents * 0.70);
  
  -- 15% FGO
  v_fgo := ROUND(p_total_amount_cents * 0.15);
  
  -- Ajustar redondeo (diferencia va a reward pool)
  v_remainder := p_total_amount_cents - v_platform - v_reward - v_fgo;
  v_reward := v_reward + v_remainder;
  
  RETURN QUERY SELECT
    p_total_amount_cents,
    v_platform,
    v_reward,
    v_fgo,
    0::BIGINT; -- Owner no recibe pago directo
END;
$$;

COMMENT ON FUNCTION public.calculate_payment_split(BIGINT) IS 
  'Calcula split Comodato: 15% platform, 70% reward pool, 15% FGO';

-- ============================================================================
-- 8. RPC: get_or_create_current_pool
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_current_pool()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pool_id UUID;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Calcular período del mes actual
  v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Buscar pool existente
  SELECT id INTO v_pool_id
  FROM public.reward_pool_balances
  WHERE period_start = v_period_start AND status = 'collecting'
  LIMIT 1;
  
  -- Crear si no existe
  IF v_pool_id IS NULL THEN
    INSERT INTO public.reward_pool_balances (period_start, period_end, status)
    VALUES (v_period_start, v_period_end, 'collecting')
    RETURNING id INTO v_pool_id;
  END IF;
  
  RETURN v_pool_id;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_current_pool() IS 
  'Obtiene o crea el Reward Pool del mes actual';

-- ============================================================================
-- 9. RPC: register_comodato_payment
-- ============================================================================

CREATE OR REPLACE FUNCTION public.register_comodato_payment(
  p_booking_id UUID,
  p_total_cents BIGINT,
  p_mercadopago_payment_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split RECORD;
  v_owner_id UUID;
  v_pool_id UUID;
BEGIN
  -- Calcular split
  SELECT * INTO v_split FROM public.calculate_payment_split(p_total_cents);
  
  -- Obtener owner del booking
  SELECT c.owner_id INTO v_owner_id
  FROM public.bookings b 
  JOIN public.cars c ON b.car_id = c.id
  WHERE b.id = p_booking_id;
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found or has no owner: %', p_booking_id;
  END IF;
  
  -- Obtener pool activo
  v_pool_id := public.get_or_create_current_pool();
  
  -- Registrar contribución al Reward Pool
  INSERT INTO public.reward_pool_contributions (pool_id, booking_id, owner_id, amount)
  VALUES (v_pool_id, p_booking_id, v_owner_id, v_split.reward_pool_cents / 100.0)
  ON CONFLICT (booking_id) DO NOTHING;
  
  -- Actualizar balance del pool
  UPDATE public.reward_pool_balances
  SET total_collected = total_collected + (v_split.reward_pool_cents / 100.0)
  WHERE id = v_pool_id;
  
  -- Registrar contribución al FGO
  INSERT INTO public.fgo_contributions (booking_id, amount)
  VALUES (p_booking_id, v_split.fgo_cents / 100.0)
  ON CONFLICT (booking_id) DO NOTHING;
  
  -- Actualizar balance FGO
  UPDATE public.fgo_fund
  SET 
    balance = balance + (v_split.fgo_cents / 100.0),
    total_collected = total_collected + (v_split.fgo_cents / 100.0),
    updated_at = now();
  
  -- Actualizar booking con info del split
  UPDATE public.bookings
  SET 
    platform_fee = v_split.platform_fee_cents / 100.0,
    owner_payment_amount = 0, -- Owner no recibe directo
    payment_split_completed = true
  WHERE id = p_booking_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_cents', v_split.total_cents,
    'platform_fee_cents', v_split.platform_fee_cents,
    'reward_pool_cents', v_split.reward_pool_cents,
    'fgo_cents', v_split.fgo_cents,
    'pool_id', v_pool_id,
    'owner_id', v_owner_id
  );
END;
$$;

COMMENT ON FUNCTION public.register_comodato_payment IS 
  'Registra un pago y distribuye: 15% platform, 70% reward pool, 15% FGO';

-- ============================================================================
-- 10. RPC: distribute_monthly_rewards
-- ============================================================================

CREATE OR REPLACE FUNCTION public.distribute_monthly_rewards(
  p_pool_id UUID
)
RETURNS TABLE (
  owner_id UUID,
  amount DECIMAL,
  share_percentage DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total DECIMAL;
  v_owner RECORD;
  v_pool_status TEXT;
BEGIN
  -- Verificar estado del pool
  SELECT status, total_collected INTO v_pool_status, v_total
  FROM public.reward_pool_balances 
  WHERE id = p_pool_id;
  
  IF v_pool_status IS NULL THEN
    RAISE EXCEPTION 'Pool not found: %', p_pool_id;
  END IF;
  
  IF v_pool_status != 'collecting' THEN
    RAISE EXCEPTION 'Pool already processed: % (status: %)', p_pool_id, v_pool_status;
  END IF;
  
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Pool is empty';
  END IF;
  
  -- Calcular y registrar payout para cada owner
  FOR v_owner IN
    SELECT rpc.owner_id, SUM(rpc.amount) as contributed
    FROM public.reward_pool_contributions rpc
    WHERE rpc.pool_id = p_pool_id
    GROUP BY rpc.owner_id
  LOOP
    INSERT INTO public.reward_pool_payouts (
      pool_id, 
      owner_id, 
      amount, 
      share_percentage,
      payout_status
    )
    VALUES (
      p_pool_id,
      v_owner.owner_id,
      v_owner.contributed,
      ROUND((v_owner.contributed / v_total) * 100, 4),
      'pending'
    );
    
    RETURN QUERY SELECT 
      v_owner.owner_id, 
      v_owner.contributed, 
      ROUND((v_owner.contributed / v_total) * 100, 4);
  END LOOP;
  
  -- Marcar pool como distribuyendo
  UPDATE public.reward_pool_balances
  SET 
    status = 'distributing',
    total_distributed = v_total,
    distributed_at = now()
  WHERE id = p_pool_id;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.distribute_monthly_rewards IS 
  'Calcula y registra los payouts mensuales del Reward Pool';

-- ============================================================================
-- 11. RPC: process_comodato_booking_payment (Called by webhook)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_comodato_booking_payment(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_total_cents BIGINT;
  v_result JSONB;
BEGIN
  -- Get booking with payment info
  SELECT 
    b.id,
    b.total_price,
    b.currency,
    b.payment_split_completed,
    b.mercadopago_payment_id,
    COALESCE(b.metadata->>'mercadopago_payment_id', '')::TEXT as mp_payment_id
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id;
  
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;
  
  -- Check if already processed
  IF v_booking.payment_split_completed = true THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already processed',
      'already_processed', true
    );
  END IF;
  
  -- Convert to cents
  v_total_cents := ROUND(COALESCE(v_booking.total_price, 0) * 100)::BIGINT;
  
  IF v_total_cents <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid booking amount'
    );
  END IF;
  
  -- Call the main registration function
  v_result := public.register_comodato_payment(
    p_booking_id,
    v_total_cents,
    COALESCE(v_booking.mercadopago_payment_id, v_booking.mp_payment_id)
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.process_comodato_booking_payment IS 
  'Procesa un pago de booking y registra contribuciones Comodato (llamado por webhook)';

-- ============================================================================
-- 12. RLS POLICIES
-- ============================================================================


ALTER TABLE public.reward_pool_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_pool_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_pool_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fgo_fund ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fgo_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fgo_claims ENABLE ROW LEVEL SECURITY;

-- Pool balances: Solo lectura para usuarios autenticados
CREATE POLICY "Authenticated users can view pool balances" 
  ON public.reward_pool_balances FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Contributions: Owners ven sus propias contribuciones
CREATE POLICY "Owners can view own contributions" 
  ON public.reward_pool_contributions FOR SELECT 
  USING (auth.uid() = owner_id);

-- Payouts: Owners ven sus propios payouts
CREATE POLICY "Owners can view own payouts" 
  ON public.reward_pool_payouts FOR SELECT 
  USING (auth.uid() = owner_id);

-- FGO Fund: Solo lectura para autenticados (balance público)
CREATE POLICY "Authenticated can view FGO balance" 
  ON public.fgo_fund FOR SELECT 
  USING (auth.role() = 'authenticated');

-- FGO Contributions: Solo admins
CREATE POLICY "Admins can view FGO contributions" 
  ON public.fgo_contributions FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- FGO Claims: Claimant y admins
CREATE POLICY "Users can view own claims" 
  ON public.fgo_claims FOR SELECT 
  USING (auth.uid() = claimant_id);

CREATE POLICY "Users can create claims" 
  ON public.fgo_claims FOR INSERT 
  WITH CHECK (auth.uid() = claimant_id);

-- ============================================================================
-- 12. VIEWS ÚTILES
-- ============================================================================

-- Drop existing views if they exist (to avoid column conflicts)
DROP VIEW IF EXISTS public.v_current_reward_pool;
DROP VIEW IF EXISTS public.v_fgo_status;

CREATE OR REPLACE VIEW public.v_current_reward_pool AS
SELECT 
  rpb.*,
  COALESCE(SUM(rpc.amount), 0) as verified_total,
  COUNT(DISTINCT rpc.owner_id) as participating_owners,
  COUNT(rpc.id) as total_contributions
FROM public.reward_pool_balances rpb
LEFT JOIN public.reward_pool_contributions rpc ON rpc.pool_id = rpb.id
WHERE rpb.status = 'collecting'
GROUP BY rpb.id;

COMMENT ON VIEW public.v_current_reward_pool IS 'Estado actual del Reward Pool en collecting';

CREATE OR REPLACE VIEW public.v_fgo_status AS
SELECT 
  f.*,
  (SELECT COUNT(*) FROM public.fgo_claims WHERE status = 'pending') as pending_claims,
  (SELECT COUNT(*) FROM public.fgo_claims WHERE status = 'approved') as approved_claims,
  (SELECT COALESCE(SUM(amount_approved), 0) FROM public.fgo_claims WHERE status = 'paid') as total_paid_claims
FROM public.fgo_fund f;

COMMENT ON VIEW public.v_fgo_status IS 'Estado actual del Fondo de Garantía de Owners';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración Comodato 15-70-15 completada';
  RAISE NOTICE '   Tablas: reward_pool_balances, reward_pool_contributions, reward_pool_payouts';
  RAISE NOTICE '   Tablas: fgo_fund, fgo_contributions, fgo_claims';
  RAISE NOTICE '   RPCs: calculate_payment_split, register_comodato_payment, distribute_monthly_rewards';
  RAISE NOTICE '   Views: v_current_reward_pool, v_fgo_status';
END $$;

COMMIT;
