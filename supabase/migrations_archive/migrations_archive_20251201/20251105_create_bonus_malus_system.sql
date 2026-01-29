-- ============================================================================
-- AUTORENTA - SISTEMA BONUS-MALUS COMPLETO
-- ============================================================================
-- Created: 2025-11-05
-- Purpose: Sistema completo de bonus-malus con clases de riesgo (0-10),
--          telemática, protector de bonus y Crédito de Protección (CP)
-- ============================================================================
--
-- NOMENCLATURA:
-- - BSNR → "Crédito de Protección" (CP)
-- - BSNR_balance → protection_credit_balance
-- - protection_credit se almacena en CENTAVOS (cents)
--
-- CLASES DE CONDUCTOR:
-- - Clase 0: Excelente (máximo descuento)
-- - Clase 5: Base (sin historial)
-- - Clase 10: Riesgo máximo (máximo recargo)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 DRIVER_RISK_PROFILE
-- ----------------------------------------------------------------------------
-- Almacena el perfil de riesgo de cada conductor

CREATE TABLE IF NOT EXISTS driver_risk_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Clasificación de riesgo
  class INT NOT NULL DEFAULT 5 CHECK (class BETWEEN 0 AND 10),
  driver_score INT NOT NULL DEFAULT 50 CHECK (driver_score BETWEEN 0 AND 100),

  -- Historial de siniestros
  last_claim_at TIMESTAMPTZ,
  last_claim_with_fault BOOLEAN,

  -- Contadores
  good_years INT NOT NULL DEFAULT 0,
  total_claims INT NOT NULL DEFAULT 0,
  claims_with_fault INT NOT NULL DEFAULT 0,

  -- Metadata
  last_class_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_driver_risk_profile_class ON driver_risk_profile(class);
CREATE INDEX IF NOT EXISTS idx_driver_risk_profile_driver_score ON driver_risk_profile(driver_score);
CREATE INDEX IF NOT EXISTS idx_driver_risk_profile_last_claim ON driver_risk_profile(last_claim_at);

-- Comentarios
COMMENT ON TABLE driver_risk_profile IS 'Perfil de riesgo del conductor con clase (0-10) y score telemático';
COMMENT ON COLUMN driver_risk_profile.class IS 'Clase de riesgo: 0 (excelente) a 10 (máximo riesgo)';
COMMENT ON COLUMN driver_risk_profile.driver_score IS 'Score telemático: 0 (peligroso) a 100 (excelente)';
COMMENT ON COLUMN driver_risk_profile.good_years IS 'Años consecutivos sin siniestros con culpa';
COMMENT ON COLUMN driver_risk_profile.total_claims IS 'Total de siniestros registrados';
COMMENT ON COLUMN driver_risk_profile.claims_with_fault IS 'Siniestros donde el conductor tuvo culpa';

-- ----------------------------------------------------------------------------
-- 1.2 PRICING_CLASS_FACTORS
-- ----------------------------------------------------------------------------
-- Factores multiplicadores por clase de conductor

