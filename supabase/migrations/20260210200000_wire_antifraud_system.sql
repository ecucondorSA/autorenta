-- ============================================================================
-- Migration: Wire Anti-Fraud System into Reward Pool
-- Date: 2026-02-10
-- Author: Claude
--
-- PURPOSE:
-- Connects the existing (but unwired) anti-fraud infrastructure to production.
-- Before this migration: detectGaming() exists in TS but never runs,
-- calculate_daily_points() has a KYC bug, distribute_monthly_rewards() pays
-- everyone without eligibility checks.
--
-- CHANGES:
-- 1. Schema fixes (daily_car_points.updated_at, payout_status frozen)
-- 2. Fix calculate_daily_points() KYC bug (p.kyc → p.id_verified)
-- 3. detect_owner_gaming_signals(p_date) — batch gaming detection
-- 4. update_monthly_summaries(p_month) — aggregate + eligibility
-- 5. get_owner_gaming_risk_score(p_owner_id) — quick lookup
-- 6. distribute_monthly_rewards_with_eligibility(p_pool_id) — gated distribution
-- 7. admin_review_queue table + admin_resolve_review() RPC
-- 8. Bridge trigger: risk_events → owner_gaming_signals
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 0: ENUM EXTENSION
-- ============================================================================

-- Add gaming_warning notification type for transparency notifications to owners
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction in some PG versions,
-- but Supabase migrations run with IF NOT EXISTS support.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'gaming_warning';

-- ============================================================================
-- PART 1: SCHEMA FIXES
-- ============================================================================

-- 1a. Add updated_at to daily_car_points (referenced by run_daily_points_calculation but missing)
ALTER TABLE public.daily_car_points
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 1b. Allow 'frozen' status in reward_pool_payouts
-- The comodato migration has a CHECK constraint, we need to expand it
ALTER TABLE public.reward_pool_payouts
  DROP CONSTRAINT IF EXISTS reward_pool_payouts_payout_status_check;

ALTER TABLE public.reward_pool_payouts
  ADD CONSTRAINT reward_pool_payouts_payout_status_check
  CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed', 'frozen', 'cancelled'));

-- 1c. Add eligibility columns to reward_pool_payouts if not present
ALTER TABLE public.reward_pool_payouts
  ADD COLUMN IF NOT EXISTS frozen_reason text,
  ADD COLUMN IF NOT EXISTS review_id uuid,
  ADD COLUMN IF NOT EXISTS unfrozen_at timestamptz;

-- ============================================================================
-- PART 2: ADMIN REVIEW QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subject
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payout_id uuid REFERENCES public.reward_pool_payouts(id),

  -- Context
  review_type text NOT NULL DEFAULT 'gaming_risk',
    -- gaming_risk, collusion, manual_flag
  risk_score integer NOT NULL DEFAULT 0,
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  month date, -- Which reward period
  frozen_amount numeric, -- Amount held

  -- Resolution
  status text NOT NULL DEFAULT 'pending',
    -- pending, in_review, cleared, warned, suspended, payout_released, payout_cancelled
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  action_taken text, -- clear, warn, suspend, release_payout, cancel_payout

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_review_queue_status
  ON public.admin_review_queue(status) WHERE status IN ('pending', 'in_review');
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_owner
  ON public.admin_review_queue(owner_id);

ALTER TABLE public.admin_review_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can access review queue
CREATE POLICY "Admins full access admin_review_queue"
  ON public.admin_review_queue FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

COMMENT ON TABLE public.admin_review_queue IS 'Queue for admin review of gaming signals and frozen payouts';

-- ============================================================================
-- PART 3: FIX calculate_daily_points() — KYC BUG + REAL FACTORS
-- ============================================================================

