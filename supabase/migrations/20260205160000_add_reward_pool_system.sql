-- ============================================================================
-- Migration: Reward Pool System (Senior Implementation)
-- Date: 2026-02-05
-- Author: Claude
--
-- ARQUITECTURA:
-- - Pool distribuido POR AUTO (no por owner)
-- - Fórmula MULTIPLICATIVA con Verified Availability (VA)
-- - Anti-gaming: caps, cooldowns, detection
--
-- TABLES:
-- 1. daily_car_points - Puntos diarios por auto
-- 2. owner_monthly_summary - Resumen mensual por owner
-- 3. reward_pool_payouts - Pagos ejecutados
-- 4. owner_gaming_signals - Señales de gaming detectadas
-- 5. owner_cooldowns - Cooldowns activos por cancelaciones
-- ============================================================================

-- 1. Tabla de puntos diarios por auto
CREATE TABLE IF NOT EXISTS public.daily_car_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,

  -- Points calculation
  points integer NOT NULL DEFAULT 0,
  base_points integer NOT NULL DEFAULT 100,
  is_eligible boolean NOT NULL DEFAULT false,

  -- VA (Verified Availability) status
  va_status boolean NOT NULL DEFAULT false,
  va_failure_reasons text[] DEFAULT '{}',
  is_ready_to_book boolean NOT NULL DEFAULT false,
  response_time_hours numeric,
  acceptance_rate_30d numeric NOT NULL DEFAULT 0,
  cancellation_rate_90d numeric NOT NULL DEFAULT 0,
  price_deviation_pct numeric,

  -- Factors (multiplicative)
  value_factor numeric NOT NULL DEFAULT 1.0,
  rep_factor numeric NOT NULL DEFAULT 1.0,
  demand_factor numeric NOT NULL DEFAULT 1.0,

  -- Metadata
  formula text, -- Human readable formula explanation
  created_at timestamptz DEFAULT now(),

  UNIQUE(car_id, date)
);

-- Index for monthly aggregations
CREATE INDEX IF NOT EXISTS idx_daily_car_points_owner_date
  ON public.daily_car_points(owner_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_car_points_date
  ON public.daily_car_points(date);

-- 2. Resumen mensual por owner (agregado)
CREATE TABLE IF NOT EXISTS public.owner_monthly_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month date NOT NULL, -- First day of month (2026-02-01)

  -- Points
  total_points integer NOT NULL DEFAULT 0,
  eligible_days integer NOT NULL DEFAULT 0,
  cars_contributing integer NOT NULL DEFAULT 0,
  cars_capped integer NOT NULL DEFAULT 0, -- Cars excluded due to MAX_CARS limit

  -- Share calculation
  raw_share numeric NOT NULL DEFAULT 0, -- Before cap
  capped_share numeric NOT NULL DEFAULT 0, -- After MAX_SHARE cap
  points_used integer NOT NULL DEFAULT 0,

  -- Payout
  payout_usd numeric NOT NULL DEFAULT 0,
  payout_status text NOT NULL DEFAULT 'pending', -- pending, calculated, paid, failed

  -- Eligibility
  is_eligible boolean NOT NULL DEFAULT false,
  eligibility_reasons text[] DEFAULT '{}',
  gaming_risk_score integer DEFAULT 0,

  -- Timestamps
  calculated_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(owner_id, month)
);

CREATE INDEX IF NOT EXISTS idx_owner_monthly_summary_month
  ON public.owner_monthly_summary(month);

-- 3. Registro de pagos de reward pool
CREATE TABLE IF NOT EXISTS public.reward_pool_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Amounts
  amount_usd numeric NOT NULL,
  amount_ars numeric, -- Converted at payout time
  fx_rate numeric, -- FX rate used

  -- Payment details
  payment_method text NOT NULL DEFAULT 'wallet', -- wallet, bank_transfer
  wallet_transaction_id uuid REFERENCES public.wallet_ledger(id),

  -- Status
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  error_message text,

  -- Timestamps
  scheduled_at timestamptz,
  processed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),

  UNIQUE(month, owner_id)
);

-- 4. Señales de gaming detectadas
CREATE TABLE IF NOT EXISTS public.owner_gaming_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  detected_at timestamptz DEFAULT now(),

  -- Detection
  signal_type text NOT NULL, -- calendar_open_no_bookings, high_rejection_rate, etc.
  risk_score integer NOT NULL DEFAULT 0,
  details jsonb, -- Additional context

  -- Resolution
  status text NOT NULL DEFAULT 'active', -- active, reviewed, dismissed, actioned
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  action_taken text, -- warn, suspend, none
  notes text
);

