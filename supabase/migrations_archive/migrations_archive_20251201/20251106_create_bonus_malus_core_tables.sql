-- ============================================================================
-- MIGRATION: Bonus-Malus System - Core Tables
-- Date: 2025-11-06
-- Purpose: Create all core tables for driver classification and risk management
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: DRIVER RISK PROFILE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.driver_risk_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Classification (0-10 system)
  class INTEGER NOT NULL DEFAULT 5 CHECK (class BETWEEN 0 AND 10),
  driver_score INTEGER DEFAULT 50 CHECK (driver_score BETWEEN 0 AND 100),

  -- Claims history
  last_claim_at TIMESTAMPTZ,
  last_claim_with_fault BOOLEAN,
  good_years INTEGER DEFAULT 0 CHECK (good_years >= 0),
  total_claims INTEGER DEFAULT 0 CHECK (total_claims >= 0),
  claims_with_fault INTEGER DEFAULT 0 CHECK (claims_with_fault >= 0),

  -- Booking history
  total_bookings INTEGER DEFAULT 0 CHECK (total_bookings >= 0),
  clean_bookings INTEGER DEFAULT 0 CHECK (clean_bookings >= 0),

  -- Timestamps
  last_class_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (claims_with_fault <= total_claims),
  CHECK (clean_bookings <= total_bookings)
);

-- Indexes for driver_risk_profile
CREATE INDEX IF NOT EXISTS idx_driver_risk_profile_class ON public.driver_risk_profile(class);
CREATE INDEX IF NOT EXISTS idx_driver_risk_profile_driver_score ON public.driver_risk_profile(driver_score);
CREATE INDEX IF NOT EXISTS idx_driver_risk_profile_last_claim ON public.driver_risk_profile(last_claim_at);

-- RLS Policies
ALTER TABLE public.driver_risk_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own risk profile"
ON public.driver_risk_profile FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk profile"
ON public.driver_risk_profile FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update risk profiles"
ON public.driver_risk_profile FOR UPDATE
USING (true);  -- SECURITY DEFINER functions will handle this

-- Comments
COMMENT ON TABLE public.driver_risk_profile IS
'Driver risk classification and history. Class 0 = best, 10 = worst. Used for Bonus-Malus pricing.';

COMMENT ON COLUMN public.driver_risk_profile.class IS
'Driver class from 0 (excellent) to 10 (high risk). Class 5 = neutral, new drivers start here.';

COMMENT ON COLUMN public.driver_risk_profile.driver_score IS
'Telemetry-based driving score from 0 (worst) to 100 (best). Affects fee calculation.';

-- Updated_at trigger
CREATE TRIGGER set_driver_risk_profile_updated_at
  BEFORE UPDATE ON public.driver_risk_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 2: PRICING CLASS FACTORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pricing_class_factors (
  class INTEGER PRIMARY KEY CHECK (class BETWEEN 0 AND 10),
  fee_multiplier DECIMAL(5, 3) NOT NULL CHECK (fee_multiplier > 0),
  guarantee_multiplier DECIMAL(5, 3) NOT NULL CHECK (guarantee_multiplier > 0),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE public.pricing_class_factors IS
'Multiplier factors for fees and guarantees by driver class. Applied in pricing calculations.';

-- Updated_at trigger
CREATE TRIGGER set_pricing_class_factors_updated_at
  BEFORE UPDATE ON public.pricing_class_factors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 3: DRIVER TELEMETRY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.driver_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,

  -- Trip data
  trip_date TIMESTAMPTZ DEFAULT NOW(),
  total_km DECIMAL(10, 2) CHECK (total_km >= 0),

  -- Driving behavior metrics
  hard_brakes INTEGER DEFAULT 0 CHECK (hard_brakes >= 0),
  speed_violations INTEGER DEFAULT 0 CHECK (speed_violations >= 0),
  night_driving_hours DECIMAL(5, 2) DEFAULT 0 CHECK (night_driving_hours >= 0),
  risk_zones_visited INTEGER DEFAULT 0 CHECK (risk_zones_visited >= 0),

  -- Calculated score
  driver_score INTEGER CHECK (driver_score BETWEEN 0 AND 100),

  -- Metadata
  telemetry_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for driver_telemetry
CREATE INDEX IF NOT EXISTS idx_driver_telemetry_user_id ON public.driver_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_telemetry_booking_id ON public.driver_telemetry(booking_id);
CREATE INDEX IF NOT EXISTS idx_driver_telemetry_trip_date ON public.driver_telemetry(trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_telemetry_driver_score ON public.driver_telemetry(driver_score);

-- RLS Policies
ALTER TABLE public.driver_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own telemetry"
ON public.driver_telemetry FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert telemetry"
ON public.driver_telemetry FOR INSERT
WITH CHECK (true);  -- SECURITY DEFINER functions

-- Comments
COMMENT ON TABLE public.driver_telemetry IS
'Telemetry data collected during trips for driver score calculation. GPS, accelerometer, speed data.';

-- ============================================================================
-- SECTION 4: DRIVER PROTECTION ADDONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.driver_protection_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Addon type
  addon_type TEXT NOT NULL CHECK (addon_type IN ('bonus_protector', 'deductible_shield', 'premium_coverage')),

  -- Purchase info
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  price_paid_cents BIGINT NOT NULL CHECK (price_paid_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Protection details
  protection_level INTEGER DEFAULT 1 CHECK (protection_level BETWEEN 1 AND 3),
  max_protected_claims INTEGER DEFAULT 1 CHECK (max_protected_claims > 0),
  claims_used INTEGER DEFAULT 0 CHECK (claims_used >= 0),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (claims_used <= max_protected_claims),
  CHECK (expires_at IS NULL OR expires_at > purchase_date)
);

-- Indexes for driver_protection_addons
CREATE INDEX IF NOT EXISTS idx_driver_protection_addons_user_id ON public.driver_protection_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_protection_addons_addon_type ON public.driver_protection_addons(addon_type);
CREATE INDEX IF NOT EXISTS idx_driver_protection_addons_active ON public.driver_protection_addons(is_active)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_driver_protection_addons_expires ON public.driver_protection_addons(expires_at)
  WHERE expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE public.driver_protection_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own protection addons"
ON public.driver_protection_addons FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase protection addons"
ON public.driver_protection_addons FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update protection addons"
ON public.driver_protection_addons FOR UPDATE
USING (true);  -- SECURITY DEFINER functions

-- Comments
COMMENT ON TABLE public.driver_protection_addons IS
'Purchased add-ons like bonus protector (prevents class downgrade) or deductible shield.';

COMMENT ON COLUMN public.driver_protection_addons.addon_type IS
'Type: bonus_protector = protects class on claim, deductible_shield = reduces deductible, premium_coverage = full coverage.';

COMMENT ON COLUMN public.driver_protection_addons.protection_level IS
'Level 1-3: higher level = more protection. Affects price and number of protected claims.';

-- ============================================================================
-- SECTION 5: BOOKING CLAIMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.booking_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Claim details
  claim_amount_cents BIGINT CHECK (claim_amount_cents >= 0),
  claim_currency TEXT NOT NULL DEFAULT 'USD',
  fault_attributed BOOLEAN DEFAULT FALSE,
  severity INTEGER CHECK (severity BETWEEN 1 AND 3),

  -- Description
  description TEXT,
  damage_type TEXT,  -- 'minor_scratch', 'dent', 'glass_damage', 'major_collision', etc.

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'approved', 'rejected', 'paid')),

  -- Evidence
  evidence_photos JSONB,  -- Array of photo URLs
  police_report_url TEXT,

  -- Resolution
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for booking_claims
CREATE INDEX IF NOT EXISTS idx_booking_claims_booking_id ON public.booking_claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_claims_user_id ON public.booking_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_claims_status ON public.booking_claims(status);
CREATE INDEX IF NOT EXISTS idx_booking_claims_fault ON public.booking_claims(fault_attributed);
CREATE INDEX IF NOT EXISTS idx_booking_claims_severity ON public.booking_claims(severity);

