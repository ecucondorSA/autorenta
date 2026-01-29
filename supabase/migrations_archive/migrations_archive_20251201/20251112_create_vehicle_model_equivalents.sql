-- ============================================================================
-- MIGRATION: Create vehicle_model_equivalents table
-- Date: 2025-11-12
-- Purpose: Map vehicle model names between Argentina and Brazil for FIPE integration
--
-- Why: Many manufacturers use different names in different countries:
--      - VW Fusion (ARG) = VW Vento (BR)
--      - Ford Ka (ARG) = Ford Ka (BR) - same name
--      - Fiat Cronos (ARG) = Fiat Argo Sedan (BR)
--
-- This table allows us to:
-- 1. Use FIPE prices from Brazil as reference for Argentina
-- 2. Handle model name variations automatically
-- 3. Maintain a curated list of equivalences
-- ============================================================================

BEGIN;

-- ============================================================================
-- Table: vehicle_model_equivalents
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_model_equivalents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Brand (same in both countries usually)
  brand TEXT NOT NULL,

  -- Argentina model name
  model_argentina TEXT NOT NULL,

  -- Brazil model name (to query in FIPE)
  model_brazil TEXT NOT NULL,

  -- Confidence level of the mapping
  confidence_level TEXT NOT NULL DEFAULT 'manual' CHECK (confidence_level IN ('manual', 'ai_verified', 'exact_match')),

  -- Notes for manual verification
  notes TEXT,

  -- Active flag
  active BOOLEAN NOT NULL DEFAULT true,

  -- Unique constraint: one ARG model can only map to one BR model
  CONSTRAINT unique_argentina_model UNIQUE (brand, model_argentina)
);

-- Indexes
CREATE INDEX idx_model_equiv_brand ON public.vehicle_model_equivalents(brand);
CREATE INDEX idx_model_equiv_arg ON public.vehicle_model_equivalents(model_argentina);
CREATE INDEX idx_model_equiv_br ON public.vehicle_model_equivalents(model_brazil);

-- RLS Policies (public read, admin write)
ALTER TABLE public.vehicle_model_equivalents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read model equivalents"
  ON public.vehicle_model_equivalents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify model equivalents"
  ON public.vehicle_model_equivalents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Initial Data: Common Volkswagen/Fiat/Ford equivalences
-- ============================================================================

