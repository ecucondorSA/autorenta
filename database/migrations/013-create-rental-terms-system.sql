-- ============================================================================
-- Migration: Create Rental Terms Management System
-- Date: 2025-12-30
-- Purpose: Replace hardcoded extras and penalties with configurable database tables
-- ============================================================================

-- 1. Create rental_terms_templates table for reusable term configurations
CREATE TABLE IF NOT EXISTS rental_terms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Fuel & Mileage
  fuel_policy TEXT NOT NULL DEFAULT 'full_to_full'
    CHECK (fuel_policy IN ('full_to_full', 'same_to_same', 'prepaid')),
  mileage_limit_km INTEGER, -- NULL = unlimited
  extra_km_price_usd NUMERIC(10,2) DEFAULT 0.15,

  -- Behavior rules
  allow_smoking BOOLEAN NOT NULL DEFAULT false,
  allow_pets BOOLEAN NOT NULL DEFAULT false,
  smoking_penalty_usd NUMERIC(10,2) DEFAULT 100.00,
  pet_cleaning_fee_usd NUMERIC(10,2) DEFAULT 50.00,
  general_cleaning_fee_usd NUMERIC(10,2) DEFAULT 30.00,

  -- Late return penalties (JSON array of rules)
  late_return_penalties JSONB NOT NULL DEFAULT '[
    {"hours_from": 0, "hours_to": 3, "multiplier": 1.5, "description": "1-3 horas tarde"},
    {"hours_from": 3, "hours_to": 6, "multiplier": 2.0, "description": "3-6 horas tarde"},
    {"hours_from": 6, "hours_to": 24, "multiplier": 2.5, "description": "6-24 horas tarde"},
    {"hours_from": 24, "hours_to": null, "multiplier": 3.0, "description": "Más de 24 horas tarde"}
  ]'::jsonb,

  -- Cancellation policy
  free_cancellation_hours INTEGER DEFAULT 24,
  cancellation_penalty_percentage NUMERIC(5,2) DEFAULT 10.00,

  -- Metadata
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for owner lookups
CREATE INDEX IF NOT EXISTS idx_rental_terms_templates_owner ON rental_terms_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_rental_terms_templates_default ON rental_terms_templates(is_default) WHERE is_default = true;

-- 2. Create booking_extras_config table for configurable add-ons
CREATE TABLE IF NOT EXISTS booking_extras_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  car_id UUID REFERENCES cars(id) ON DELETE CASCADE, -- NULL = applies to all owner's cars

  -- Extra details
  extra_type TEXT NOT NULL CHECK (extra_type IN ('gps', 'child_seat', 'additional_driver', 'toll_transponder', 'delivery', 'insurance_upgrade', 'other')),
  extra_name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  daily_rate_usd NUMERIC(10,2) NOT NULL,
  one_time_fee_usd NUMERIC(10,2) DEFAULT 0,

  -- Limits
  max_quantity INTEGER NOT NULL DEFAULT 1,
  requires_advance_booking BOOLEAN DEFAULT false,
  advance_hours_required INTEGER DEFAULT 0,

  -- Availability
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate extras for same owner/car/type
  CONSTRAINT unique_extra_per_owner_car UNIQUE (owner_id, car_id, extra_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_extras_owner ON booking_extras_config(owner_id);
CREATE INDEX IF NOT EXISTS idx_booking_extras_car ON booking_extras_config(car_id);
CREATE INDEX IF NOT EXISTS idx_booking_extras_active ON booking_extras_config(active) WHERE active = true;

-- 3. Create platform_fee_config table for configurable platform fees
CREATE TABLE IF NOT EXISTS platform_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('percentage', 'fixed')),
  fee_value NUMERIC(10,4) NOT NULL, -- percentage (0.05 = 5%) or fixed USD amount
  applies_to TEXT NOT NULL CHECK (applies_to IN ('booking', 'deposit', 'extras', 'all')),
  min_booking_usd NUMERIC(10,2), -- Optional minimum booking amount
  max_fee_usd NUMERIC(10,2), -- Optional fee cap
  active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS on all tables
ALTER TABLE rental_terms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_extras_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fee_config ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for rental_terms_templates
CREATE POLICY "Owners can manage their templates"
  ON rental_terms_templates
  FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "Anyone can read default templates"
  ON rental_terms_templates
  FOR SELECT
  USING (is_default = true AND active = true);

CREATE POLICY "Admins can manage all templates"
  ON rental_terms_templates
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- 6. RLS Policies for booking_extras_config
CREATE POLICY "Owners can manage their extras"
  ON booking_extras_config
  FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "Anyone can read active extras"
  ON booking_extras_config
  FOR SELECT
  USING (active = true);

-- 7. RLS Policies for platform_fee_config
CREATE POLICY "Anyone can read active fees"
  ON platform_fee_config
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage platform fees"
  ON platform_fee_config
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- 8. Insert default platform fees (replacing hardcoded values)
INSERT INTO platform_fee_config (name, fee_type, fee_value, applies_to, active) VALUES
  ('Platform Fee - Bookings', 'percentage', 0.05, 'booking', true),
  ('Platform Fee - Extras', 'percentage', 0.05, 'extras', true)
ON CONFLICT DO NOTHING;

-- 9. Insert default extras template (replacing hardcoded values)
INSERT INTO booking_extras_config (owner_id, extra_type, extra_name, daily_rate_usd, description, max_quantity, active) VALUES
  (NULL, 'gps', 'GPS Navigator', 5.00, 'Navegador GPS con mapas actualizados', 1, true),
  (NULL, 'child_seat', 'Silla para niños', 3.00, 'Silla de seguridad para niños (0-4 años)', 2, true),
  (NULL, 'additional_driver', 'Conductor adicional', 10.00, 'Agregar un conductor adicional autorizado', 2, true),
  (NULL, 'toll_transponder', 'TAG de peajes', 8.00, 'Dispositivo de pago automático de peajes', 1, true),
  (NULL, 'delivery', 'Entrega a domicilio', 20.00, 'Entrega y recogida en ubicación designada', 1, true)
ON CONFLICT DO NOTHING;

-- 10. Insert default rental terms template
INSERT INTO rental_terms_templates (name, owner_id, fuel_policy, allow_smoking, allow_pets, is_default, active) VALUES
  ('Términos Estándar', NULL, 'full_to_full', false, false, true, true)
ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON TABLE rental_terms_templates IS 'Configurable rental terms for vehicle rentals';
COMMENT ON TABLE booking_extras_config IS 'Configurable add-on extras for bookings';
COMMENT ON TABLE platform_fee_config IS 'Platform fee configuration (replaces hardcoded fees)';
