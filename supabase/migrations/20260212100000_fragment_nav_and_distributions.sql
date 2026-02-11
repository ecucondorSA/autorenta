-- ============================================================================
-- PHASE 2: NAV Snapshots, Per-Booking Distributions, Portfolio View
--
-- Depends on: 20260212000000_fragment_investment_system.sql (Phase 1)
--
-- Creates:
--   Tables: vehicle_asset_nav_snapshots, fragment_distributions, fragment_distribution_payouts
--   RPCs: distribute_booking_to_fragments, calculate_vehicle_nav
--   View: v_my_fragment_portfolio (security_invoker)
--   Trigger: on_booking_complete_distribute_fragments
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VEHICLE_ASSET_NAV_SNAPSHOTS — Monthly NAV per vehicle
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_asset_nav_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_asset_id UUID NOT NULL REFERENCES public.vehicle_assets(id) ON DELETE RESTRICT,
  period TEXT NOT NULL,  -- 'YYYY-MM' e.g. '2026-03'

  -- Assets (USD cents)
  vehicle_market_value_cents BIGINT NOT NULL,
  cash_balance_cents BIGINT NOT NULL DEFAULT 0,
  reserve_fund_cents BIGINT NOT NULL DEFAULT 0,

  -- Liabilities (USD cents)
  pending_maintenance_cents BIGINT NOT NULL DEFAULT 0,
  pending_claims_cents BIGINT NOT NULL DEFAULT 0,
  depreciation_cents BIGINT NOT NULL DEFAULT 0,

  -- Calculated (GENERATED columns — DB guarantees consistency)
  nav_total_cents BIGINT GENERATED ALWAYS AS (
    vehicle_market_value_cents + cash_balance_cents + reserve_fund_cents
    - pending_maintenance_cents - pending_claims_cents - depreciation_cents
  ) STORED,

  total_fragments INTEGER NOT NULL,
  nav_per_fragment_cents BIGINT GENERATED ALWAYS AS (
    CASE WHEN total_fragments > 0 THEN
      (vehicle_market_value_cents + cash_balance_cents + reserve_fund_cents
       - pending_maintenance_cents - pending_claims_cents - depreciation_cents)
      / total_fragments
    ELSE 0 END
  ) STORED,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_asset_id, period)
);

CREATE INDEX IF NOT EXISTS idx_nav_snapshots_vehicle
  ON public.vehicle_asset_nav_snapshots(vehicle_asset_id);
CREATE INDEX IF NOT EXISTS idx_nav_snapshots_period
  ON public.vehicle_asset_nav_snapshots(vehicle_asset_id, period DESC);

ALTER TABLE public.vehicle_asset_nav_snapshots ENABLE ROW LEVEL SECURITY;

-- Everyone can read NAV data (public transparency)
CREATE POLICY "nav_snapshots_select_all"
  ON public.vehicle_asset_nav_snapshots FOR SELECT USING (true);

-- Only admins can write NAV snapshots
CREATE POLICY "nav_snapshots_admin_modify"
  ON public.vehicle_asset_nav_snapshots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));

GRANT SELECT ON public.vehicle_asset_nav_snapshots TO anon, authenticated;

-- ============================================================================
-- 2. FRAGMENT_DISTRIBUTIONS — Per-booking distribution log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fragment_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_asset_id UUID NOT NULL REFERENCES public.vehicle_assets(id) ON DELETE RESTRICT,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,

  -- Total distributed to all holders
  total_distributed_cents BIGINT NOT NULL CHECK (total_distributed_cents > 0),
  currency TEXT NOT NULL DEFAULT 'ARS',

  -- Snapshot at distribution time
  total_fragments_snapshot INTEGER NOT NULL,
  amount_per_fragment_cents BIGINT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id)  -- 1 distribution per booking (idempotency)
);

CREATE INDEX IF NOT EXISTS idx_frag_dist_vehicle
  ON public.fragment_distributions(vehicle_asset_id);
CREATE INDEX IF NOT EXISTS idx_frag_dist_created
  ON public.fragment_distributions(created_at DESC);

ALTER TABLE public.fragment_distributions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can see distributions (transparency for holders)
CREATE POLICY "frag_dist_select_authenticated"
  ON public.fragment_distributions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- No direct writes — only via RPC (SECURITY DEFINER)

