-- ============================================================================
-- FRAGMENT INVESTMENT SYSTEM
-- Fractional vehicle ownership: 2,000 fragments per BYD Dolphin Mini
-- Integrated with MercadoPago Checkout Pro for real-time purchases
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VEHICLE_ASSETS — The vehicle as an investment instrument
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL UNIQUE,  -- e.g. 'BYD-001'

  -- Vehicle info
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  car_id UUID REFERENCES public.cars(id),  -- link to existing car if any

  -- Fragment pricing (all in USD cents to avoid float)
  purchase_price_cents BIGINT NOT NULL CHECK (purchase_price_cents > 0),
  fragment_price_cents BIGINT NOT NULL CHECK (fragment_price_cents > 0),
  total_fragments INTEGER NOT NULL CHECK (total_fragments > 0),
  max_fragments_per_wallet INTEGER NOT NULL DEFAULT 200 CHECK (max_fragments_per_wallet > 0),

  -- Lifecycle
  target_km BIGINT NOT NULL DEFAULT 1000000 CHECK (target_km > 0),
  current_km BIGINT NOT NULL DEFAULT 0 CHECK (current_km >= 0),
  status TEXT NOT NULL DEFAULT 'fundraising'
    CHECK (status IN ('fundraising', 'funded', 'operational', 'retiring', 'closed')),

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_assets_code ON public.vehicle_assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_vehicle_assets_status ON public.vehicle_assets(status);

CREATE TRIGGER set_vehicle_assets_updated_at
  BEFORE UPDATE ON public.vehicle_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.vehicle_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_assets_select_all"
  ON public.vehicle_assets FOR SELECT USING (true);

CREATE POLICY "vehicle_assets_admin_modify"
  ON public.vehicle_assets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- 2. FRAGMENT_HOLDINGS — Who owns how many fragments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fragment_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  vehicle_asset_id UUID NOT NULL REFERENCES public.vehicle_assets(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, vehicle_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_fragment_holdings_user ON public.fragment_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_fragment_holdings_vehicle ON public.fragment_holdings(vehicle_asset_id);

CREATE TRIGGER set_fragment_holdings_updated_at
  BEFORE UPDATE ON public.fragment_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: users see own, admin sees all, no direct writes
ALTER TABLE public.fragment_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fragment_holdings_select_own"
  ON public.fragment_holdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "fragment_holdings_select_admin"
  ON public.fragment_holdings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));

-- No direct INSERT/UPDATE/DELETE — only via RPCs (SECURITY DEFINER)

-- ============================================================================
-- 3. FRAGMENT_PURCHASES — Immutable purchase log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fragment_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  vehicle_asset_id UUID NOT NULL REFERENCES public.vehicle_assets(id) ON DELETE RESTRICT,

  -- What was bought
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_per_fragment_cents BIGINT NOT NULL CHECK (price_per_fragment_cents > 0),
  total_usd_cents BIGINT NOT NULL CHECK (total_usd_cents > 0),

  -- Exchange rate snapshot
  usd_ars_rate NUMERIC(12, 4) NOT NULL,
  total_ars_cents BIGINT NOT NULL CHECK (total_ars_cents > 0),

  -- MercadoPago
  mp_preference_id TEXT,
  mp_payment_id TEXT UNIQUE,  -- idempotency key

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fragment_purchases_user ON public.fragment_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_fragment_purchases_vehicle ON public.fragment_purchases(vehicle_asset_id);
CREATE INDEX IF NOT EXISTS idx_fragment_purchases_status ON public.fragment_purchases(status);
CREATE INDEX IF NOT EXISTS idx_fragment_purchases_mp_payment ON public.fragment_purchases(mp_payment_id);

-- RLS: users see own, admin sees all
ALTER TABLE public.fragment_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fragment_purchases_select_own"
  ON public.fragment_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "fragment_purchases_select_admin"
  ON public.fragment_purchases FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));

-- ============================================================================
-- 4. VIEW: fragment counts per vehicle (public, for the pitch page counter)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_vehicle_fragment_stats AS
SELECT
  va.id AS vehicle_asset_id,
  va.asset_code,
  va.total_fragments,
  va.fragment_price_cents,
  va.status,
  COALESCE(SUM(fh.quantity), 0)::INTEGER AS fragments_sold,
  (va.total_fragments - COALESCE(SUM(fh.quantity), 0))::INTEGER AS fragments_available