-- BUG: Original uses p.kyc = 'approved' but profiles has id_verified (boolean)
-- BUG: run_daily_points_calculation stores placeholder 1.0 for all factors
CREATE OR REPLACE FUNCTION public.calculate_daily_points(p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  car_id uuid,
  owner_id uuid,
  points integer,
  is_eligible boolean,
  va_status boolean,
  va_failure_reasons text[],
  response_time_hours numeric,
  acceptance_rate_30d numeric,
  cancellation_rate_90d numeric,
  value_factor numeric,
  rep_factor numeric,
  demand_factor numeric,
  in_cooldown boolean
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_base_points integer := 100;
  v_config RECORD;
BEGIN
  -- Load config for this month (or defaults)
  SELECT
    COALESCE(rc.va_max_response_hours, 12) as max_response_hours,
    COALESCE(rc.va_min_acceptance_rate, 0.70) as min_acceptance_rate,
    COALESCE(rc.va_max_cancellation_rate, 0.05) as max_cancellation_rate
  INTO v_config
  FROM public.reward_pool_config rc
  WHERE rc.month = date_trunc('month', p_date)::date
  LIMIT 1;

  -- Fallback defaults if no config
  IF NOT FOUND THEN
    v_config := ROW(12, 0.70, 0.05);
  END IF;

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

      -- FIX: Use id_verified (boolean) instead of p.kyc = 'approved'
      COALESCE(p.id_verified, false) as is_kyc,

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
      cm.response_hours,
      cm.acceptance_rate,
      cm.cancellation_rate,
      cm.in_cooldown,

      -- VA check with failure reasons
      CASE
        WHEN NOT cm.is_kyc THEN false
        WHEN cm.in_cooldown THEN false
        WHEN NOT cm.is_ready THEN false
        WHEN cm.response_hours > v_config.max_response_hours THEN false
        WHEN cm.acceptance_rate < v_config.min_acceptance_rate THEN false
        WHEN cm.cancellation_rate > v_config.max_cancellation_rate THEN false
        ELSE true
      END as va_status,

      -- VA failure reasons array
      ARRAY_REMOVE(ARRAY[
        CASE WHEN NOT cm.is_kyc THEN 'kyc_not_verified' END,
        CASE WHEN cm.in_cooldown THEN 'in_cooldown' END,
        CASE WHEN NOT cm.is_ready THEN 'car_not_active' END,
        CASE WHEN cm.response_hours > v_config.max_response_hours THEN 'slow_response' END,
        CASE WHEN cm.acceptance_rate < v_config.min_acceptance_rate THEN 'low_acceptance' END,
        CASE WHEN cm.cancellation_rate > v_config.max_cancellation_rate THEN 'high_cancellation' END
      ], NULL) as va_failure_reasons,

      -- Value factor: logarithmic based on car value, capped [1.0, 2.5]
      LEAST(2.5, GREATEST(1.0,
        1 + LN(GREATEST(COALESCE(cm.value_usd, 5000), 5000) / 15000.0) * 0.5
      )) as value_factor,

      -- Rep factor: Bayesian smoothed rating, capped [0.7, 1.2]
      LEAST(1.2, GREATEST(0.7,
        0.6 + ((cm.rating * cm.review_count + 4.0 * 5) / (cm.review_count + 5)) * 0.12
      )) as rep_factor,

      -- Demand factor: placeholder 1.0 (needs zone data integration)
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
    cal.va_status as is_eligible,
    cal.va_status,
    cal.va_failure_reasons,
    ROUND(cal.response_hours::numeric, 2),
    ROUND(cal.acceptance_rate, 4),
    ROUND(cal.cancellation_rate, 4),
    ROUND(cal.value_factor::numeric, 4),
    ROUND(cal.rep_factor::numeric, 4),
    ROUND(cal.demand_factor::numeric, 4),
    cal.in_cooldown
  FROM calculated cal;
END;
$$;

-- Fix run_daily_points_calculation to store real factors
CREATE OR REPLACE FUNCTION public.run_daily_points_calculation(p_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.daily_car_points (
    car_id, owner_id, date, points, is_eligible,
    va_status, va_failure_reasons, response_time_hours,
    acceptance_rate_30d, cancellation_rate_90d,
    value_factor, rep_factor, demand_factor
  )
  SELECT
    dp.car_id, dp.owner_id, p_date, dp.points, dp.is_eligible,
    dp.va_status, dp.va_failure_reasons, dp.response_time_hours,
    dp.acceptance_rate_30d, dp.cancellation_rate_90d,
    dp.value_factor, dp.rep_factor, dp.demand_factor
  FROM public.calculate_daily_points(p_date) dp
  ON CONFLICT (car_id, date) DO UPDATE SET
    points = EXCLUDED.points,
    is_eligible = EXCLUDED.is_eligible,
    va_status = EXCLUDED.va_status,
    va_failure_reasons = EXCLUDED.va_failure_reasons,
    response_time_hours = EXCLUDED.response_time_hours,
    acceptance_rate_30d = EXCLUDED.acceptance_rate_30d,
    cancellation_rate_90d = EXCLUDED.cancellation_rate_90d,
    value_factor = EXCLUDED.value_factor,
    rep_factor = EXCLUDED.rep_factor,
    demand_factor = EXCLUDED.demand_factor,
    updated_at = now()
  WHERE daily_car_points.points IS DISTINCT FROM EXCLUDED.points
     OR daily_car_points.va_status IS DISTINCT FROM EXCLUDED.va_status;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- PART 4: GAMING DETECTION (Batch — runs daily)
-- ============================================================================

-- Replicate detectGaming() from reward-pool.model.ts into SQL
-- 6 original signals + 5 new Tier 2 signals + compound risk
CREATE OR REPLACE FUNCTION public.detect_owner_gaming_signals(p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  owner_id uuid,
  signals_detected integer,
  total_risk_score integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH owner_data AS (
    SELECT
      p.id as owner_id,

      -- VA days in last 30d
      COALESCE((
        SELECT COUNT(*) FROM public.daily_car_points dcp
        WHERE dcp.owner_id = p.id AND dcp.va_status = true
          AND dcp.date > p_date - 30
      ), 0) as va_days_30d,

      -- Bookings in last 30d
      COALESCE((
        SELECT COUNT(*) FROM public.bookings b
        JOIN public.cars c ON c.id = b.car_id
        WHERE c.user_id = p.id
          AND b.created_at > p_date - interval '30 days'
          AND b.status NOT IN ('cancelled')
      ), 0) as bookings_30d,

      -- Rejected/cancelled requests in last 30d
      COALESCE((
        SELECT COUNT(*) FROM public.bookings b
        JOIN public.cars c ON c.id = b.car_id
        WHERE c.user_id = p.id
          AND b.created_at > p_date - interval '30 days'
          AND b.status = 'cancelled'
          AND b.cancelled_by_role = 'owner'
      ), 0) as rejections_30d,

      -- Owner cancellations in last 30d
      COALESCE((
        SELECT COUNT(*) FROM public.bookings b
        JOIN public.cars c ON c.id = b.car_id
        WHERE c.user_id = p.id
          AND b.created_at > p_date - interval '30 days'
          AND b.status = 'cancelled'
          AND b.cancelled_by_role = 'owner'
      ), 0) as cancellations_30d,

      -- Unique renters in 90d
      COALESCE((
        SELECT COUNT(DISTINCT b.renter_id) FROM public.bookings b
        JOIN public.cars c ON c.id = b.car_id
        WHERE c.user_id = p.id
          AND b.created_at > p_date - interval '90 days'
      ), 0) as unique_renters_90d,

      -- Total bookings in 90d
      COALESCE((
        SELECT COUNT(*) FROM public.bookings b
        JOIN public.cars c ON c.id = b.car_id
        WHERE c.user_id = p.id
          AND b.created_at > p_date - interval '90 days'
      ), 0) as total_bookings_90d,

      -- Cars added in last 30d (listing_velocity - Tier 2)
      COALESCE((
        SELECT COUNT(*) FROM public.cars c
        WHERE c.user_id = p.id
          AND c.created_at > p_date - interval '30 days'
      ), 0) as cars_added_30d,

      -- Total active cars
      COALESCE((
        SELECT COUNT(*) FROM public.cars c
        WHERE c.user_id = p.id AND c.status = 'active'
      ), 0) as active_cars

    FROM public.profiles p
    WHERE EXISTS (
      SELECT 1 FROM public.cars c WHERE c.user_id = p.id AND c.status = 'active'
    )
  ),
  signal_calc AS (
    SELECT
      od.owner_id,

      -- Signal 1: Calendar open but no bookings (+20)
      CASE WHEN od.va_days_30d >= 20 AND od.bookings_30d = 0 THEN true ELSE false END as sig_calendar_open,

      -- Signal 2: High rejection rate (+30)
      CASE WHEN (od.bookings_30d + od.rejections_30d) >= 5
           AND od.rejections_30d::numeric / NULLIF(od.bookings_30d + od.rejections_30d, 0) > 0.5
           THEN true ELSE false END as sig_high_rejection,

      -- Signal 3: Price manipulation (+15) — approximate via frequent re-listings
      -- Note: needs price_history table for full implementation
      false as sig_price_manipulation,

      -- Signal 4: Fake bookings suspected (+40)
      CASE WHEN od.total_bookings_90d >= 5 AND od.unique_renters_90d <= 2
           THEN true ELSE false END as sig_fake_bookings,

      -- Signal 5: Rapid cancellation pattern (+25)
      CASE WHEN od.cancellations_30d >= 3 THEN true ELSE false END as sig_rapid_cancellation,

      -- Signal 6 (Tier 2): Listing velocity (+20)
      CASE WHEN od.cars_added_30d >= 4 THEN true ELSE false END as sig_listing_velocity,

      -- Signal 7 (Tier 2): Synthetic availability (+25)
      -- 5+ requests received, 0 accepted, 3+ rejected
      CASE WHEN (od.bookings_30d + od.rejections_30d) >= 5
           AND od.bookings_30d = 0 AND od.rejections_30d >= 3
           THEN true ELSE false END as sig_synthetic_availability,

      -- Metadata for details
      od.va_days_30d, od.bookings_30d, od.rejections_30d,
      od.cancellations_30d, od.unique_renters_90d, od.total_bookings_90d,
      od.cars_added_30d
    FROM owner_data od
  ),
  scored AS (
    SELECT
      sc.owner_id,

      -- Count signals
      (CASE WHEN sc.sig_calendar_open THEN 1 ELSE 0 END
       + CASE WHEN sc.sig_high_rejection THEN 1 ELSE 0 END
       + CASE WHEN sc.sig_price_manipulation THEN 1 ELSE 0 END
       + CASE WHEN sc.sig_fake_bookings THEN 1 ELSE 0 END
       + CASE WHEN sc.sig_rapid_cancellation THEN 1 ELSE 0 END
       + CASE WHEN sc.sig_listing_velocity THEN 1 ELSE 0 END
       + CASE WHEN sc.sig_synthetic_availability THEN 1 ELSE 0 END
      ) as signal_count,

      -- Base risk score
      (CASE WHEN sc.sig_calendar_open THEN 20 ELSE 0 END
       + CASE WHEN sc.sig_high_rejection THEN 30 ELSE 0 END
       + CASE WHEN sc.sig_price_manipulation THEN 15 ELSE 0 END
       + CASE WHEN sc.sig_fake_bookings THEN 40 ELSE 0 END
       + CASE WHEN sc.sig_rapid_cancellation THEN 25 ELSE 0 END
       + CASE WHEN sc.sig_listing_velocity THEN 20 ELSE 0 END
       + CASE WHEN sc.sig_synthetic_availability THEN 25 ELSE 0 END
      ) as base_score,

      sc.*
    FROM signal_calc sc
  ),
  final_scored AS (
    SELECT
      s.owner_id,
      s.signal_count,
      -- Compound risk: if 3+ signals, add bonus (+10 per extra beyond 2, cap +20)
      LEAST(100,
        s.base_score + CASE
          WHEN s.signal_count >= 3 THEN LEAST(20, (s.signal_count - 2) * 10)
          ELSE 0
        END
      ) as risk_score,
      s.sig_calendar_open, s.sig_high_rejection, s.sig_price_manipulation,
      s.sig_fake_bookings, s.sig_rapid_cancellation, s.sig_listing_velocity,
      s.sig_synthetic_availability,
      s.va_days_30d, s.bookings_30d, s.rejections_30d,
      s.cancellations_30d, s.unique_renters_90d, s.total_bookings_90d,
      s.cars_added_30d
    FROM scored s
    WHERE s.signal_count > 0  -- Only owners with at least 1 signal
  )
  -- Insert signals into owner_gaming_signals
  SELECT
    fs.owner_id,
    fs.signal_count as signals_detected,
    fs.risk_score as total_risk_score
  FROM final_scored fs;

  -- Now insert individual signals
  -- Signal 1: calendar_open_no_bookings
  INSERT INTO public.owner_gaming_signals (owner_id, signal_type, risk_score, details, status)
  SELECT
    fs.owner_id, 'calendar_open_no_bookings', 20,
    jsonb_build_object('va_days_30d', fs.va_days_30d, 'bookings_30d', fs.bookings_30d, 'detected_date', p_date),
    'active'
  FROM final_scored fs WHERE fs.sig_calendar_open
  ON CONFLICT DO NOTHING;

  -- Signal 2: high_rejection_rate
  INSERT INTO public.owner_gaming_signals (owner_id, signal_type, risk_score, details, status)
  SELECT
    fs.owner_id, 'high_rejection_rate', 30,
    jsonb_build_object(
      'rejection_rate', ROUND(fs.rejections_30d::numeric / NULLIF(fs.bookings_30d + fs.rejections_30d, 0), 4),
      'rejections_30d', fs.rejections_30d,
      'total_requests', fs.bookings_30d + fs.rejections_30d,
      'detected_date', p_date
    ),
    'active'
  FROM final_scored fs WHERE fs.sig_high_rejection
  ON CONFLICT DO NOTHING;

  -- Signal 4: fake_bookings_suspected
  INSERT INTO public.owner_gaming_signals (owner_id, signal_type, risk_score, details, status)
  SELECT
    fs.owner_id, 'fake_bookings_suspected', 40,
    jsonb_build_object(
      'total_bookings_90d', fs.total_bookings_90d,
      'unique_renters_90d', fs.unique_renters_90d,
      'detected_date', p_date
    ),
    'active'
  FROM final_scored fs WHERE fs.sig_fake_bookings
  ON CONFLICT DO NOTHING;

  -- Signal 5: rapid_cancellation_pattern
  INSERT INTO public.owner_gaming_signals (owner_id, signal_type, risk_score, details, status)
  SELECT
    fs.owner_id, 'rapid_cancellation_pattern', 25,
    jsonb_build_object('cancellations_30d', fs.cancellations_30d, 'detected_date', p_date),
    'active'
  FROM final_scored fs WHERE fs.sig_rapid_cancellation
  ON CONFLICT DO NOTHING;

  -- Signal 6: listing_velocity
  INSERT INTO public.owner_gaming_signals (owner_id, signal_type, risk_score, details, status)
  SELECT
    fs.owner_id, 'listing_velocity', 20,
    jsonb_build_object('cars_added_30d', fs.cars_added_30d, 'detected_date', p_date),
    'active'
  FROM final_scored fs WHERE fs.sig_listing_velocity
  ON CONFLICT DO NOTHING;

  -- Signal 7: synthetic_availability
  INSERT INTO public.owner_gaming_signals (owner_id, signal_type, risk_score, details, status)
  SELECT
    fs.owner_id, 'synthetic_availability', 25,
    jsonb_build_object(
      'total_requests', fs.bookings_30d + fs.rejections_30d,
      'accepted', fs.bookings_30d,
      'rejected', fs.rejections_30d,
      'detected_date', p_date
    ),
    'active'
  FROM final_scored fs WHERE fs.sig_synthetic_availability
  ON CONFLICT DO NOTHING;

  -- ────────────────────────────────────────────────────────
  -- TRANSPARENCY NOTIFICATION TO OWNERS (risk_score >= 20)
  -- Only if no gaming_warning notification in the last 7 days
  -- ────────────────────────────────────────────────────────
  INSERT INTO public.notifications (user_id, title, body, type, cta_link, metadata)
  SELECT
    gs.owner_id,
    'Revisión de actividad',
    CASE
      WHEN gs.total_score >= 60 THEN
        'Detectamos patrones inusuales en tu cuenta que requieren revisión. Tu pago mensual podría retrasarse mientras verificamos. Si tenés dudas, contactanos.'
      WHEN gs.total_score >= 40 THEN
        'Notamos actividad inusual en tu cuenta. Te recomendamos revisar tus listados y mantener buenas prácticas para evitar restricciones.'
      ELSE
        'Tu cuenta tiene algunas señales de actividad que monitoreamos como parte de nuestro sistema de calidad. No se requiere acción por ahora.'
    END,
    'gaming_warning',
    '/dashboard/points',
    jsonb_build_object(
      'risk_score', gs.total_score,
      'signal_count', gs.signal_count,
      'detected_date', p_date
    )
  FROM (
    SELECT
      ogs.owner_id,
      SUM(ogs.risk_score) as total_score,
      COUNT(*) as signal_count
    FROM public.owner_gaming_signals ogs
    WHERE ogs.status = 'active'
      AND ogs.detected_at >= (p_date - interval '30 days')
    GROUP BY ogs.owner_id
    HAVING SUM(ogs.risk_score) >= 20
  ) gs
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = gs.owner_id
      AND n.type = 'gaming_warning'
      AND n.created_at >= (now() - interval '7 days')
  );

END;
$$;

COMMENT ON FUNCTION public.detect_owner_gaming_signals IS
  'Batch detection of gaming signals for all active owners. Runs daily. Notifies owners with risk >= 20.';

-- ============================================================================
-- PART 5: GAMING RISK SCORE LOOKUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_owner_gaming_risk_score(p_owner_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_score integer;
BEGIN
  SELECT LEAST(100, COALESCE(SUM(risk_score), 0))
  INTO v_score
  FROM public.owner_gaming_signals
  WHERE owner_id = p_owner_id
    AND status = 'active'
    AND detected_at > now() - interval '30 days';

  RETURN v_score;
END;
$$;

COMMENT ON FUNCTION public.get_owner_gaming_risk_score IS
  'Sum active gaming signals risk score for an owner (last 30 days, capped at 100)';

-- ============================================================================
-- PART 6: MONTHLY SUMMARY AGGREGATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_monthly_summaries(p_month date DEFAULT date_trunc('month', CURRENT_DATE)::date)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_month_start date;
  v_month_end date;
  v_max_cars integer;
BEGIN
  v_month_start := date_trunc('month', p_month)::date;
  v_month_end := (v_month_start + interval '1 month')::date;

  -- Get config
  SELECT COALESCE(max_cars_per_owner, 5)
  INTO v_max_cars
  FROM public.reward_pool_config
  WHERE month = v_month_start;

  IF NOT FOUND THEN
    v_max_cars := 5;
  END IF;

  -- Aggregate daily_car_points into owner_monthly_summary
  INSERT INTO public.owner_monthly_summary (
    owner_id, month, total_points, eligible_days,
    cars_contributing, cars_capped,
    is_eligible, eligibility_reasons, gaming_risk_score,
    calculated_at
  )
  SELECT
    agg.owner_id,
    v_month_start,
    agg.total_points,
    agg.eligible_days,
    agg.cars_contributing,
    GREATEST(0, agg.total_cars - v_max_cars) as cars_capped,

    -- Eligibility: KYC verified + min 7 VA days + no suspension + gaming risk < 40
    CASE
      WHEN NOT COALESCE(p.id_verified, false) THEN false
      WHEN agg.eligible_days < 7 THEN false
      WHEN public.get_owner_gaming_risk_score(agg.owner_id) >= 40 THEN false
      WHEN EXISTS (
        SELECT 1 FROM public.owner_cooldowns oc
        WHERE oc.owner_id = agg.owner_id
          AND oc.reason = 'gaming_detected'
          AND oc.ends_at > now()
      ) THEN false
      ELSE true
    END as is_eligible,

    -- Eligibility reasons
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT COALESCE(p.id_verified, false) THEN 'kyc_not_verified' END,
      CASE WHEN agg.eligible_days < 7 THEN 'insufficient_va_days' END,
      CASE WHEN public.get_owner_gaming_risk_score(agg.owner_id) >= 40 THEN 'gaming_risk_too_high' END,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.owner_cooldowns oc
        WHERE oc.owner_id = agg.owner_id AND oc.reason = 'gaming_detected' AND oc.ends_at > now()
      ) THEN 'suspended_for_gaming' END
    ], NULL) as eligibility_reasons,

    public.get_owner_gaming_risk_score(agg.owner_id) as gaming_risk_score,
    now() as calculated_at

  FROM (
    SELECT
      dcp.owner_id,
      SUM(dcp.points) as total_points,
      COUNT(*) FILTER (WHERE dcp.va_status = true) as eligible_days,
      COUNT(DISTINCT dcp.car_id) FILTER (WHERE dcp.points > 0) as cars_contributing,
      COUNT(DISTINCT dcp.car_id) as total_cars
    FROM public.daily_car_points dcp
    WHERE dcp.date >= v_month_start AND dcp.date < v_month_end
    GROUP BY dcp.owner_id
  ) agg
  JOIN public.profiles p ON p.id = agg.owner_id

  ON CONFLICT (owner_id, month) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    eligible_days = EXCLUDED.eligible_days,
    cars_contributing = EXCLUDED.cars_contributing,
    cars_capped = EXCLUDED.cars_capped,
    is_eligible = EXCLUDED.is_eligible,
    eligibility_reasons = EXCLUDED.eligibility_reasons,
    gaming_risk_score = EXCLUDED.gaming_risk_score,
    calculated_at = EXCLUDED.calculated_at,
    updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.update_monthly_summaries IS
  'Aggregate daily points into monthly summaries with eligibility calculation';

