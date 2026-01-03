-- ============================================================================
-- Migration: Create pricing_seasonal_rules table
-- Date: 2025-12-30
-- Purpose: Add seasonal pricing adjustments to dynamic pricing system
-- ============================================================================

-- Create seasonal pricing rules table
CREATE TABLE IF NOT EXISTS pricing_seasonal_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region_id UUID REFERENCES pricing_regions(id) ON DELETE CASCADE,

  -- Season dates (inclusive)
  season_start DATE NOT NULL,
  season_end DATE NOT NULL,

  -- Factor to apply (e.g., 0.25 = +25%, -0.10 = -10%)
  seasonal_factor NUMERIC(4,2) NOT NULL CHECK (seasonal_factor BETWEEN -0.50 AND 1.00),

  -- Priority for overlapping seasons (higher = wins)
  priority INTEGER NOT NULL DEFAULT 0,

  -- Active flag
  active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate seasons for same region/dates
  CONSTRAINT unique_season_region_dates UNIQUE (region_id, season_start, season_end)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_seasonal_rules_region ON pricing_seasonal_rules(region_id);
CREATE INDEX IF NOT EXISTS idx_pricing_seasonal_rules_dates ON pricing_seasonal_rules(season_start, season_end);
CREATE INDEX IF NOT EXISTS idx_pricing_seasonal_rules_active ON pricing_seasonal_rules(active) WHERE active = true;

-- Enable RLS
ALTER TABLE pricing_seasonal_rules ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read active rules
CREATE POLICY "Anyone can read active seasonal rules"
  ON pricing_seasonal_rules
  FOR SELECT
  USING (active = true);

-- RLS: Admins can manage all rules
CREATE POLICY "Admins can manage seasonal rules"
  ON pricing_seasonal_rules
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Insert sample seasonal rules for LATAM
INSERT INTO pricing_seasonal_rules (name, region_id, season_start, season_end, seasonal_factor, priority, description) VALUES
  ('Verano 2025-2026', NULL, '2025-12-15', '2026-03-15', 0.25, 10, 'Temporada alta de verano'),
  ('Carnaval 2026', NULL, '2026-02-14', '2026-02-18', 0.40, 20, 'Carnaval - máxima demanda'),
  ('Semana Santa 2026', NULL, '2026-04-02', '2026-04-05', 0.30, 20, 'Semana Santa'),
  ('Invierno 2026', NULL, '2026-06-21', '2026-09-21', -0.10, 5, 'Temporada baja de invierno')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE pricing_seasonal_rules IS 'Seasonal pricing adjustments for dynamic pricing system';

-- ============================================================================
-- Update calculate_dynamic_price to include seasonal factor
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(
  p_region_id uuid,
  p_user_id uuid,
  p_rental_start timestamp with time zone,
  p_rental_hours integer
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_price DECIMAL(10,2);
  v_currency TEXT;
  v_region_name TEXT;
  v_day_factor DECIMAL(5,3) := 0.0;
  v_hour_factor DECIMAL(5,3) := 0.0;
  v_user_factor DECIMAL(5,3) := 0.0;
  v_demand_factor DECIMAL(5,3) := 0.0;
  v_event_factor DECIMAL(5,3) := 0.0;
  v_seasonal_factor DECIMAL(5,3) := 0.0;
  v_final_price DECIMAL(10,2);
  v_user_rentals INT;
  v_dow INT;
  v_hour INT;
  v_rental_date DATE;
BEGIN
  -- 1. Get base price and region name
  SELECT base_price_per_hour, currency, name
  INTO v_base_price, v_currency, v_region_name
  FROM public.pricing_regions
  WHERE id = p_region_id AND active = true;

  IF v_base_price IS NULL THEN
    RAISE EXCEPTION 'Region not found or inactive';
  END IF;

  -- 2. Get day factor
  v_dow := EXTRACT(DOW FROM p_rental_start);
  SELECT COALESCE(factor, 0.0)
  INTO v_day_factor
  FROM public.pricing_day_factors
  WHERE region_id = p_region_id AND day_of_week = v_dow;
  v_day_factor := COALESCE(v_day_factor, 0.0);

  -- 3. Get hour factor
  v_hour := EXTRACT(HOUR FROM p_rental_start);
  SELECT COALESCE(factor, 0.0)
  INTO v_hour_factor
  FROM public.pricing_hour_factors
  WHERE region_id = p_region_id
    AND hour_start <= v_hour
    AND hour_end >= v_hour
  LIMIT 1;
  v_hour_factor := COALESCE(v_hour_factor, 0.0);

  -- 4. Get user factor
  SELECT COUNT(*)
  INTO v_user_rentals
  FROM public.bookings
  WHERE renter_id = p_user_id AND status = 'completed';

  IF v_user_rentals = 0 THEN
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'new';
  ELSIF v_user_rentals >= 10 THEN
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'frequent';
  END IF;
  v_user_factor := COALESCE(v_user_factor, 0.0);

  -- 5. Get demand factor
  SELECT COALESCE(surge_factor, 0.0)
  INTO v_demand_factor
  FROM public.pricing_demand_snapshots
  WHERE region LIKE '%' || SPLIT_PART(v_region_name, '-', 2) || '%'
  ORDER BY created_at DESC
  LIMIT 1;
  v_demand_factor := COALESCE(v_demand_factor, 0.0);

  -- 6. Check for special events
  SELECT COALESCE(SUM(factor), 0.0)
  INTO v_event_factor
  FROM public.pricing_special_events
  WHERE region_id = p_region_id
    AND active = true
    AND p_rental_start BETWEEN start_date AND end_date;
  v_event_factor := COALESCE(v_event_factor, 0.0);

  -- 7. Get seasonal factor (highest priority wins)
  v_rental_date := p_rental_start::date;
  SELECT COALESCE(seasonal_factor, 0.0)
  INTO v_seasonal_factor
  FROM public.pricing_seasonal_rules
  WHERE active = true
    AND (region_id IS NULL OR region_id = p_region_id)
    AND v_rental_date BETWEEN season_start AND season_end
  ORDER BY priority DESC, seasonal_factor DESC
  LIMIT 1;
  v_seasonal_factor := COALESCE(v_seasonal_factor, 0.0);

  -- 8. Calculate final price with all 6 factors
  v_final_price := v_base_price * (1 + v_day_factor + v_hour_factor + v_user_factor + v_demand_factor + v_event_factor + v_seasonal_factor);

  -- Apply min/max caps (0.7x to 1.8x - expanded for seasonal)
  v_final_price := GREATEST(v_base_price * 0.7, LEAST(v_final_price, v_base_price * 1.8));

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
      'seasonal_factor', v_seasonal_factor,
      'total_multiplier', (1 + v_day_factor + v_hour_factor + v_user_factor + v_demand_factor + v_event_factor + v_seasonal_factor),
      'price_before_cap', v_base_price * (1 + v_day_factor + v_hour_factor + v_user_factor + v_demand_factor + v_event_factor + v_seasonal_factor)
    )
  );
END;
$function$;

COMMENT ON FUNCTION calculate_dynamic_price IS 'Calculates dynamic price with 6 factors: day, hour, user, demand, event, seasonal';
