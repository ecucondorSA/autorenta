-- =============================================
-- DYNAMIC PRICING SYSTEM FOR AUTORENTAR
-- Inspired by Uber/Airbnb surge pricing
-- =============================================

-- 1. Regional pricing configuration (multi-city support)
CREATE TABLE IF NOT EXISTS public.pricing_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "Buenos Aires", "Montevideo", "São Paulo"
  country_code TEXT NOT NULL, -- "AR", "UY", "BR"
  currency TEXT NOT NULL, -- "ARS", "USD", "BRL"
  base_price_per_hour DECIMAL(10,2) NOT NULL, -- Base hourly rate
  fuel_cost_multiplier DECIMAL(5,3) DEFAULT 1.0, -- Adjust for local fuel prices
  inflation_rate DECIMAL(5,3) DEFAULT 0.0, -- Monthly inflation adjustment
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Day-of-week pricing factors
CREATE TABLE IF NOT EXISTS public.pricing_day_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES public.pricing_regions(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  factor DECIMAL(5,3) NOT NULL DEFAULT 0.0, -- Percentage adjustment (-0.15 to +0.25)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(region_id, day_of_week)
);

-- 3. Hour-of-day pricing factors
CREATE TABLE IF NOT EXISTS public.pricing_hour_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES public.pricing_regions(id) ON DELETE CASCADE,
  hour_start INT NOT NULL CHECK (hour_start BETWEEN 0 AND 23),
  hour_end INT NOT NULL CHECK (hour_end BETWEEN 0 AND 23),
  factor DECIMAL(5,3) NOT NULL DEFAULT 0.0, -- Percentage adjustment
  description TEXT, -- "Peak hours", "Night discount", etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User type pricing factors
CREATE TABLE IF NOT EXISTS public.pricing_user_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL, -- "new", "frequent", "verified", "premium"
  factor DECIMAL(5,3) NOT NULL DEFAULT 0.0,
  min_rentals INT, -- Minimum rentals to qualify
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_type)
);

-- 5. Demand snapshot (updated by cron job every 15 min)
CREATE TABLE IF NOT EXISTS public.pricing_demand_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES public.pricing_regions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  available_cars INT NOT NULL DEFAULT 0,
  active_bookings INT NOT NULL DEFAULT 0,
  pending_requests INT NOT NULL DEFAULT 0,
  demand_ratio DECIMAL(5,3) NOT NULL DEFAULT 1.0, -- requests / available_cars
  surge_factor DECIMAL(5,3) NOT NULL DEFAULT 0.0, -- Calculated surge multiplier
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast demand lookups
CREATE INDEX IF NOT EXISTS idx_demand_snapshots_region_time
ON public.pricing_demand_snapshots(region_id, timestamp DESC);