INSERT INTO public.vehicle_model_equivalents (brand, model_argentina, model_brazil, confidence_level, notes) VALUES
  -- Volkswagen
  ('Volkswagen', 'Fusion', 'Vento', 'manual', 'Mismo vehículo, nombres diferentes'),
  ('Volkswagen', 'Polo', 'Polo', 'exact_match', 'Mismo nombre en ambos países'),
  ('Volkswagen', 'Gol', 'Gol', 'exact_match', 'Modelo regional compartido'),
  ('Volkswagen', 'Virtus', 'Virtus', 'exact_match', 'Mismo nombre'),
  ('Volkswagen', 'Amarok', 'Amarok', 'exact_match', 'Pickup compartida'),
  ('Volkswagen', 'T-Cross', 'T-Cross', 'exact_match', 'SUV compacto'),
  ('Volkswagen', 'Taos', 'Taos', 'exact_match', 'SUV mediano'),

  -- Fiat
  ('Fiat', 'Cronos', 'Argo Sedan', 'manual', 'Cronos ARG = Argo Sedan BR'),
  ('Fiat', 'Argo', 'Argo', 'exact_match', 'Mismo modelo hatchback'),
  ('Fiat', 'Strada', 'Strada', 'exact_match', 'Pickup compartida'),
  ('Fiat', 'Toro', 'Toro', 'exact_match', 'Pickup mediana'),
  ('Fiat', 'Pulse', 'Pulse', 'exact_match', 'SUV compartido'),
  ('Fiat', 'Fastback', 'Fastback', 'exact_match', 'SUV cupé'),
  ('Fiat', 'Mobi', 'Mobi', 'exact_match', 'City car'),

  -- Ford
  ('Ford', 'Ka', 'Ka', 'exact_match', 'Mismo nombre'),
  ('Ford', 'Territory', 'Territory', 'exact_match', 'SUV compartido'),
  ('Ford', 'Ranger', 'Ranger', 'exact_match', 'Pickup global'),
  ('Ford', 'Maverick', 'Maverick', 'exact_match', 'Pickup compacta'),

  -- Chevrolet
  ('Chevrolet', 'Onix', 'Onix', 'exact_match', 'Mismo modelo'),
  ('Chevrolet', 'Tracker', 'Tracker', 'exact_match', 'SUV compartido'),
  ('Chevrolet', 'Montana', 'Montana', 'exact_match', 'Pickup compartida'),
  ('Chevrolet', 'Spin', 'Spin', 'exact_match', 'Minivan'),

  -- Nissan
  ('Nissan', 'Kicks', 'Kicks', 'exact_match', 'SUV compartido'),
  ('Nissan', 'Versa', 'Versa', 'exact_match', 'Sedán'),
  ('Nissan', 'Frontier', 'Frontier', 'exact_match', 'Pickup'),

  -- Toyota
  ('Toyota', 'Corolla', 'Corolla', 'exact_match', 'Modelo global'),
  ('Toyota', 'Hilux', 'Hilux', 'exact_match', 'Pickup compartida'),
  ('Toyota', 'SW4', 'SW4', 'exact_match', 'SUV'),
  ('Toyota', 'Yaris', 'Yaris', 'exact_match', 'Hatchback'),
  ('Toyota', 'Etios', 'Etios', 'exact_match', 'Modelo regional'),

  -- Renault
  ('Renault', 'Sandero', 'Sandero', 'exact_match', 'Hatchback'),
  ('Renault', 'Logan', 'Logan', 'exact_match', 'Sedán'),
  ('Renault', 'Duster', 'Duster', 'exact_match', 'SUV'),
  ('Renault', 'Kwid', 'Kwid', 'exact_match', 'City car'),
  ('Renault', 'Alaskan', 'Alaskan', 'exact_match', 'Pickup'),

  -- Peugeot
  ('Peugeot', '208', '208', 'exact_match', 'Hatchback'),
  ('Peugeot', '2008', '2008', 'exact_match', 'SUV compacto'),
  ('Peugeot', 'Partner', 'Partner', 'exact_match', 'Utilitario'),

  -- Citroën
  ('Citroën', 'C4 Cactus', 'C4 Cactus', 'exact_match', 'SUV'),
  ('Citroën', 'Berlingo', 'Berlingo', 'exact_match', 'Utilitario')
ON CONFLICT (brand, model_argentina) DO NOTHING;

-- ============================================================================
-- Helper Function: Find Brazil equivalent for Argentina model
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_brazil_model_equivalent(
  p_brand TEXT,
  p_model_argentina TEXT
)
RETURNS TABLE (
  model_brazil TEXT,
  confidence TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Try exact match first
  RETURN QUERY
  SELECT
    vme.model_brazil,
    vme.confidence_level
  FROM public.vehicle_model_equivalents vme
  WHERE
    LOWER(TRIM(vme.brand)) = LOWER(TRIM(p_brand))
    AND LOWER(TRIM(vme.model_argentina)) = LOWER(TRIM(p_model_argentina))
    AND vme.active = true
  LIMIT 1;

  -- If not found, return the original model (assume same name)
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_model_argentina, 'assumed_same'::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.find_brazil_model_equivalent IS
'Finds the Brazil model equivalent for an Argentina model name.
Returns the original model name with confidence "assumed_same" if no mapping exists.';

-- ============================================================================
-- Update Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_model_equivalents_updated_at
  BEFORE UPDATE ON public.vehicle_model_equivalents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test function
-- SELECT * FROM find_brazil_model_equivalent('Volkswagen', 'Fusion');
-- SELECT * FROM find_brazil_model_equivalent('Fiat', 'Strada');
-- SELECT * FROM find_brazil_model_equivalent('Ford', 'Ranger');

-- View all mappings
-- SELECT brand, model_argentina, model_brazil, confidence_level
-- FROM vehicle_model_equivalents
-- ORDER BY brand, model_argentina;