FROM public.vehicle_assets va
LEFT JOIN public.fragment_holdings fh ON fh.vehicle_asset_id = va.id
GROUP BY va.id, va.asset_code, va.total_fragments, va.fragment_price_cents, va.status;

-- Grant select to anon (pitch page reads this without auth)
GRANT SELECT ON public.v_vehicle_fragment_stats TO anon, authenticated;

-- ============================================================================
-- 5. RPC: get_available_fragments
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_available_fragments(p_asset_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_available INTEGER;
BEGIN
  SELECT fragments_available INTO v_available
  FROM public.v_vehicle_fragment_stats
  WHERE asset_code = p_asset_code;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Vehicle asset not found: %', p_asset_code;
  END IF;

  RETURN v_available;
END;
$$;

-- ============================================================================
-- 6. RPC: initiate_fragment_purchase
-- Called by create-fragment-preference Edge Function (auth required)
-- Validates everything, creates pending purchase record
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initiate_fragment_purchase(
  p_user_id UUID,
  p_asset_code TEXT,
  p_quantity INTEGER,
  p_usd_ars_rate NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_vehicle RECORD;
  v_current_holdings INTEGER;
  v_available INTEGER;
  v_total_usd_cents BIGINT;
  v_total_ars_cents BIGINT;
  v_purchase_id UUID;
BEGIN
  -- 1. Validate quantity range
  IF p_quantity < 1 OR p_quantity > 200 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 200, got: %', p_quantity;
  END IF;

  -- 2. Validate exchange rate
  IF p_usd_ars_rate <= 0 THEN
    RAISE EXCEPTION 'Invalid exchange rate: %', p_usd_ars_rate;
  END IF;

  -- 3. Get vehicle (lock row to prevent concurrent oversell)
  SELECT va.id, va.fragment_price_cents, va.max_fragments_per_wallet, va.total_fragments, va.status
  INTO v_vehicle
  FROM public.vehicle_assets va
  WHERE va.asset_code = p_asset_code
  FOR UPDATE;

  IF v_vehicle.id IS NULL THEN
    RAISE EXCEPTION 'Vehicle asset not found: %', p_asset_code;
  END IF;

  IF v_vehicle.status != 'fundraising' THEN
    RAISE EXCEPTION 'Vehicle is not accepting investments (status: %)', v_vehicle.status;
  END IF;

  -- 4. Anti-whale check
  SELECT COALESCE(quantity, 0) INTO v_current_holdings
  FROM public.fragment_holdings
  WHERE user_id = p_user_id AND vehicle_asset_id = v_vehicle.id;

  v_current_holdings := COALESCE(v_current_holdings, 0);

  IF (v_current_holdings + p_quantity) > v_vehicle.max_fragments_per_wallet THEN
    RAISE EXCEPTION 'Would exceed max fragments per wallet (current: %, requesting: %, max: %)',
      v_current_holdings, p_quantity, v_vehicle.max_fragments_per_wallet;
  END IF;

  -- 5. Availability check
  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO v_available
  FROM public.fragment_holdings
  WHERE vehicle_asset_id = v_vehicle.id;

  v_available := v_vehicle.total_fragments - v_available;

  IF p_quantity > v_available THEN
    RAISE EXCEPTION 'Insufficient fragments (available: %, requested: %)',
      v_available, p_quantity;
  END IF;

  -- 6. Calculate amounts
  v_total_usd_cents := v_vehicle.fragment_price_cents * p_quantity;
  v_total_ars_cents := ROUND(v_total_usd_cents * p_usd_ars_rate);

  -- 7. Create purchase record
  INSERT INTO public.fragment_purchases (
    user_id, vehicle_asset_id, quantity,
    price_per_fragment_cents, total_usd_cents,
    usd_ars_rate, total_ars_cents,
    status
  ) VALUES (
    p_user_id, v_vehicle.id, p_quantity,
    v_vehicle.fragment_price_cents, v_total_usd_cents,
    p_usd_ars_rate, v_total_ars_cents,
    'pending'
  )
  RETURNING id INTO v_purchase_id;

  RETURN v_purchase_id;
END;
$$;

-- ============================================================================
-- 7. RPC: confirm_fragment_purchase
-- Called by fragment-purchase-webhook when MercadoPago confirms payment
-- ============================================================================
CREATE OR REPLACE FUNCTION public.confirm_fragment_purchase(
  p_purchase_id UUID,
  p_mp_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_purchase RECORD;
  v_sold INTEGER;
  v_total INTEGER;
BEGIN
  -- 1. Idempotency: if this mp_payment_id was already confirmed, return early
  IF EXISTS (
    SELECT 1 FROM public.fragment_purchases
    WHERE mp_payment_id = p_mp_payment_id AND status = 'completed'
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'already_confirmed',
      'purchase_id', p_purchase_id
    );
  END IF;

  -- 2. Lock purchase row to prevent concurrent processing
  SELECT fp.*, va.total_fragments, va.max_fragments_per_wallet
  INTO v_purchase
  FROM public.fragment_purchases fp
  JOIN public.vehicle_assets va ON va.id = fp.vehicle_asset_id
  WHERE fp.id = p_purchase_id
  FOR UPDATE OF fp;

  IF v_purchase.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'purchase_not_found');
  END IF;

  -- 3. Only confirm pending purchases
  IF v_purchase.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'purchase_not_pending',
      'current_status', v_purchase.status
    );
  END IF;

  -- 4. Final availability check (prevent oversell)
  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO v_sold
  FROM public.fragment_holdings
  WHERE vehicle_asset_id = v_purchase.vehicle_asset_id;

  IF v_purchase.quantity > (v_purchase.total_fragments - v_sold) THEN
    UPDATE public.fragment_purchases
    SET status = 'failed',
        metadata = metadata || '{"failure_reason":"sold_out_at_confirmation"}'::JSONB
    WHERE id = p_purchase_id;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'sold_out',
      'available', v_purchase.total_fragments - v_sold
    );
  END IF;

  -- 5. Upsert fragment_holdings (atomic increment)
  INSERT INTO public.fragment_holdings (user_id, vehicle_asset_id, quantity)
  VALUES (v_purchase.user_id, v_purchase.vehicle_asset_id, v_purchase.quantity)
  ON CONFLICT (user_id, vehicle_asset_id)
  DO UPDATE SET
    quantity = fragment_holdings.quantity + EXCLUDED.quantity,
    updated_at = now();

  -- 6. Mark purchase completed
  UPDATE public.fragment_purchases
  SET status = 'completed',
      mp_payment_id = p_mp_payment_id,
      completed_at = now()
  WHERE id = p_purchase_id;

  -- 7. Auto-transition to 'funded' if all fragments sold
  v_sold := v_sold + v_purchase.quantity;
  IF v_sold >= v_purchase.total_fragments THEN
    UPDATE public.vehicle_assets
    SET status = 'funded'
    WHERE id = v_purchase.vehicle_asset_id AND status = 'fundraising';
  END IF;

  -- 8. Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'confirmed',
    'purchase_id', p_purchase_id,
    'user_id', v_purchase.user_id,
    'quantity', v_purchase.quantity,
    'fragments_sold_total', v_sold
  );
