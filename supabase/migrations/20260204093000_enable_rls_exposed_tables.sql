-- ============================================================================
-- MIGRATION: Enable RLS on exposed tables (targeted)
-- Date: 2026-02-04
-- ============================================================================

-- driver_risk_scores
ALTER TABLE IF EXISTS public.driver_risk_scores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='driver_risk_scores'
      AND policyname='Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON public.driver_risk_scores
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- vehicle_risk_categories
ALTER TABLE IF EXISTS public.vehicle_risk_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='vehicle_risk_categories'
      AND policyname='Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON public.vehicle_risk_categories
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='vehicle_risk_categories'
      AND policyname='Anyone can read risk categories'
  ) THEN
    CREATE POLICY "Anyone can read risk categories" ON public.vehicle_risk_categories
      FOR SELECT USING (true);
  END IF;
END $$;

-- car_pricing_matrix
ALTER TABLE IF EXISTS public.car_pricing_matrix ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='car_pricing_matrix'
      AND policyname='Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON public.car_pricing_matrix
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='car_pricing_matrix'
      AND policyname='Anyone can read pricing matrix'
  ) THEN
    CREATE POLICY "Anyone can read pricing matrix" ON public.car_pricing_matrix
      FOR SELECT USING (true);
  END IF;
END $$;

-- cars_fipe_history
ALTER TABLE IF EXISTS public.cars_fipe_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='cars_fipe_history'
      AND policyname='Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON public.cars_fipe_history
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='cars_fipe_history'
      AND policyname='Anyone can read fipe history'
  ) THEN
    CREATE POLICY "Anyone can read fipe history" ON public.cars_fipe_history
      FOR SELECT USING (true);
  END IF;
END $$;

-- ev_policies
ALTER TABLE IF EXISTS public.ev_policies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ev_policies'
      AND policyname='Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON public.ev_policies
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ev_policies'
      AND policyname='Anyone can read ev policies'
  ) THEN
    CREATE POLICY "Anyone can read ev policies" ON public.ev_policies
      FOR SELECT USING (true);
  END IF;
END $$;
