-- Migration: BYOI Insurance Verification System
-- Date: 2025-12-30
-- Description: Adds mandatory insurance verification for car listings
--
-- CRITICAL: During pilot phase, cars CANNOT be activated without verified insurance.
-- This migration enforces BYOI (Bring Your Own Insurance) policy.

-- =============================================================================
-- 1. ADD INSURANCE VERIFICATION COLUMNS TO CARS
-- =============================================================================

-- Insurance verification status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insurance_verification_status') THEN
    CREATE TYPE insurance_verification_status AS ENUM (
      'not_uploaded',      -- No insurance document uploaded
      'pending',           -- Document uploaded, awaiting admin review
      'verified',          -- Admin verified, insurance is valid
      'rejected',          -- Admin rejected (invalid document/coverage)
      'expired'            -- Insurance has expired
    );
  END IF;
END $$;

-- Add columns if they don't exist
ALTER TABLE cars
ADD COLUMN IF NOT EXISTS insurance_status insurance_verification_status DEFAULT 'not_uploaded',
ADD COLUMN IF NOT EXISTS insurance_document_url TEXT,
ADD COLUMN IF NOT EXISTS insurance_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS insurance_verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS insurance_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS has_owner_insurance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS insurance_coverage_type TEXT; -- 'personal_endorsed' or 'fleet'

-- Comments
COMMENT ON COLUMN cars.insurance_status IS 'BYOI verification status - must be "verified" for car to be active';
COMMENT ON COLUMN cars.insurance_document_url IS 'URL to uploaded insurance policy document';
COMMENT ON COLUMN cars.insurance_verified_at IS 'Timestamp when insurance was verified by admin';
COMMENT ON COLUMN cars.insurance_verified_by IS 'Admin user who verified the insurance';
COMMENT ON COLUMN cars.insurance_rejection_reason IS 'Reason if insurance was rejected';
COMMENT ON COLUMN cars.has_owner_insurance IS 'True if owner has verified BYOI insurance';
COMMENT ON COLUMN cars.insurance_coverage_type IS 'Type: personal_endorsed (with endorsement) or fleet (commercial)';

-- =============================================================================
-- 2. CREATE INSURANCE VERIFICATION TRACKING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS insurance_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),

  -- Document info
  document_url TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'policy_pdf', 'policy_image', 'endorsement'

  -- Extracted/entered data
  policy_number TEXT,
  insurer TEXT,
  coverage_type TEXT, -- 'personal_endorsed', 'fleet', 'third_party'
  expiry_date DATE,
  policyholder_name TEXT,
  vehicle_plate TEXT,

  -- Coverage details
  has_rc_coverage BOOLEAN DEFAULT FALSE,
  has_own_damage_coverage BOOLEAN DEFAULT FALSE,
  has_theft_coverage BOOLEAN DEFAULT FALSE,
  has_rental_endorsement BOOLEAN DEFAULT FALSE, -- CRITICAL: must be true
  rc_amount NUMERIC(15,2),

  -- Verification
  status insurance_verification_status DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_insurance_verifications_car_id ON insurance_verifications(car_id);
CREATE INDEX IF NOT EXISTS idx_insurance_verifications_status ON insurance_verifications(status);
CREATE INDEX IF NOT EXISTS idx_insurance_verifications_expiry ON insurance_verifications(expiry_date);

-- RLS
ALTER TABLE insurance_verifications ENABLE ROW LEVEL SECURITY;

-- Owners can view their own insurance verifications
CREATE POLICY "owners_view_own_insurance" ON insurance_verifications
  FOR SELECT USING (owner_id = auth.uid());