-- 6. Special events (holidays, concerts, weather)
CREATE TABLE IF NOT EXISTS public.pricing_special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES public.pricing_regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Carnaval", "Copa América", "Heavy Rain"
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  factor DECIMAL(5,3) NOT NULL DEFAULT 0.15, -- Additional surge
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Pricing calculation log (audit trail)
CREATE TABLE IF NOT EXISTS public.pricing_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  region_id UUID REFERENCES public.pricing_regions(id) ON DELETE SET NULL,
  base_price DECIMAL(10,2) NOT NULL,
  day_factor DECIMAL(5,3) NOT NULL,
  hour_factor DECIMAL(5,3) NOT NULL,
  user_factor DECIMAL(5,3) NOT NULL,
  demand_factor DECIMAL(5,3) NOT NULL,
  event_factor DECIMAL(5,3) NOT NULL DEFAULT 0.0,
  final_price DECIMAL(10,2) NOT NULL,
  calculation_details JSONB, -- Full breakdown for transparency
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RPC FUNCTION: Calculate dynamic price
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(
  p_region_id UUID,
  p_user_id UUID,
  p_rental_start TIMESTAMPTZ,
  p_rental_hours INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_price DECIMAL(10,2);
  v_currency TEXT;
  v_day_factor DECIMAL(5,3) := 0.0;
  v_hour_factor DECIMAL(5,3) := 0.0;
  v_user_factor DECIMAL(5,3) := 0.0;
  v_demand_factor DECIMAL(5,3) := 0.0;
  v_event_factor DECIMAL(5,3) := 0.0;
  v_final_price DECIMAL(10,2);
  v_user_rentals INT;
  v_dow INT; -- Day of week
  v_hour INT; -- Hour of day
BEGIN
  -- 1. Get base price for region
  SELECT base_price_per_hour, currency
  INTO v_base_price, v_currency
  FROM public.pricing_regions
  WHERE id = p_region_id AND active = true;

  IF v_base_price IS NULL THEN
    RAISE EXCEPTION 'Region not found or inactive';
  END IF;

  -- 2. Get day factor
  v_dow := EXTRACT(DOW FROM p_rental_start); -- 0=Sunday, 6=Saturday
  SELECT COALESCE(factor, 0.0)
  INTO v_day_factor
  FROM public.pricing_day_factors
  WHERE region_id = p_region_id AND day_of_week = v_dow;

  -- 3. Get hour factor
  v_hour := EXTRACT(HOUR FROM p_rental_start);
  SELECT COALESCE(factor, 0.0)
  INTO v_hour_factor
  FROM public.pricing_hour_factors
  WHERE region_id = p_region_id
    AND hour_start <= v_hour
    AND hour_end >= v_hour
  LIMIT 1;

  -- 4. Get user factor (based on rental history)
  SELECT COUNT(*)
  INTO v_user_rentals
  FROM public.bookings
  WHERE renter_id = p_user_id AND status = 'completed';

  IF v_user_rentals = 0 THEN
    -- New user
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'new';
  ELSIF v_user_rentals >= 10 THEN
    -- Frequent user
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'frequent';
  ELSIF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND identity_verified = true
  ) THEN
    -- Verified user
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'verified';
  END IF;

  -- 5. Get demand factor (latest snapshot)
  SELECT COALESCE(surge_factor, 0.0)
  INTO v_demand_factor
  FROM public.pricing_demand_snapshots
  WHERE region_id = p_region_id
  ORDER BY timestamp DESC
  LIMIT 1;

  -- 6. Check for special events
  SELECT COALESCE(SUM(factor), 0.0)
  INTO v_event_factor
  FROM public.pricing_special_events
  WHERE region_id = p_region_id
    AND active = true
    AND p_rental_start BETWEEN start_date AND end_date;

  -- 7. Calculate final price
  v_final_price := v_base_price * (1 + v_day_factor + v_hour_factor + v_user_factor + v_demand_factor + v_event_factor);

  -- Apply min/max caps (2.0 to 4.0 times base)
  v_final_price := GREATEST(v_base_price * 0.8, LEAST(v_final_price, v_base_price * 1.6));

  -- Round to nearest 0.10
  v_final_price := ROUND(v_final_price / 0.1) * 0.1;

  -- Return full breakdown
  RETURN jsonb_build_object(
    'price_per_hour', v_final_price,
    'total_price', v_final_price * p_rental_hours,
    'currency', v_currency,
    'breakdown', jsonb_build_object(
      'base_price', v_base_price,
      'day_factor', v_day_factor,
      'hour_factor', v_hour_factor,
      'user_factor', v_user_factor,
      'demand_factor', v_demand_factor,
      'event_factor', v_event_factor,
      'total_multiplier', (1 + v_day_factor + v_hour_factor + v_user_factor + v_demand_factor + v_event_factor)
    ),
    'details', jsonb_build_object(
      'user_rentals', v_user_rentals,
      'day_of_week', v_dow,
      'hour_of_day', v_hour
    )
  );
END;
$$;