GRANT SELECT ON public.fragment_distributions TO authenticated;

-- ============================================================================
-- 3. FRAGMENT_DISTRIBUTION_PAYOUTS — Individual holder payouts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fragment_distribution_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID NOT NULL REFERENCES public.fragment_distributions(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  fragments_held INTEGER NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'ARS',

  -- Link to wallet ledger entry
  wallet_ledger_ref TEXT,

  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'failed')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frag_payouts_dist
  ON public.fragment_distribution_payouts(distribution_id);
CREATE INDEX IF NOT EXISTS idx_frag_payouts_user
  ON public.fragment_distribution_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_frag_payouts_user_created
  ON public.fragment_distribution_payouts(user_id, created_at DESC);

ALTER TABLE public.fragment_distribution_payouts ENABLE ROW LEVEL SECURITY;

-- Users see their own payouts
CREATE POLICY "frag_payouts_select_own"
  ON public.fragment_distribution_payouts FOR SELECT
  USING (auth.uid() = user_id);

-- Admin sees all
CREATE POLICY "frag_payouts_select_admin"
  ON public.fragment_distribution_payouts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));

GRANT SELECT ON public.fragment_distribution_payouts TO authenticated;

-- ============================================================================
-- 4. RPC: distribute_booking_to_fragments
--    Called by trigger when a booking completes for a fragment vehicle.
--    Splits the reward pool proportionally among fragment holders.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.distribute_booking_to_fragments(
  p_booking_id UUID,
  p_reward_pool_cents BIGINT,
  p_currency TEXT DEFAULT 'ARS'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_booking RECORD;
  v_vehicle_asset RECORD;
  v_holding RECORD;
  v_total_held INTEGER;
  v_distribution_id UUID;
  v_amount_per_fragment BIGINT;
  v_payout_amount BIGINT;
  v_distributed_total BIGINT := 0;
  v_payout_count INTEGER := 0;
  v_ledger_ref TEXT;
BEGIN
  -- 1. Get booking
  SELECT b.id, b.car_id, b.status
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'booking_not_found');
  END IF;

  -- 2. Find vehicle_asset linked to this car
  SELECT va.*
  INTO v_vehicle_asset
  FROM public.vehicle_assets va
  WHERE va.car_id = v_booking.car_id;

  IF v_vehicle_asset.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'skipped_no_vehicle_asset');
  END IF;

  IF v_vehicle_asset.status NOT IN ('operational', 'funded') THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'skipped_not_operational',
      'vehicle_status', v_vehicle_asset.status
    );
  END IF;

  -- 3. Idempotency: already distributed for this booking?
  IF EXISTS (SELECT 1 FROM public.fragment_distributions WHERE booking_id = p_booking_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'already_distributed');
  END IF;

  -- 4. Get total fragments held
  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO v_total_held
  FROM public.fragment_holdings
  WHERE vehicle_asset_id = v_vehicle_asset.id;

  IF v_total_held = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'no_holders');
  END IF;

  -- 5. Calculate per-fragment amount (floor division — remainder stays in pool)
  v_amount_per_fragment := p_reward_pool_cents / v_total_held;

  IF v_amount_per_fragment = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'amount_too_small',
      'reward_pool_cents', p_reward_pool_cents,
      'total_fragments', v_total_held
    );
  END IF;

  -- 6. Create distribution record
  INSERT INTO public.fragment_distributions (
    vehicle_asset_id, booking_id,
    total_distributed_cents, currency,
    total_fragments_snapshot, amount_per_fragment_cents
  ) VALUES (
    v_vehicle_asset.id, p_booking_id,
    v_amount_per_fragment * v_total_held, p_currency,
    v_total_held, v_amount_per_fragment
  )
  RETURNING id INTO v_distribution_id;

  -- 7. Create individual payouts + wallet credits
  FOR v_holding IN
    SELECT user_id, quantity
    FROM public.fragment_holdings
    WHERE vehicle_asset_id = v_vehicle_asset.id
    ORDER BY user_id
  LOOP
    v_payout_amount := v_amount_per_fragment * v_holding.quantity;
    v_ledger_ref := 'frag_dist_' || v_distribution_id || '_' || v_holding.user_id;

    -- Create payout record
    INSERT INTO public.fragment_distribution_payouts (
      distribution_id, user_id,
      fragments_held, amount_cents, currency,
      wallet_ledger_ref, status
    ) VALUES (
      v_distribution_id, v_holding.user_id,
      v_holding.quantity, v_payout_amount, p_currency,
      v_ledger_ref, 'completed'
    );

    -- Credit wallet via ledger (idempotent via unique ref)
    INSERT INTO public.wallet_ledger (
      user_id, kind, amount_cents, ref, booking_id, meta
    ) VALUES (
      v_holding.user_id,
      'bonus',  -- fragment distribution credited as bonus (ledger_kind enum)
      v_payout_amount,
      v_ledger_ref,
      p_booking_id,
      jsonb_build_object(
        'source', 'fragment_distribution',
        'distribution_id', v_distribution_id,
        'vehicle_asset', v_vehicle_asset.asset_code,
        'fragments_held', v_holding.quantity,
        'total_fragments', v_total_held,
        'amount_per_fragment_cents', v_amount_per_fragment
      )
    )
    ON CONFLICT (ref) DO NOTHING;

    v_distributed_total := v_distributed_total + v_payout_amount;
    v_payout_count := v_payout_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'distributed',
    'distribution_id', v_distribution_id,
    'total_distributed_cents', v_distributed_total,
    'holders_paid', v_payout_count,
    'amount_per_fragment_cents', v_amount_per_fragment
  );