CREATE TABLE IF NOT EXISTS pricing_class_factors (
  class INT PRIMARY KEY CHECK (class BETWEEN 0 AND 10),

  -- Multiplicadores
  fee_multiplier DECIMAL(5,3) NOT NULL,
  guarantee_multiplier DECIMAL(5,3) NOT NULL,

  -- Metadata
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE pricing_class_factors IS 'Factores de ajuste de precio por clase de conductor';
COMMENT ON COLUMN pricing_class_factors.fee_multiplier IS 'Multiplicador del fee de plataforma (ej: 0.85 = 15% descuento)';
COMMENT ON COLUMN pricing_class_factors.guarantee_multiplier IS 'Multiplicador de la garantía (ej: 1.20 = 20% más garantía)';

-- ----------------------------------------------------------------------------
-- 1.3 DRIVER_TELEMETRY
-- ----------------------------------------------------------------------------
-- Datos telemáticos recolectados por booking

CREATE TABLE IF NOT EXISTS driver_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,

  -- Datos del viaje
  trip_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_km DECIMAL(10,2),

  -- Eventos de riesgo
  hard_brakes INT NOT NULL DEFAULT 0,
  speed_violations INT NOT NULL DEFAULT 0,
  night_driving_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  risk_zones_visited INT NOT NULL DEFAULT 0,

  -- Score calculado
  driver_score INT CHECK (driver_score BETWEEN 0 AND 100),

  -- Metadata
  raw_data JSONB, -- Datos crudos del sensor
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_driver_telemetry_user_id ON driver_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_telemetry_booking_id ON driver_telemetry(booking_id);
CREATE INDEX IF NOT EXISTS idx_driver_telemetry_trip_date ON driver_telemetry(trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_telemetry_driver_score ON driver_telemetry(driver_score);

-- Comentarios
COMMENT ON TABLE driver_telemetry IS 'Datos telemáticos recolectados durante viajes';
COMMENT ON COLUMN driver_telemetry.hard_brakes IS 'Cantidad de frenadas bruscas detectadas';
COMMENT ON COLUMN driver_telemetry.speed_violations IS 'Cantidad de excesos de velocidad detectados';
COMMENT ON COLUMN driver_telemetry.night_driving_hours IS 'Horas de conducción nocturna (22:00-06:00)';
COMMENT ON COLUMN driver_telemetry.risk_zones_visited IS 'Cantidad de zonas de alto riesgo visitadas';
COMMENT ON COLUMN driver_telemetry.driver_score IS 'Score calculado del viaje (0-100)';

-- ----------------------------------------------------------------------------
-- 1.4 DRIVER_PROTECTION_ADDONS
-- ----------------------------------------------------------------------------
-- Add-ons de protección comprados por el conductor

CREATE TABLE IF NOT EXISTS driver_protection_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de addon
  addon_type TEXT NOT NULL CHECK (addon_type IN ('bonus_protector', 'deductible_shield')),

  -- Fechas
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Precio y nivel
  price_paid_cents BIGINT NOT NULL, -- Precio en centavos
  price_currency TEXT NOT NULL DEFAULT 'ARS',
  protection_level INT NOT NULL DEFAULT 1 CHECK (protection_level BETWEEN 1 AND 3),

  -- Estado de uso
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_for_booking_id UUID REFERENCES bookings(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_driver_protection_addons_user_id ON driver_protection_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_protection_addons_type ON driver_protection_addons(addon_type);
CREATE INDEX IF NOT EXISTS idx_driver_protection_addons_expires ON driver_protection_addons(expires_at);
CREATE INDEX IF NOT EXISTS idx_driver_protection_addons_active ON driver_protection_addons(user_id, expires_at)
  WHERE used = FALSE AND expires_at > NOW();

-- Comentarios
COMMENT ON TABLE driver_protection_addons IS 'Add-ons de protección comprados (protector de bonus, escudo de franquicia)';
COMMENT ON COLUMN driver_protection_addons.addon_type IS 'Tipo: bonus_protector (protege clase), deductible_shield (reduce franquicia)';
COMMENT ON COLUMN driver_protection_addons.protection_level IS 'Nivel 1-3: cuántos siniestros cubre o % de reducción';
COMMENT ON COLUMN driver_protection_addons.price_paid_cents IS 'Precio pagado en centavos';

-- ----------------------------------------------------------------------------
-- 1.5 BOOKING_CLAIMS
-- ----------------------------------------------------------------------------
-- Registro de siniestros por booking

CREATE TABLE IF NOT EXISTS booking_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Monto y severidad
  claim_amount_cents BIGINT NOT NULL CHECK (claim_amount_cents > 0),
  claim_currency TEXT NOT NULL DEFAULT 'USD',

  -- Atribución de culpa
  fault_attributed BOOLEAN NOT NULL DEFAULT FALSE,
  severity INT NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 3),

  -- Descripción
  description TEXT,
  evidence_urls TEXT[], -- URLs de fotos/documentos

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- En revisión
    'approved',     -- Aprobado
    'rejected',     -- Rechazado
    'resolved',     -- Resuelto (pagado)
    'cancelled'     -- Cancelado
  )),

  -- Resolución
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_booking_claims_booking_id ON booking_claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_claims_user_id ON booking_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_claims_status ON booking_claims(status);
CREATE INDEX IF NOT EXISTS idx_booking_claims_severity ON booking_claims(severity);
CREATE INDEX IF NOT EXISTS idx_booking_claims_created_at ON booking_claims(created_at DESC);

