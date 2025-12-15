-- =============================================================================
-- Migration: Enhance Booking Contracts for Legal Compliance
-- Date: 2025-12-14
-- Description: Adds audit trail, PDF generation, and granular clause tracking
--              to support legal contract system with Ley 25.506 compliance
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend booking_contracts table
-- -----------------------------------------------------------------------------

-- Add columns one by one to avoid syntax issues with reserved words
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS contract_version TEXT NOT NULL DEFAULT 'v1.0.0';
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS contract_locale TEXT NOT NULL DEFAULT 'es-AR';
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS renter_ip_address INET;
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS renter_user_agent TEXT;
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS renter_device_fingerprint TEXT;
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS pdf_generation_status TEXT DEFAULT 'pending';
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS pdf_error TEXT;
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS contract_data JSONB;
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS clauses_accepted JSONB;
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add check constraint for pdf_generation_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_contracts_pdf_status_check'
  ) THEN
    ALTER TABLE booking_contracts ADD CONSTRAINT booking_contracts_pdf_status_check
      CHECK (pdf_generation_status IN ('pending', 'generating', 'ready', 'failed'));
  END IF;
END $$;

COMMENT ON COLUMN booking_contracts.contract_version IS 'Semantic version of contract template (e.g., v1.0.0)';
COMMENT ON COLUMN booking_contracts.contract_locale IS 'Language/region of contract (e.g., es-AR, en-US)';
COMMENT ON COLUMN booking_contracts.renter_ip_address IS 'IP address at time of acceptance (legal audit trail)';
COMMENT ON COLUMN booking_contracts.renter_user_agent IS 'Browser User-Agent at acceptance (legal audit trail)';
COMMENT ON COLUMN booking_contracts.renter_device_fingerprint IS 'Hashed device identifier for audit (non-PII)';
COMMENT ON COLUMN booking_contracts.pdf_generation_status IS 'Status of PDF generation: pending, generating, ready, failed';
COMMENT ON COLUMN booking_contracts.contract_data IS 'Immutable snapshot of booking data (renter name, car details, amounts, dates)';
COMMENT ON COLUMN booking_contracts.clauses_accepted IS 'Granular tracking: {culpaGrave, indemnidad, retencion, mora}';

-- -----------------------------------------------------------------------------
-- 2. Create indices for performance
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_booking_contracts_booking_id
  ON booking_contracts(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_contracts_pdf_status
  ON booking_contracts(pdf_generation_status)
  WHERE pdf_generation_status IN ('pending', 'generating');

CREATE INDEX IF NOT EXISTS idx_booking_contracts_version
  ON booking_contracts(contract_version, contract_locale);

-- -----------------------------------------------------------------------------
-- 3. Create Storage bucket for contract PDFs (private)
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'booking-contracts',
  'booking-contracts',
  false, -- Private bucket
  5242880, -- 5MB limit per PDF
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE storage.buckets IS 'Storage bucket for contract PDFs (private, RLS-protected)';

-- -----------------------------------------------------------------------------
-- 4. RLS Policy: Only renter and owner can download PDFs
-- -----------------------------------------------------------------------------

CREATE POLICY "contracts_download_participants"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'booking-contracts' AND
  EXISTS (
    SELECT 1 FROM booking_contracts bc
    JOIN bookings b ON b.id = bc.booking_id
    JOIN cars c ON c.id = b.car_id
    WHERE bc.pdf_storage_path = storage.objects.name
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

COMMENT ON POLICY "contracts_download_participants" ON storage.objects IS
  'Only booking renter and car owner can download contract PDFs';

-- -----------------------------------------------------------------------------
-- 5. Function: Generate device fingerprint (simple hash for audit trail)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_device_fingerprint(
  p_ip INET,
  p_user_agent TEXT
) RETURNS TEXT AS $$
BEGIN
  -- Simple MD5 hash of IP + User Agent
  -- Not for security, just for audit trail correlation
  RETURN md5(p_ip::TEXT || COALESCE(p_user_agent, ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

COMMENT ON FUNCTION generate_device_fingerprint IS
  'Generate non-PII device fingerprint for legal audit trail (Ley 25.506)';

-- -----------------------------------------------------------------------------
-- 6. Update trigger for updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_booking_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_booking_contracts_timestamp ON booking_contracts;

CREATE TRIGGER trigger_update_booking_contracts_timestamp
  BEFORE UPDATE ON booking_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_contracts_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Validation function: Check all 4 clauses accepted
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_contract_clauses_accepted(
  p_clauses_accepted JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  -- All 4 priority clauses must be true
  RETURN (
    (p_clauses_accepted->>'culpaGrave')::BOOLEAN = TRUE AND
    (p_clauses_accepted->>'indemnidad')::BOOLEAN = TRUE AND
    (p_clauses_accepted->>'retencion')::BOOLEAN = TRUE AND
    (p_clauses_accepted->>'mora')::BOOLEAN = TRUE
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_contract_clauses_accepted IS
  'Validates that all 4 priority clauses (culpaGrave, indemnidad, retencion, mora) are accepted';

-- -----------------------------------------------------------------------------
-- 8. Check constraint: Ensure all clauses accepted when accepted_by_renter=true
-- -----------------------------------------------------------------------------

ALTER TABLE booking_contracts
  DROP CONSTRAINT IF EXISTS check_clauses_when_accepted;

ALTER TABLE booking_contracts
  ADD CONSTRAINT check_clauses_when_accepted
  CHECK (
    NOT accepted_by_renter OR
    validate_contract_clauses_accepted(clauses_accepted)
  );

COMMENT ON CONSTRAINT check_clauses_when_accepted ON booking_contracts IS
  'Enforce all 4 clauses accepted when contract is accepted by renter';

-- -----------------------------------------------------------------------------
-- 9. Grant permissions
-- -----------------------------------------------------------------------------

-- Allow authenticated users to insert/update their own contracts
GRANT SELECT, INSERT, UPDATE ON booking_contracts TO authenticated;

-- Allow service role full access for edge functions
GRANT ALL ON booking_contracts TO service_role;

-- =============================================================================
-- End of migration
-- =============================================================================