END;
$$;

-- ============================================================================
-- 5. RPC: calculate_vehicle_nav
--    Called monthly (admin or cron) to snapshot NAV.
--    p_vehicle_market_value_cents = FIPE-equivalent mark-to-market.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_vehicle_nav(
  p_vehicle_asset_id UUID,
  p_period TEXT,
  p_vehicle_market_value_cents BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_vehicle RECORD;
  v_cash_balance BIGINT;
  v_reserve_fund BIGINT;
  v_depreciation BIGINT;
  v_nav_id UUID;
  v_nav_total BIGINT;
  v_nav_per_fragment BIGINT;
BEGIN
  -- 1. Get vehicle asset
  SELECT * INTO v_vehicle
  FROM public.vehicle_assets
  WHERE id = p_vehicle_asset_id;

  IF v_vehicle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'vehicle_not_found');
  END IF;

  -- 2. Cash balance: sum of distributions in this period (earned income)
  SELECT COALESCE(SUM(total_distributed_cents), 0)::BIGINT INTO v_cash_balance
  FROM public.fragment_distributions
  WHERE vehicle_asset_id = p_vehicle_asset_id
    AND created_at >= (p_period || '-01')::DATE
    AND created_at < ((p_period || '-01')::DATE + INTERVAL '1 month');

  -- 3. Reserve fund: admin-managed (default 0, can be updated post-snapshot)
  v_reserve_fund := 0;

  -- 4. Depreciation: linear km-based
  --    depreciation = purchase_price * (current_km / target_km)
  IF v_vehicle.target_km > 0 AND v_vehicle.current_km > 0 THEN
    v_depreciation := (v_vehicle.purchase_price_cents * v_vehicle.current_km) / v_vehicle.target_km;
  ELSE
    v_depreciation := 0;
  END IF;

  -- 5. Upsert NAV snapshot (idempotent via UNIQUE(vehicle_asset_id, period))
  INSERT INTO public.vehicle_asset_nav_snapshots (
    vehicle_asset_id, period,
    vehicle_market_value_cents, cash_balance_cents, reserve_fund_cents,
    pending_maintenance_cents, pending_claims_cents, depreciation_cents,
    total_fragments
  ) VALUES (
    p_vehicle_asset_id, p_period,
    p_vehicle_market_value_cents, v_cash_balance, v_reserve_fund,
    0, 0, v_depreciation,
    v_vehicle.total_fragments
  )
  ON CONFLICT (vehicle_asset_id, period) DO UPDATE SET
    vehicle_market_value_cents = EXCLUDED.vehicle_market_value_cents,
    cash_balance_cents = EXCLUDED.cash_balance_cents,
    reserve_fund_cents = EXCLUDED.reserve_fund_cents,
    depreciation_cents = EXCLUDED.depreciation_cents,
    total_fragments = EXCLUDED.total_fragments
  RETURNING id, nav_total_cents, nav_per_fragment_cents
  INTO v_nav_id, v_nav_total, v_nav_per_fragment;

  -- 6. Update primary price if NAV is higher (fundraising vehicles only)
  IF v_vehicle.status = 'fundraising' AND v_nav_per_fragment > v_vehicle.fragment_price_cents THEN
    UPDATE public.vehicle_assets
    SET fragment_price_cents = v_nav_per_fragment + (v_nav_per_fragment * 5 / 100)  -- NAV + 5% premium
    WHERE id = p_vehicle_asset_id AND status = 'fundraising';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'nav_id', v_nav_id,
    'period', p_period,
    'nav_total_cents', v_nav_total,
    'nav_per_fragment_cents', v_nav_per_fragment,
    'depreciation_cents', v_depreciation,
    'cash_balance_cents', v_cash_balance
  );