-- Comentarios
COMMENT ON TABLE booking_claims IS 'Registro de siniestros (daños, robos, accidentes)';
COMMENT ON COLUMN booking_claims.fault_attributed IS 'TRUE si el conductor tuvo culpa en el siniestro';
COMMENT ON COLUMN booking_claims.severity IS '1 (leve), 2 (moderado), 3 (grave)';
COMMENT ON COLUMN booking_claims.claim_amount_cents IS 'Monto del siniestro en centavos';

-- ============================================================================
-- SECTION 2: MODIFY EXISTING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 USER_WALLETS - Agregar Crédito de Protección
-- ----------------------------------------------------------------------------

-- Agregar columnas para Crédito de Protección (CP)
DO $$
BEGIN
  -- Agregar protection_credit_cents si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_wallets' AND column_name = 'protection_credit_cents'
  ) THEN
    ALTER TABLE user_wallets
      ADD COLUMN protection_credit_cents BIGINT NOT NULL DEFAULT 0 CHECK (protection_credit_cents >= 0);

    COMMENT ON COLUMN user_wallets.protection_credit_cents IS 'Crédito de Protección (no retirable) en centavos';
  END IF;

  -- Agregar protection_credit_currency si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_wallets' AND column_name = 'protection_credit_currency'
  ) THEN
    ALTER TABLE user_wallets
      ADD COLUMN protection_credit_currency VARCHAR(3) NOT NULL DEFAULT 'USD';

    COMMENT ON COLUMN user_wallets.protection_credit_currency IS 'Moneda del Crédito de Protección (USD)';
  END IF;

  -- Agregar protection_credit_issued_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_wallets' AND column_name = 'protection_credit_issued_at'
  ) THEN
    ALTER TABLE user_wallets
      ADD COLUMN protection_credit_issued_at TIMESTAMPTZ;

    COMMENT ON COLUMN user_wallets.protection_credit_issued_at IS 'Fecha de emisión del último CP';
  END IF;

  -- Agregar protection_credit_expires_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_wallets' AND column_name = 'protection_credit_expires_at'
  ) THEN
    ALTER TABLE user_wallets
      ADD COLUMN protection_credit_expires_at TIMESTAMPTZ;

    COMMENT ON COLUMN user_wallets.protection_credit_expires_at IS 'Fecha de expiración del CP';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2.2 WALLET_TRANSACTIONS - Agregar campos para CP tracking
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Agregar is_protection_credit si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallet_transactions' AND column_name = 'is_protection_credit'
  ) THEN
    ALTER TABLE wallet_transactions
      ADD COLUMN is_protection_credit BOOLEAN NOT NULL DEFAULT FALSE;

    COMMENT ON COLUMN wallet_transactions.is_protection_credit IS 'TRUE si esta transacción involucra Crédito de Protección';
  END IF;

  -- Agregar protection_credit_reference_type si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallet_transactions' AND column_name = 'protection_credit_reference_type'
  ) THEN
    ALTER TABLE wallet_transactions
      ADD COLUMN protection_credit_reference_type VARCHAR(50);

    ALTER TABLE wallet_transactions
      ADD CONSTRAINT check_protection_credit_reference_type
      CHECK (protection_credit_reference_type IN ('issuance', 'consumption', 'renewal', 'breakage', NULL));

    COMMENT ON COLUMN wallet_transactions.protection_credit_reference_type IS 'Tipo de operación CP: issuance, consumption, renewal, breakage';
  END IF;
END $$;

-- Índice para búsquedas de transacciones CP
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_protection_credit
  ON wallet_transactions(user_id, is_protection_credit)
  WHERE is_protection_credit = TRUE;

-- ============================================================================
-- SECTION 3: TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at en driver_risk_profile
CREATE OR REPLACE FUNCTION update_driver_risk_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_driver_risk_profile_updated_at
  BEFORE UPDATE ON driver_risk_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_risk_profile_updated_at();

-- Trigger para actualizar updated_at en pricing_class_factors
CREATE OR REPLACE FUNCTION update_pricing_class_factors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pricing_class_factors_updated_at
  BEFORE UPDATE ON pricing_class_factors
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_class_factors_updated_at();

-- Trigger para actualizar updated_at en booking_claims
CREATE OR REPLACE FUNCTION update_booking_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Si se marca como resolved, actualizar resolved_at
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_booking_claims_updated_at
  BEFORE UPDATE ON booking_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_claims_updated_at();