-- RLS Policies
ALTER TABLE public.booking_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view claims for their bookings"
ON public.booking_claims FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = booking_claims.booking_id
    AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create claims for their bookings"
ON public.booking_claims FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = booking_claims.booking_id
    AND renter_id = auth.uid()
  )
);

CREATE POLICY "Admins can update claims"
ON public.booking_claims FOR UPDATE
USING (true);  -- SECURITY DEFINER functions

-- Comments
COMMENT ON TABLE public.booking_claims IS
'Claims/siniestros for bookings. Used to track damages and update driver risk profile.';

COMMENT ON COLUMN public.booking_claims.severity IS
'Severity 1 = minor (cosmetic), 2 = moderate (functional), 3 = major (safety/structural).';

COMMENT ON COLUMN public.booking_claims.fault_attributed IS
'TRUE if driver was at fault. Affects risk class. FALSE if not at fault or no-fault accident.';

-- Updated_at trigger
CREATE TRIGGER set_booking_claims_updated_at
  BEFORE UPDATE ON public.booking_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 6: DRIVER CLASS HISTORY TABLE (AUDIT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.driver_class_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Class change
  old_class INTEGER NOT NULL CHECK (old_class BETWEEN 0 AND 10),
  new_class INTEGER NOT NULL CHECK (new_class BETWEEN 0 AND 10),
  class_change INTEGER NOT NULL,  -- Negative = improvement, positive = degradation

  -- Reason
  reason TEXT NOT NULL,  -- 'good_history', 'claim_with_fault', 'annual_review', 'bonus_applied', 'malus_applied'
  booking_id UUID REFERENCES public.bookings(id),
  claim_id UUID REFERENCES public.booking_claims(id),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_class_history_user_id ON public.driver_class_history(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_class_history_created_at ON public.driver_class_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_class_history_reason ON public.driver_class_history(reason);

-- RLS Policies
ALTER TABLE public.driver_class_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own class history"
ON public.driver_class_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert class history"
ON public.driver_class_history FOR INSERT
WITH CHECK (true);  -- SECURITY DEFINER functions

-- Comments
COMMENT ON TABLE public.driver_class_history IS
'Audit trail of all driver class changes. Used for transparency and dispute resolution.';

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration creates all core tables for the Bonus-Malus system:
--
-- 1. driver_risk_profile: Driver classification and history
-- 2. pricing_class_factors: Multipliers for fees/guarantees by class
-- 3. driver_telemetry: GPS/accelerometer data for driving score
-- 4. driver_protection_addons: Purchased protections (bonus protector, etc.)
-- 5. booking_claims: Damage claims for bookings
-- 6. driver_class_history: Audit trail of class changes
--
-- Next migrations will:
-- - Seed pricing_class_factors with initial values (FASE 2)
-- - Create RPCs for driver profile management (FASE 3)
-- - Create RPCs for pricing calculations (FASE 3)
-- - Create RPCs for Autorentar Credit management (FASE 4)
-- - Create RPCs for protection addons (FASE 5)
-- - Create RPCs for telemetry (FASE 7)
-- ============================================================================

COMMIT;