-- Owners can insert new insurance verifications
CREATE POLICY "owners_insert_insurance" ON insurance_verifications
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Service role can manage all
CREATE POLICY "service_role_manage_insurance" ON insurance_verifications
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role' OR
    (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- =============================================================================
-- 3. FUNCTION: Submit Insurance for Verification
-- =============================================================================

CREATE OR REPLACE FUNCTION submit_insurance_verification(
  p_car_id UUID,
  p_document_url TEXT,
  p_policy_number TEXT,
  p_insurer TEXT,
  p_expiry_date DATE,
  p_coverage_type TEXT DEFAULT 'personal_endorsed',
  p_has_rental_endorsement BOOLEAN DEFAULT TRUE,
  p_rc_amount NUMERIC DEFAULT 50000000
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_verification_id UUID;
BEGIN
  -- Get car owner
  SELECT owner_id INTO v_owner_id FROM cars WHERE id = p_car_id;

  -- Verify caller is the owner
  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Solo el propietario puede subir documentos de seguro';
  END IF;

  -- Validate expiry date (must be at least 60 days in future)
  IF p_expiry_date < CURRENT_DATE + INTERVAL '60 days' THEN
    RAISE EXCEPTION 'La póliza debe tener al menos 60 días de vigencia';
  END IF;

  -- Insert verification record
  INSERT INTO insurance_verifications (
    car_id,
    owner_id,
    document_url,
    document_type,
    policy_number,
    insurer,
    coverage_type,
    expiry_date,
    has_rental_endorsement,
    has_rc_coverage,
    rc_amount,
    status
  ) VALUES (
    p_car_id,
    v_owner_id,
    p_document_url,
    'policy_pdf',
    p_policy_number,
    p_insurer,
    p_coverage_type,
    p_expiry_date,
    p_has_rental_endorsement,
    TRUE,
    p_rc_amount,
    'pending'
  )
  RETURNING id INTO v_verification_id;

  -- Update car status
  UPDATE cars SET
    insurance_status = 'pending',
    insurance_document_url = p_document_url,
    insurance_policy_number = p_policy_number,
    insurance_company = p_insurer,
    insurance_expires_at = p_expiry_date,
    insurance_coverage_type = p_coverage_type,
    updated_at = NOW()
  WHERE id = p_car_id;

  RETURN v_verification_id;
END;
$$;

-- =============================================================================
-- 4. FUNCTION: Admin Verify Insurance
-- =============================================================================

CREATE OR REPLACE FUNCTION admin_verify_insurance(
  p_verification_id UUID,
  p_approved BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car_id UUID;
  v_expiry_date DATE;
BEGIN
  -- Get verification record
  SELECT car_id, expiry_date INTO v_car_id, v_expiry_date
  FROM insurance_verifications
  WHERE id = p_verification_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verificación no encontrada';
  END IF;

  IF p_approved THEN
    -- Approve insurance
    UPDATE insurance_verifications SET
      status = 'verified',
      verified_by = auth.uid(),
      verified_at = NOW(),
      admin_notes = p_admin_notes,
      updated_at = NOW()
    WHERE id = p_verification_id;

    -- Update car
    UPDATE cars SET
      insurance_status = 'verified',
      insurance_verified_at = NOW(),
      insurance_verified_by = auth.uid(),
      has_owner_insurance = TRUE,
      updated_at = NOW()
    WHERE id = v_car_id;

  ELSE
    -- Reject insurance
    IF p_rejection_reason IS NULL THEN
      RAISE EXCEPTION 'Se requiere motivo de rechazo';
    END IF;

    UPDATE insurance_verifications SET
      status = 'rejected',
      verified_by = auth.uid(),
      verified_at = NOW(),
      rejection_reason = p_rejection_reason,
      admin_notes = p_admin_notes,
      updated_at = NOW()
    WHERE id = p_verification_id;

    -- Update car
    UPDATE cars SET
      insurance_status = 'rejected',
      insurance_rejection_reason = p_rejection_reason,
      updated_at = NOW()
    WHERE id = v_car_id;
  END IF;
END;
$$;

-- =============================================================================
-- 5. FUNCTION: Block Car Activation Without Insurance
-- =============================================================================

CREATE OR REPLACE FUNCTION check_car_can_activate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check when changing TO 'active' status
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN

    -- Check insurance is verified
    IF NEW.insurance_status IS NULL OR NEW.insurance_status != 'verified' THEN
      RAISE EXCEPTION 'BYOI_REQUIRED: No se puede activar el auto sin seguro verificado. Por favor sube tu póliza de seguro.';
    END IF;

    -- Check insurance is not expired
    IF NEW.insurance_expires_at IS NOT NULL AND NEW.insurance_expires_at < NOW() THEN
      -- Auto-update status to expired
      NEW.insurance_status := 'expired';
      NEW.has_owner_insurance := FALSE;
      RAISE EXCEPTION 'INSURANCE_EXPIRED: La póliza de seguro ha vencido. Por favor actualiza tu seguro.';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS tr_check_car_can_activate ON cars;
CREATE TRIGGER tr_check_car_can_activate
  BEFORE UPDATE ON cars
  FOR EACH ROW
  EXECUTE FUNCTION check_car_can_activate();

-- =============================================================================
-- 6. FUNCTION: Auto-Expire Insurance
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_expire_insurance()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- Find and expire cars with expired insurance
  WITH expired_cars AS (
    UPDATE cars SET
      insurance_status = 'expired',
      has_owner_insurance = FALSE,
      status = CASE
        WHEN status = 'active' THEN 'pending_insurance'
        ELSE status
      END,
      updated_at = NOW()
    WHERE insurance_expires_at < NOW()
      AND insurance_status = 'verified'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_count FROM expired_cars;

  -- Also expire in verifications table
  UPDATE insurance_verifications SET
    status = 'expired',
    updated_at = NOW()
  WHERE expiry_date < CURRENT_DATE
    AND status = 'verified';

  RETURN v_expired_count;
END;
$$;

-- =============================================================================
-- 7. CRON JOB: Check Insurance Expiration Daily
-- =============================================================================

-- Note: Requires pg_cron extension. Run this in dashboard or with superuser.
-- SELECT cron.schedule('check-insurance-expiration', '0 3 * * *', 'SELECT auto_expire_insurance()');

-- =============================================================================
-- 8. VIEW: Cars Pending Insurance Verification
-- =============================================================================

CREATE OR REPLACE VIEW v_cars_pending_insurance AS
SELECT
  c.id AS car_id,
  c.owner_id,
  p.full_name AS owner_name,
  p.email AS owner_email,
  c.brand_text_backup AS brand,
  c.model_text_backup AS model,
  c.year,
  c.insurance_status,
  c.insurance_document_url,
  c.insurance_policy_number,
  c.insurance_company,
  c.insurance_expires_at,
  iv.id AS verification_id,
  iv.created_at AS submitted_at,
  iv.has_rental_endorsement,
  iv.rc_amount
FROM cars c
JOIN profiles p ON c.owner_id = p.id
LEFT JOIN insurance_verifications iv ON c.id = iv.car_id AND iv.status = 'pending'
WHERE c.insurance_status = 'pending'
ORDER BY iv.created_at ASC;

-- =============================================================================
-- 9. ADD STATUS 'pending_insurance' to car status enum if not exists
-- =============================================================================

-- Check if 'pending_insurance' value exists in car_status enum
DO $$
BEGIN
  -- Try to add the value, ignore if it already exists
  BEGIN
    ALTER TYPE car_status ADD VALUE IF NOT EXISTS 'pending_insurance';
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Value already exists
    WHEN undefined_object THEN
      -- Enum might not exist, create it
      CREATE TYPE car_status AS ENUM ('draft', 'pending_insurance', 'active', 'inactive', 'deleted');
  END;
END $$;

-- =============================================================================
-- 10. GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION submit_insurance_verification TO authenticated;
GRANT EXECUTE ON FUNCTION admin_verify_insurance TO service_role;
GRANT EXECUTE ON FUNCTION auto_expire_insurance TO service_role;
GRANT SELECT ON v_cars_pending_insurance TO service_role;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'BYOI Insurance Verification System installed successfully';
  RAISE NOTICE 'IMPORTANT: Cars cannot be activated without verified insurance';
END $$;