END;
$$;

-- ============================================================================
-- 8. RPC: fail_fragment_purchase (for rejected payments)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fail_fragment_purchase(
  p_purchase_id UUID,
  p_reason TEXT DEFAULT 'payment_rejected'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.fragment_purchases
  SET status = 'failed',
      metadata = metadata || jsonb_build_object('failure_reason', p_reason)
  WHERE id = p_purchase_id AND status = 'pending';
END;
$$;

-- ============================================================================
-- 9. SEED DATA
-- ============================================================================

-- BYD-001: First fractional vehicle
INSERT INTO public.vehicle_assets (
  asset_code, make, model, year,
  purchase_price_cents, fragment_price_cents,
  total_fragments, max_fragments_per_wallet,
  target_km, status, metadata
) VALUES (
  'BYD-001', 'BYD', 'Dolphin Mini', 2026,
  2449000,  -- $24,490 USD in cents
  1250,     -- $12.50 USD in cents
  2000,     -- 2,000 fragments
  200,      -- max 10% per wallet
  1000000,  -- 1M km lifecycle
  'fundraising',
  '{"battery_kwh": 43.2, "range_km": 380, "charge_time_min": 30, "version": "GS"}'::JSONB
) ON CONFLICT (asset_code) DO NOTHING;

-- Exchange rate: managed via environment or external config (remote_config may not exist yet)

COMMIT;