END;
$$;

-- ============================================================================
-- 6. VIEW: v_my_fragment_portfolio
--    security_invoker = true ensures RLS on underlying tables is checked
--    against the calling user, not the view owner.
-- ============================================================================
DROP VIEW IF EXISTS public.v_my_fragment_portfolio;
CREATE VIEW public.v_my_fragment_portfolio
WITH (security_invoker = true)
AS
SELECT
  fh.user_id,
  fh.vehicle_asset_id,
  va.asset_code,
  va.make || ' ' || va.model AS vehicle_name,
  va.year AS vehicle_year,
  va.status AS vehicle_status,
  fh.quantity,
  va.fragment_price_cents AS purchase_price_cents,
  nav.nav_per_fragment_cents AS current_nav_cents,
  nav.period AS nav_period,
  COALESCE(dist.total_received_cents, 0)::BIGINT AS total_distributions_cents,
  COALESCE(dist.distribution_count, 0)::INTEGER AS distribution_count,
  fh.created_at AS held_since
FROM public.fragment_holdings fh
JOIN public.vehicle_assets va ON va.id = fh.vehicle_asset_id
LEFT JOIN LATERAL (
  SELECT nav_per_fragment_cents, period
  FROM public.vehicle_asset_nav_snapshots
  WHERE vehicle_asset_id = fh.vehicle_asset_id
  ORDER BY period DESC LIMIT 1
) nav ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(fdp.amount_cents) AS total_received_cents,
    COUNT(fdp.id) AS distribution_count
  FROM public.fragment_distribution_payouts fdp
  WHERE fdp.user_id = fh.user_id
    AND fdp.distribution_id IN (
      SELECT id FROM public.fragment_distributions
      WHERE vehicle_asset_id = fh.vehicle_asset_id
    )
) dist ON true;

GRANT SELECT ON public.v_my_fragment_portfolio TO authenticated;

-- ============================================================================
-- 7. TRIGGER: Auto-distribute on booking completion
--    Zero-touch: fires for ALL bookings, but only distributes when the
--    booking's car has a linked vehicle_asset in operational/funded status.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_fragment_distribution()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_reward_rate NUMERIC;
  v_reward_pool_cents BIGINT;
  v_result JSONB;
BEGIN
  -- Only fire on transition TO 'completed'
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Quick check: does this car have a linked vehicle_asset?
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_assets va
    WHERE va.car_id = NEW.car_id
      AND va.status IN ('operational', 'funded')
  ) THEN
    RETURN NEW;  -- Normal booking, not a fragment vehicle
  END IF;

  -- Read reward pool rate from remote_config (default 70%)
  SELECT COALESCE(
    (SELECT value::NUMERIC FROM public.remote_config
     WHERE key = 'REWARD_POOL_RATE' LIMIT 1),
    0.70
  ) INTO v_reward_rate;

  -- Calculate reward pool in ARS cents
  -- bookings.total_price is ARS full units (e.g., 15000.00)
  v_reward_pool_cents := ROUND(COALESCE(NEW.total_price, 0) * v_reward_rate * 100)::BIGINT;

  IF v_reward_pool_cents <= 0 THEN
    RETURN NEW;
  END IF;

  -- Distribute to fragment holders
  v_result := public.distribute_booking_to_fragments(
    NEW.id,
    v_reward_pool_cents,
    COALESCE(NEW.currency, 'ARS')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_complete_distribute_fragments ON public.bookings;
CREATE TRIGGER on_booking_complete_distribute_fragments
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.trigger_fragment_distribution();

COMMIT;
