-- ============================================================================
-- MIGRATION: Create insurance system tables
-- Date: 2025-11-16
-- Purpose: Create insurance_policies and related tables for insurance system
-- Issue: Tables defined in database/create-insurance-system.sql but not in migrations
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLA: Pólizas de Seguros (Flotantes y Propias)
-- ============================================================================

CREATE TABLE IF NOT EXISTS insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de póliza
  policy_type TEXT NOT NULL CHECK (policy_type IN ('platform_floating', 'owner_byoi')),

  -- Aseguradora
  insurer TEXT NOT NULL CHECK (insurer IN ('rio_uruguay', 'sancor', 'federacion_patronal', 'other')),

  -- Para pólizas flotantes (plataforma)
  platform_policy_number TEXT,
  platform_contract_start DATE,
  platform_contract_end DATE,

  -- Para pólizas propias (BYOI)
  owner_id UUID REFERENCES auth.users(id),
  car_id UUID REFERENCES cars(id),
  owner_policy_number TEXT,
  owner_policy_start DATE,
  owner_policy_end DATE,
  owner_policy_document_url TEXT,
  verified_by_admin BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,

  -- Coberturas
  liability_coverage_amount BIGINT DEFAULT 160000000, -- RC en pesos
  own_damage_coverage BOOLEAN DEFAULT true,
  theft_coverage BOOLEAN DEFAULT true,
  fire_coverage BOOLEAN DEFAULT true,
  misappropriation_coverage BOOLEAN DEFAULT true,
  misappropriation_limit BIGINT DEFAULT 25000000,

  -- Franquicia
  deductible_type TEXT CHECK (deductible_type IN ('percentage', 'fixed')),
  deductible_percentage NUMERIC(5,2), -- ej: 5.00 para 5%
  deductible_fixed_amount BIGINT,
  deductible_min_amount BIGINT DEFAULT 500000,

  -- Costos
  daily_premium BIGINT, -- Costo diario para seguro flotante
  annual_premium BIGINT, -- Costo anual para BYOI

  -- Estado
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending_verification')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_insurance_policies_owner ON insurance_policies(owner_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_car ON insurance_policies(car_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_type ON insurance_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_status ON insurance_policies(status);

-- ============================================================================
-- 2. TABLA: Coberturas Activas por Reserva
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_insurance_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES insurance_policies(id),

  -- Fechas de cobertura
  coverage_start TIMESTAMPTZ NOT NULL,
  coverage_end TIMESTAMPTZ NOT NULL,

  -- Detalles de la cobertura activa
  liability_coverage BIGINT NOT NULL,
  deductible_amount BIGINT NOT NULL,
  daily_premium_charged BIGINT, -- Solo si es flotante

  -- Certificado digital
  certificate_number TEXT,
  certificate_url TEXT,

  -- Estado
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  activated_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_insurance_booking ON booking_insurance_coverage(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_insurance_policy ON booking_insurance_coverage(policy_id);

-- ============================================================================
-- 3. TABLA: Add-ons de Seguro (opcionales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS insurance_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  addon_type TEXT NOT NULL CHECK (addon_type IN (
    'rc_ampliada',
    'reduccion_franquicia',
    'paises_limitrofes',
    'neumaticos',
    'equipaje'
  )),
  daily_cost BIGINT NOT NULL,
  benefit_amount BIGINT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. SEED DATA: Póliza flotante de plataforma
-- ============================================================================

INSERT INTO insurance_policies (
  policy_type,
  insurer,
  platform_policy_number,
  platform_contract_start,
  platform_contract_end,
  liability_coverage_amount,
  deductible_type,
  deductible_percentage,
  deductible_min_amount,
  daily_premium,
  status
) VALUES (
  'platform_floating',
  'rio_uruguay',
  'RUS-AUTORENTAR-2025-001',
  '2025-01-01',
  '2025-12-31',
  180000000, -- $180M
  'percentage',
  5.00, -- 5%
  500000, -- $500k mínimo
  13500, -- $13.5k por día
  'active'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. RLS Policies (básicas)
-- ============================================================================

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_insurance_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_addons ENABLE ROW LEVEL SECURITY;

-- Anyone can view active platform policies
CREATE POLICY "Anyone can view active platform policies"
ON insurance_policies FOR SELECT
USING (policy_type = 'platform_floating' AND status = 'active');

-- Owners can view their own policies
CREATE POLICY "Owners can view own policies"
ON insurance_policies FOR SELECT
USING (owner_id = auth.uid());

-- Anyone can view active addons
CREATE POLICY "Anyone can view active addons"
ON insurance_addons FOR SELECT
USING (active = true);

-- Users can view their own booking coverage
CREATE POLICY "Users can view own booking coverage"
ON booking_insurance_coverage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_insurance_coverage.booking_id
    AND bookings.renter_id = auth.uid()
  )
);

-- ============================================================================
-- 6. Comments
-- ============================================================================

COMMENT ON TABLE insurance_policies IS 'Pólizas de seguro: flotantes (plataforma) o propias (BYOI)';
COMMENT ON TABLE booking_insurance_coverage IS 'Cobertura activa por cada reserva';
COMMENT ON TABLE insurance_addons IS 'Add-ons opcionales de seguro';

COMMIT;