-- ============================================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE driver_risk_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_class_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_protection_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_claims ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4.1 DRIVER_RISK_PROFILE POLICIES
-- ----------------------------------------------------------------------------

-- Users can view own profile
CREATE POLICY "Users can view own driver profile"
  ON driver_risk_profile FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own profile (auto-initialized)
CREATE POLICY "Users can insert own driver profile"
  ON driver_risk_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- System can update profiles via RPC functions
CREATE POLICY "System can update driver profiles"
  ON driver_risk_profile FOR UPDATE
  USING (true); -- Controlled by SECURITY DEFINER functions

-- ----------------------------------------------------------------------------
-- 4.2 PRICING_CLASS_FACTORS POLICIES
-- ----------------------------------------------------------------------------

-- Anyone can view pricing factors (public info)
CREATE POLICY "Anyone can view pricing factors"
  ON pricing_class_factors FOR SELECT
  USING (is_active = TRUE);

-- Only service role can modify
CREATE POLICY "Service role can modify pricing factors"
  ON pricing_class_factors FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 4.3 DRIVER_TELEMETRY POLICIES
-- ----------------------------------------------------------------------------

-- Users can view own telemetry
CREATE POLICY "Users can view own telemetry"
  ON driver_telemetry FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own telemetry
CREATE POLICY "Users can insert own telemetry"
  ON driver_telemetry FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Car owners can view telemetry for bookings of their cars
CREATE POLICY "Car owners can view telemetry for their cars"
  ON driver_telemetry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = driver_telemetry.booking_id
      AND c.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4.4 DRIVER_PROTECTION_ADDONS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view own addons
CREATE POLICY "Users can view own protection addons"
  ON driver_protection_addons FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own addons (purchases)
CREATE POLICY "Users can insert own protection addons"
  ON driver_protection_addons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- System can update addons (mark as used)
CREATE POLICY "System can update protection addons"
  ON driver_protection_addons FOR UPDATE
  USING (true); -- Controlled by SECURITY DEFINER functions

-- ----------------------------------------------------------------------------
-- 4.5 BOOKING_CLAIMS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view claims for their bookings
CREATE POLICY "Users can view own booking claims"
  ON booking_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Car owners can view claims for their cars
CREATE POLICY "Car owners can view claims for their cars"
  ON booking_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = booking_claims.booking_id
      AND c.owner_id = auth.uid()
    )
  );

-- Users can insert claims for their bookings
CREATE POLICY "Users can insert claims for own bookings"
  ON booking_claims FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
      AND b.renter_id = auth.uid()
    )
  );

-- Car owners can insert claims for bookings of their cars
CREATE POLICY "Car owners can insert claims for their cars"
  ON booking_claims FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = booking_id
      AND c.owner_id = auth.uid()
    )
  );

-- System can update claims
CREATE POLICY "System can update claims"
  ON booking_claims FOR UPDATE
  USING (true); -- Controlled by SECURITY DEFINER functions

-- ============================================================================
-- SECTION 5: GRANTS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON driver_risk_profile TO authenticated;
GRANT SELECT ON pricing_class_factors TO authenticated, anon;
GRANT SELECT, INSERT ON driver_telemetry TO authenticated;
GRANT SELECT, INSERT ON driver_protection_addons TO authenticated;
GRANT SELECT, INSERT ON booking_claims TO authenticated;

-- Grant full permissions to service role
GRANT ALL ON driver_risk_profile TO service_role;
GRANT ALL ON pricing_class_factors TO service_role;
GRANT ALL ON driver_telemetry TO service_role;
GRANT ALL ON driver_protection_addons TO service_role;
GRANT ALL ON booking_claims TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sistema Bonus-Malus - Phase 1 completado';
  RAISE NOTICE '   - driver_risk_profile creada';
  RAISE NOTICE '   - pricing_class_factors creada';
  RAISE NOTICE '   - driver_telemetry creada';
  RAISE NOTICE '   - driver_protection_addons creada';
  RAISE NOTICE '   - booking_claims creada';
  RAISE NOTICE '   - user_wallets extendida con protection_credit_cents';
  RAISE NOTICE '   - wallet_transactions extendida con is_protection_credit';
  RAISE NOTICE '   - Triggers configurados';
  RAISE NOTICE '   - RLS policies aplicadas';
  RAISE NOTICE '   - Grants configurados';
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
