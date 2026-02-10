-- Create missing dynamic pricing tables: pricing_regions and pricing_special_events
-- These tables are queried by dynamic-pricing.service.ts and realtime-pricing.service.ts
-- but were never applied as migrations (only existed in apps/web/sql/setup-dynamic-pricing.sql)

BEGIN;

-- 1. pricing_regions: multi-city pricing configuration
CREATE TABLE IF NOT EXISTS public.pricing_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  currency TEXT NOT NULL,
  base_price_per_hour DECIMAL(10,2) NOT NULL,
  fuel_cost_multiplier DECIMAL(5,3) DEFAULT 1.0,
  inflation_rate DECIMAL(5,3) DEFAULT 0.0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pricing_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active regions"
  ON public.pricing_regions FOR SELECT
  USING (active = true);

GRANT SELECT ON public.pricing_regions TO anon, authenticated;

-- 2. pricing_special_events: holidays, concerts, weather events
CREATE TABLE IF NOT EXISTS public.pricing_special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES public.pricing_regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  factor DECIMAL(5,3) NOT NULL DEFAULT 0.15,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_events_dates
  ON public.pricing_special_events(region_id, start_date, end_date)
  WHERE active = true;

ALTER TABLE public.pricing_special_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active special events"
  ON public.pricing_special_events FOR SELECT
  USING (active = true);

GRANT SELECT ON public.pricing_special_events TO anon, authenticated;

-- 3. Backfill: link existing pricing_demand_snapshots.region_id FK
-- (column exists but without constraint since pricing_regions didn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pricing_demand_snapshots_region_id_fkey'
      AND table_name = 'pricing_demand_snapshots'
  ) THEN
    -- Only add FK if no orphan region_ids exist
    IF NOT EXISTS (
      SELECT 1 FROM public.pricing_demand_snapshots
      WHERE region_id IS NOT NULL
        AND region_id NOT IN (SELECT id FROM public.pricing_regions)
    ) THEN
      ALTER TABLE public.pricing_demand_snapshots
        ADD CONSTRAINT pricing_demand_snapshots_region_id_fkey
        FOREIGN KEY (region_id) REFERENCES public.pricing_regions(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

COMMIT;