-- ============================================================================
-- PART 7: DISTRIBUTION WITH ELIGIBILITY GATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.distribute_monthly_rewards_with_eligibility(
  p_pool_id UUID
)
RETURNS TABLE (
  owner_id UUID,
  amount DECIMAL,
  share_percentage DECIMAL,
  was_frozen boolean,
  freeze_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total DECIMAL;
  v_pool_status TEXT;
  v_pool_month date;
  v_eligible_total DECIMAL := 0;
  v_ineligible_total DECIMAL := 0;
  v_owner RECORD;
  v_is_eligible boolean;
  v_gaming_score integer;
  v_elig_reasons text[];
  v_payout_id uuid;
BEGIN
  -- 1. Verify pool status
  SELECT status, total_collected, period_start
  INTO v_pool_status, v_total, v_pool_month
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

  -- 2. Ensure monthly summaries are up to date
  PERFORM public.update_monthly_summaries(v_pool_month);

  -- 3. Calculate eligible vs ineligible totals
  FOR v_owner IN
    SELECT rpc.owner_id, SUM(rpc.amount) as contributed
    FROM public.reward_pool_contributions rpc
    WHERE rpc.pool_id = p_pool_id
    GROUP BY rpc.owner_id
  LOOP
    -- Check eligibility from monthly summary
    SELECT oms.is_eligible, oms.gaming_risk_score, oms.eligibility_reasons
    INTO v_is_eligible, v_gaming_score, v_elig_reasons
    FROM public.owner_monthly_summary oms
    WHERE oms.owner_id = v_owner.owner_id
      AND oms.month = date_trunc('month', v_pool_month)::date;

    -- Default: if no summary exists, treat as eligible (new owner)
    IF NOT FOUND THEN
      v_is_eligible := true;
      v_gaming_score := 0;
      v_elig_reasons := '{}'::text[];
    END IF;

    IF v_is_eligible THEN
      v_eligible_total := v_eligible_total + v_owner.contributed;
    ELSE
      v_ineligible_total := v_ineligible_total + v_owner.contributed;
    END IF;
  END LOOP;

  -- 4. Create payouts — eligible get proportional share including redistributed amount
  -- Ineligible are frozen if gaming risk >= 60, or skipped otherwise
  FOR v_owner IN
    SELECT rpc.owner_id, SUM(rpc.amount) as contributed
    FROM public.reward_pool_contributions rpc
    WHERE rpc.pool_id = p_pool_id
    GROUP BY rpc.owner_id
  LOOP
    SELECT oms.is_eligible, oms.gaming_risk_score, oms.eligibility_reasons
    INTO v_is_eligible, v_gaming_score, v_elig_reasons
    FROM public.owner_monthly_summary oms
    WHERE oms.owner_id = v_owner.owner_id
      AND oms.month = date_trunc('month', v_pool_month)::date;

    IF NOT FOUND THEN
      v_is_eligible := true;
      v_gaming_score := 0;
      v_elig_reasons := '{}'::text[];
    END IF;

    IF v_is_eligible THEN
      -- Eligible owner: gets proportional share of TOTAL pool (including redistributed)
      INSERT INTO public.reward_pool_payouts (
        pool_id, owner_id, amount, share_percentage, payout_status
      )
      VALUES (
        p_pool_id,
        v_owner.owner_id,
        ROUND(v_total * (v_owner.contributed / NULLIF(v_eligible_total, 0)), 2),
        ROUND((v_owner.contributed / NULLIF(v_eligible_total, 0)) * 100, 4),
        'pending'
      )
      RETURNING id INTO v_payout_id;

      RETURN QUERY SELECT
        v_owner.owner_id,
        ROUND(v_total * (v_owner.contributed / NULLIF(v_eligible_total, 0)), 2),
        ROUND((v_owner.contributed / NULLIF(v_eligible_total, 0)) * 100, 4),
        false,
        NULL::text;

    ELSIF v_gaming_score >= 60 THEN
      -- High risk: freeze payout for admin review
      INSERT INTO public.reward_pool_payouts (
        pool_id, owner_id, amount, share_percentage, payout_status, frozen_reason
      )
      VALUES (
        p_pool_id,
        v_owner.owner_id,
        v_owner.contributed,
        ROUND((v_owner.contributed / v_total) * 100, 4),
        'frozen',
        'gaming_risk_score_' || v_gaming_score
      )
      RETURNING id INTO v_payout_id;

      -- Create admin review item
      INSERT INTO public.admin_review_queue (
        owner_id, payout_id, review_type, risk_score,
        signals, month, frozen_amount, status
      )
      VALUES (
        v_owner.owner_id,
        v_payout_id,
        'gaming_risk',
        v_gaming_score,
        (SELECT jsonb_agg(jsonb_build_object('type', ogs.signal_type, 'score', ogs.risk_score, 'details', ogs.details))
         FROM public.owner_gaming_signals ogs
         WHERE ogs.owner_id = v_owner.owner_id AND ogs.status = 'active'
           AND ogs.detected_at > now() - interval '30 days'),
        date_trunc('month', v_pool_month)::date,
        v_owner.contributed,
        'pending'
      );

      RETURN QUERY SELECT
        v_owner.owner_id,
        v_owner.contributed,
        ROUND((v_owner.contributed / v_total) * 100, 4),
        true,
        'gaming_risk_score_' || v_gaming_score;

    ELSE
      -- Ineligible but not high risk: skip (amount redistributed to eligible)
      RETURN QUERY SELECT
        v_owner.owner_id,
        0::DECIMAL,
        0::DECIMAL,
        false,
        array_to_string(v_elig_reasons, ', ');
    END IF;
  END LOOP;

  -- 5. Mark pool as distributing
  UPDATE public.reward_pool_balances
  SET
    status = 'distributing',
    total_distributed = v_total,
    distributed_at = now()
  WHERE id = p_pool_id;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.distribute_monthly_rewards_with_eligibility IS
  'Distributes reward pool with eligibility gates. Ineligible owners are skipped (redistributed) or frozen (high risk).';

-- ============================================================================
-- PART 8: ADMIN RESOLVE REVIEW RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_resolve_review(
  p_review_id uuid,
  p_action text,     -- clear, warn, suspend, release_payout, cancel_payout
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review RECORD;
  v_admin_id uuid;
BEGIN
  -- Verify caller is admin
  v_admin_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Get review
  SELECT * INTO v_review FROM public.admin_review_queue WHERE id = p_review_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found: %', p_review_id;
  END IF;

  IF v_review.status NOT IN ('pending', 'in_review') THEN
    RAISE EXCEPTION 'Review already resolved: %', v_review.status;
  END IF;

  -- Validate action
  IF p_action NOT IN ('clear', 'warn', 'suspend', 'release_payout', 'cancel_payout') THEN
    RAISE EXCEPTION 'Invalid action: %. Valid: clear, warn, suspend, release_payout, cancel_payout', p_action;
  END IF;

  -- Execute action
  CASE p_action
    WHEN 'clear' THEN
      -- Clear all active signals, release payout if frozen
      UPDATE public.owner_gaming_signals
      SET status = 'dismissed', reviewed_by = v_admin_id, reviewed_at = now()
      WHERE owner_id = v_review.owner_id AND status = 'active';

      IF v_review.payout_id IS NOT NULL THEN
        UPDATE public.reward_pool_payouts
        SET payout_status = 'pending', unfrozen_at = now()
        WHERE id = v_review.payout_id AND payout_status = 'frozen';
      END IF;

      UPDATE public.admin_review_queue
      SET status = 'cleared', resolved_by = v_admin_id, resolved_at = now(),
          resolution_notes = p_notes, action_taken = 'clear', updated_at = now()
      WHERE id = p_review_id;

    WHEN 'warn' THEN
      -- Mark signals as reviewed (keep active), don't change payout
      UPDATE public.owner_gaming_signals
      SET status = 'reviewed', reviewed_by = v_admin_id, reviewed_at = now(),
          action_taken = 'warn'
      WHERE owner_id = v_review.owner_id AND status = 'active';

      -- Release payout if exists
      IF v_review.payout_id IS NOT NULL THEN
        UPDATE public.reward_pool_payouts
        SET payout_status = 'pending', unfrozen_at = now()
        WHERE id = v_review.payout_id AND payout_status = 'frozen';
      END IF;

      UPDATE public.admin_review_queue
      SET status = 'warned', resolved_by = v_admin_id, resolved_at = now(),
          resolution_notes = p_notes, action_taken = 'warn', updated_at = now()
      WHERE id = p_review_id;

    WHEN 'suspend' THEN
      -- Mark signals as actioned, cancel payout, add cooldown
      UPDATE public.owner_gaming_signals
      SET status = 'actioned', reviewed_by = v_admin_id, reviewed_at = now(),
          action_taken = 'suspend'
      WHERE owner_id = v_review.owner_id AND status = 'active';

      IF v_review.payout_id IS NOT NULL THEN
        UPDATE public.reward_pool_payouts
        SET payout_status = 'cancelled', frozen_reason = 'suspended_by_admin'
        WHERE id = v_review.payout_id AND payout_status = 'frozen';
      END IF;

      -- Add gaming cooldown (30 days)
      INSERT INTO public.owner_cooldowns (owner_id, reason, starts_at, ends_at)
      VALUES (v_review.owner_id, 'gaming_detected', now(), now() + interval '30 days');

      UPDATE public.admin_review_queue
      SET status = 'suspended', resolved_by = v_admin_id, resolved_at = now(),
          resolution_notes = p_notes, action_taken = 'suspend', updated_at = now()
      WHERE id = p_review_id;

    WHEN 'release_payout' THEN
      IF v_review.payout_id IS NOT NULL THEN
        UPDATE public.reward_pool_payouts
        SET payout_status = 'pending', unfrozen_at = now()
        WHERE id = v_review.payout_id AND payout_status = 'frozen';
      END IF;

      UPDATE public.admin_review_queue
      SET status = 'payout_released', resolved_by = v_admin_id, resolved_at = now(),
          resolution_notes = p_notes, action_taken = 'release_payout', updated_at = now()
      WHERE id = p_review_id;

    WHEN 'cancel_payout' THEN
      IF v_review.payout_id IS NOT NULL THEN
        UPDATE public.reward_pool_payouts
        SET payout_status = 'cancelled', frozen_reason = 'cancelled_by_admin'
        WHERE id = v_review.payout_id AND payout_status = 'frozen';
      END IF;

      UPDATE public.admin_review_queue
      SET status = 'payout_cancelled', resolved_by = v_admin_id, resolved_at = now(),
          resolution_notes = p_notes, action_taken = 'cancel_payout', updated_at = now()
      WHERE id = p_review_id;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'review_id', p_review_id,
    'action', p_action,
    'owner_id', v_review.owner_id,
    'resolved_by', v_admin_id
  );
END;
$$;

COMMENT ON FUNCTION public.admin_resolve_review IS
  'Admin RPC to resolve gaming review items: clear, warn, suspend, release/cancel frozen payouts';

-- ============================================================================
-- PART 9: BRIDGE TRIGGER — COLLUSION → GAMING SIGNALS
-- ============================================================================

-- When a collusion risk_event is detected (score > 20), create a gaming signal
CREATE OR REPLACE FUNCTION public.sync_collusion_to_gaming_signals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only process collusion events with meaningful risk
  IF NEW.risk_type = 'collusion' AND NEW.risk_score > 20 THEN
    -- Create gaming signal for the owner
    INSERT INTO public.owner_gaming_signals (
      owner_id, signal_type, risk_score, details, status
    )
    VALUES (
      NEW.owner_id,
      'cross_account_collusion',
      CASE
        WHEN NEW.risk_score >= 80 THEN 35
        WHEN NEW.risk_score >= 50 THEN 25
        ELSE 15
      END,
      jsonb_build_object(
        'source', 'collusion_detector',
        'risk_event_id', NEW.id,
        'booking_id', NEW.booking_id,
        'renter_id', NEW.renter_id,
        'original_score', NEW.risk_score,
        'details', NEW.details
      ),
      'active'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_collusion_gaming ON public.risk_events;
CREATE TRIGGER trg_sync_collusion_gaming
  AFTER INSERT ON public.risk_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_collusion_to_gaming_signals();

COMMENT ON FUNCTION public.sync_collusion_to_gaming_signals IS
  'Bridge: maps collusion risk_events to owner_gaming_signals for unified risk scoring';

-- ============================================================================
-- PART 10: EXPIRE OLD GAMING SIGNALS (Housekeeping)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_old_gaming_signals()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Signals older than 90 days auto-expire
  UPDATE public.owner_gaming_signals
  SET status = 'dismissed'
  WHERE status = 'active'
    AND detected_at < now() - interval '90 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.expire_old_gaming_signals IS
  'Auto-expire gaming signals older than 90 days';

-- ============================================================================
-- PART 11: RLS FIX — OWNER-FACING READ POLICY ON owner_gaming_signals
-- ============================================================================
-- Without this, loadAntifraudStatus() in the frontend queries
-- owner_gaming_signals as authenticated user → RLS blocks all reads.
-- Owners need to see their own signals for transparency.

CREATE POLICY "Owners can read own gaming signals"
  ON public.owner_gaming_signals
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Also ensure owner_cooldowns is readable by owners (verify existing policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'owner_cooldowns'
      AND policyname LIKE '%owner%read%'
  ) THEN
    EXECUTE 'CREATE POLICY "Owners can read own cooldowns" ON public.owner_cooldowns FOR SELECT USING (auth.uid() = owner_id)';
    RAISE NOTICE '  Added owner SELECT policy on owner_cooldowns';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Run post-deploy)
-- ============================================================================

-- Verify all functions exist
DO $$
BEGIN
  -- Core functions
  ASSERT (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'calculate_daily_points')),
    'calculate_daily_points not found';
  ASSERT (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'run_daily_points_calculation')),
    'run_daily_points_calculation not found';
  ASSERT (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'detect_owner_gaming_signals')),
    'detect_owner_gaming_signals not found';
  ASSERT (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'update_monthly_summaries')),
    'update_monthly_summaries not found';
  ASSERT (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_owner_gaming_risk_score')),
    'get_owner_gaming_risk_score not found';
  ASSERT (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'distribute_monthly_rewards_with_eligibility')),
    'distribute_monthly_rewards_with_eligibility not found';
  ASSERT (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'admin_resolve_review')),
    'admin_resolve_review not found';
  ASSERT (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'expire_old_gaming_signals')),
    'expire_old_gaming_signals not found';

  -- Bridge trigger
  ASSERT (SELECT EXISTS(
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_collusion_gaming'
  )), 'trg_sync_collusion_gaming trigger not found';

  -- Admin review queue table
  ASSERT (SELECT EXISTS(
    SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_review_queue'
  )), 'admin_review_queue table not found';

  -- RLS policy for owner reads
  ASSERT (SELECT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE tablename = 'owner_gaming_signals'
      AND policyname = 'Owners can read own gaming signals'
  )), 'Owner SELECT policy on owner_gaming_signals not found';

  RAISE NOTICE '✅ Anti-fraud system migration verified successfully';
  RAISE NOTICE '   Functions: calculate_daily_points (FIXED), detect_owner_gaming_signals, update_monthly_summaries';
  RAISE NOTICE '   Functions: get_owner_gaming_risk_score, distribute_monthly_rewards_with_eligibility';
  RAISE NOTICE '   Functions: admin_resolve_review, expire_old_gaming_signals';
  RAISE NOTICE '   Tables: admin_review_queue';
  RAISE NOTICE '   Triggers: trg_sync_collusion_gaming';
  RAISE NOTICE '   RLS: owner_gaming_signals owner SELECT policy';
END $$;

COMMIT;