CREATE INDEX IF NOT EXISTS idx_owner_gaming_signals_owner
  ON public.owner_gaming_signals(owner_id, status);

-- 5. Cooldowns activos (por cancelaciones de owner)
CREATE TABLE IF NOT EXISTS public.owner_cooldowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  car_id uuid REFERENCES public.cars(id) ON DELETE CASCADE, -- NULL = all cars

  -- Cooldown details
  reason text NOT NULL, -- owner_cancellation, gaming_detected, manual
  booking_id uuid REFERENCES public.bookings(id),

  -- Duration
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,

  -- Status
  is_active boolean GENERATED ALWAYS AS (ends_at > now()) STORED,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_cooldowns_active
  ON public.owner_cooldowns(owner_id, car_id) WHERE is_active = true;

-- 6. Configuración del pool mensual
CREATE TABLE IF NOT EXISTS public.reward_pool_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,

  -- Pool size
  total_pool_usd numeric NOT NULL,
  source text NOT NULL DEFAULT 'comodato_15', -- 15% of bookings

  -- Caps
  max_cars_per_owner integer NOT NULL DEFAULT 5,
  max_share_per_owner numeric NOT NULL DEFAULT 0.15,

  -- VA thresholds
  va_max_response_hours integer NOT NULL DEFAULT 12,
  va_min_acceptance_rate numeric NOT NULL DEFAULT 0.70,
  va_max_cancellation_rate numeric NOT NULL DEFAULT 0.05,

  -- Status
  status text NOT NULL DEFAULT 'open', -- open, calculating, distributed, closed
  distributed_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to check if owner is in cooldown for a specific car
CREATE OR REPLACE FUNCTION public.is_in_cooldown(
  p_owner_id uuid,
  p_car_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.owner_cooldowns
    WHERE owner_id = p_owner_id
      AND (car_id IS NULL OR car_id = p_car_id)
      AND ends_at > now()
  );
END;
$$;