-- =============================================
-- RPC FUNCTION: Update demand snapshot (cron job)
-- =============================================
CREATE OR REPLACE FUNCTION public.update_demand_snapshot(p_region_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_available_cars INT;
  v_active_bookings INT;
  v_pending_requests INT;
  v_demand_ratio DECIMAL(5,3);
  v_surge_factor DECIMAL(5,3);
BEGIN
  -- Count available cars in region
  SELECT COUNT(*)
  INTO v_available_cars
  FROM public.cars
  WHERE region_id = p_region_id AND status = 'active';

  -- Count active bookings
  SELECT COUNT(*)
  INTO v_active_bookings
  FROM public.bookings b
  JOIN public.cars c ON b.car_id = c.id
  WHERE c.region_id = p_region_id
    AND b.status IN ('confirmed', 'in_progress');

  -- Count pending requests (last 2 hours)
  SELECT COUNT(*)
  INTO v_pending_requests
  FROM public.bookings b
  JOIN public.cars c ON b.car_id = c.id
  WHERE c.region_id = p_region_id
    AND b.status = 'pending'
    AND b.created_at > NOW() - INTERVAL '2 hours';

  -- Calculate demand ratio
  IF v_available_cars > 0 THEN
    v_demand_ratio := (v_active_bookings + v_pending_requests)::DECIMAL / v_available_cars;
  ELSE
    v_demand_ratio := 0.0;
  END IF;

  -- Calculate surge factor
  IF v_demand_ratio > 1.5 THEN
    v_surge_factor := 0.25; -- High demand
  ELSIF v_demand_ratio > 1.2 THEN
    v_surge_factor := 0.15; -- Medium-high demand
  ELSIF v_demand_ratio < 0.8 THEN
    v_surge_factor := -0.10; -- Low demand (discount)
  ELSE
    v_surge_factor := 0.0; -- Normal
  END IF;

  -- Insert snapshot
  INSERT INTO public.pricing_demand_snapshots (
    region_id,
    available_cars,
    active_bookings,
    pending_requests,
    demand_ratio,
    surge_factor
  ) VALUES (
    p_region_id,
    v_available_cars,
    v_active_bookings,
    v_pending_requests,
    v_demand_ratio,
    v_surge_factor
  );
END;
$$;

-- =============================================
-- SEED DATA: Default pricing configuration
-- =============================================

-- Insert default regions
INSERT INTO public.pricing_regions (name, country_code, currency, base_price_per_hour) VALUES
  ('Montevideo', 'UY', 'USD', 2.50),
  ('Buenos Aires', 'AR', 'ARS', 500.00),
  ('São Paulo', 'BR', 'BRL', 15.00)
ON CONFLICT DO NOTHING;

-- Insert day factors (same for all regions initially)
DO $$
DECLARE
  v_region RECORD;
BEGIN
  FOR v_region IN SELECT id FROM public.pricing_regions LOOP
    INSERT INTO public.pricing_day_factors (region_id, day_of_week, factor) VALUES
      (v_region.id, 0, 0.10), -- Sunday +10%
      (v_region.id, 1, 0.00), -- Monday
      (v_region.id, 2, 0.00), -- Tuesday
      (v_region.id, 3, 0.00), -- Wednesday
      (v_region.id, 4, 0.00), -- Thursday
      (v_region.id, 5, 0.05), -- Friday +5%
      (v_region.id, 6, 0.10)  -- Saturday +10%
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Insert hour factors (peak hours)
DO $$
DECLARE
  v_region RECORD;
BEGIN
  FOR v_region IN SELECT id FROM public.pricing_regions LOOP
    INSERT INTO public.pricing_hour_factors (region_id, hour_start, hour_end, factor, description) VALUES
      (v_region.id, 0, 5, -0.15, 'Night discount'),
      (v_region.id, 6, 9, 0.10, 'Morning peak'),
      (v_region.id, 10, 16, 0.00, 'Normal hours'),
      (v_region.id, 17, 21, 0.20, 'Evening peak'),
      (v_region.id, 22, 23, 0.10, 'Late evening')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Insert user type factors
INSERT INTO public.pricing_user_factors (user_type, factor, min_rentals, description) VALUES
  ('new', 0.05, 0, 'New users (0 rentals)'),
  ('frequent', -0.05, 10, 'Frequent renters (10+ rentals)'),
  ('verified', -0.10, 0, 'Identity verified users'),
  ('premium', -0.15, 0, 'Premium members')
ON CONFLICT DO NOTHING;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.pricing_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_day_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_hour_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_user_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_demand_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_calculations ENABLE ROW LEVEL SECURITY;

-- Public read access to pricing config
CREATE POLICY "Anyone can read pricing regions"
ON public.pricing_regions FOR SELECT
USING (active = true);

CREATE POLICY "Anyone can read pricing factors"
ON public.pricing_day_factors FOR SELECT
USING (true);

CREATE POLICY "Anyone can read hour factors"
ON public.pricing_hour_factors FOR SELECT
USING (true);

CREATE POLICY "Anyone can read user factors"
ON public.pricing_user_factors FOR SELECT
USING (true);

CREATE POLICY "Anyone can read demand snapshots"
ON public.pricing_demand_snapshots FOR SELECT
USING (true);

CREATE POLICY "Anyone can read special events"
ON public.pricing_special_events FOR SELECT
USING (active = true);

-- Only authenticated users can see their own calculation logs
CREATE POLICY "Users can read own pricing calculations"
ON public.pricing_calculations FOR SELECT
USING (auth.uid() = user_id);

-- Admin-only policies for modifications
CREATE POLICY "Admins can manage pricing regions"
ON public.pricing_regions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- =============================================
-- GRANTS
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.pricing_regions TO anon, authenticated;
GRANT SELECT ON public.pricing_day_factors TO anon, authenticated;
GRANT SELECT ON public.pricing_hour_factors TO anon, authenticated;
GRANT SELECT ON public.pricing_user_factors TO anon, authenticated;
GRANT SELECT ON public.pricing_demand_snapshots TO anon, authenticated;
GRANT SELECT ON public.pricing_special_events TO anon, authenticated;
GRANT SELECT ON public.pricing_calculations TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_dynamic_price TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_demand_snapshot TO service_role;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_pricing_regions_active ON public.pricing_regions(active);
CREATE INDEX IF NOT EXISTS idx_pricing_calculations_user ON public.pricing_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_calculations_booking ON public.pricing_calculations(booking_id);
CREATE INDEX IF NOT EXISTS idx_special_events_dates ON public.pricing_special_events(region_id, start_date, end_date) WHERE active = true;