-- Function to add cooldown after owner cancellation
CREATE OR REPLACE FUNCTION public.add_cancellation_cooldown()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  -- Only trigger on status change to 'cancelled' by owner
  IF NEW.status = 'cancelled' AND NEW.cancelled_by_role = 'owner' THEN
    -- Get owner_id from car
    SELECT user_id INTO v_owner_id
    FROM public.cars
    WHERE id = NEW.car_id;

    IF v_owner_id IS NOT NULL THEN
      INSERT INTO public.owner_cooldowns (
        owner_id,
        car_id,
        reason,
        booking_id,
        starts_at,
        ends_at
      ) VALUES (
        v_owner_id,
        NEW.car_id,
        'owner_cancellation',
        NEW.id,
        now(),
        now() + interval '14 days'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for cooldown on owner cancellation
DROP TRIGGER IF EXISTS trg_add_cancellation_cooldown ON public.bookings;
CREATE TRIGGER trg_add_cancellation_cooldown
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.add_cancellation_cooldown();

-- Function to calculate daily points for all cars
CREATE OR REPLACE FUNCTION public.calculate_daily_points(p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  car_id uuid,
  owner_id uuid,
  points integer,
  is_eligible boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_points integer := 100;
BEGIN
  RETURN QUERY
  WITH car_metrics AS (
    SELECT
      c.id as car_id,
      c.user_id as owner_id,
      c.value_usd,
      c.status = 'active' as is_ready,

      -- Response time (avg of last 30 days)
      COALESCE((
        SELECT AVG(EXTRACT(EPOCH FROM (b.updated_at - b.created_at)) / 3600)
        FROM public.bookings b
        WHERE b.car_id = c.id
          AND b.created_at > p_date - interval '30 days'
          AND b.status IN ('confirmed', 'cancelled')
      ), 6) as response_hours,

      -- Acceptance rate (30 days)
      COALESCE((
        SELECT COUNT(*) FILTER (WHERE status = 'confirmed')::numeric /
               NULLIF(COUNT(*), 0)
        FROM public.bookings
        WHERE car_id = c.id
          AND created_at > p_date - interval '30 days'
      ), 1.0) as acceptance_rate,

      -- Owner cancellation rate (90 days)
      COALESCE((
        SELECT COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by_role = 'owner')::numeric /
               NULLIF(COUNT(*), 0)
        FROM public.bookings
        WHERE car_id = c.id
          AND created_at > p_date - interval '90 days'
      ), 0) as cancellation_rate,

      -- Owner reputation
      COALESCE(p.rating_avg, 4.0) as rating,
      COALESCE(p.rating_count, 0) as review_count,
      p.kyc = 'approved' as is_kyc,

      -- Cooldown check
      public.is_in_cooldown(c.user_id, c.id) as in_cooldown

    FROM public.cars c
    JOIN public.profiles p ON p.id = c.user_id
    WHERE c.status = 'active'
  ),
  calculated AS (
    SELECT
      cm.car_id,
      cm.owner_id,

      -- VA check
      CASE
        WHEN NOT cm.is_kyc THEN false
        WHEN cm.in_cooldown THEN false
        WHEN NOT cm.is_ready THEN false
        WHEN cm.response_hours > 12 THEN false
        WHEN cm.acceptance_rate < 0.70 THEN false
        WHEN cm.cancellation_rate > 0.05 THEN false
        ELSE true
      END as va_status,

      -- Value factor (logarithmic, capped at 2.5)
      LEAST(2.5, GREATEST(1.0,
        1 + LN(GREATEST(cm.value_usd, 5000) / 15000.0) * 0.5
      )) as value_factor,

      -- Rep factor (Bayesian smoothed)
      LEAST(1.2, GREATEST(0.7,
        0.6 + ((cm.rating * cm.review_count + 4.0 * 5) / (cm.review_count + 5)) * 0.12
      )) as rep_factor,

      -- Demand factor (placeholder - needs zone data)
      1.0 as demand_factor

    FROM car_metrics cm
  )
  SELECT
    cal.car_id,
    cal.owner_id,
    CASE
      WHEN cal.va_status THEN
        ROUND(v_base_points * cal.value_factor * cal.rep_factor * cal.demand_factor)::integer
      ELSE 0
    END as points,
    cal.va_status as is_eligible
  FROM calculated cal;
END;
$$;

-- Function to run daily points calculation and store results
CREATE OR REPLACE FUNCTION public.run_daily_points_calculation(p_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Insert or update daily points
  INSERT INTO public.daily_car_points (
    car_id,
    owner_id,
    date,
    points,
    is_eligible,
    va_status,
    value_factor,
    rep_factor,
    demand_factor
  )
  SELECT
    car_id,
    owner_id,
    p_date,
    points,
    is_eligible,
    is_eligible as va_status,
    1.0 as value_factor, -- Will be calculated properly in full implementation
    1.0 as rep_factor,
    1.0 as demand_factor
  FROM public.calculate_daily_points(p_date)
  ON CONFLICT (car_id, date) DO UPDATE SET
    points = EXCLUDED.points,
    is_eligible = EXCLUDED.is_eligible,
    va_status = EXCLUDED.va_status,
    updated_at = now()
  WHERE daily_car_points.points IS DISTINCT FROM EXCLUDED.points;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.daily_car_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_monthly_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_pool_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_gaming_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_pool_config ENABLE ROW LEVEL SECURITY;

-- Owners can see their own data
CREATE POLICY "Owners can view own daily points"
  ON public.daily_car_points FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can view own monthly summary"
  ON public.owner_monthly_summary FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can view own payouts"
  ON public.reward_pool_payouts FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can view own cooldowns"
  ON public.owner_cooldowns FOR SELECT
  USING (owner_id = auth.uid());

-- Config is public read
CREATE POLICY "Anyone can view pool config"
  ON public.reward_pool_config FOR SELECT
  USING (true);

-- Admins can do everything
CREATE POLICY "Admins full access daily_car_points"
  ON public.daily_car_points FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins full access owner_monthly_summary"
  ON public.owner_monthly_summary FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins full access reward_pool_payouts"
  ON public.reward_pool_payouts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins full access owner_gaming_signals"
  ON public.owner_gaming_signals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins full access owner_cooldowns"
  ON public.owner_cooldowns FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins full access reward_pool_config"
  ON public.reward_pool_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.daily_car_points IS 'Daily reward pool points per car - multiplicative formula with VA gate';
COMMENT ON TABLE public.owner_monthly_summary IS 'Monthly aggregated points and payout share per owner';
COMMENT ON TABLE public.reward_pool_payouts IS 'Executed reward pool payments';
COMMENT ON TABLE public.owner_gaming_signals IS 'Detected gaming behavior signals for review';
COMMENT ON TABLE public.owner_cooldowns IS 'Cooldown periods where cars cannot earn points';
COMMENT ON TABLE public.reward_pool_config IS 'Monthly reward pool configuration and thresholds';

COMMENT ON FUNCTION public.is_in_cooldown IS 'Check if owner/car is in cooldown period';
COMMENT ON FUNCTION public.calculate_daily_points IS 'Calculate daily points for all active cars';
COMMENT ON FUNCTION public.run_daily_points_calculation IS 'Execute and store daily points calculation';
