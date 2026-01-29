-- ============================================================================
-- Migration: Add Document Verification Fields
-- Description: Add fields to user_identity_levels for OCR verification
-- Date: 2025-12-25
-- ============================================================================

-- Add country field
ALTER TABLE user_identity_levels
ADD COLUMN IF NOT EXISTS country TEXT CHECK (country IN ('AR', 'EC'));

COMMENT ON COLUMN user_identity_levels.country IS 'AR=Argentina, EC=Ecuador';

-- Add document fields
ALTER TABLE user_identity_levels
ADD COLUMN IF NOT EXISTS document_type TEXT CHECK (document_type IN ('DNI', 'CEDULA', 'PASAPORTE', 'LC', 'LE', 'CI')),
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS document_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS document_ai_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS document_province TEXT;

COMMENT ON COLUMN user_identity_levels.document_type IS 'DNI=Argentina, CEDULA=Ecuador, etc.';
COMMENT ON COLUMN user_identity_levels.document_ai_score IS 'AI confidence score 0-100';
COMMENT ON COLUMN user_identity_levels.document_province IS 'Ecuador province from cedula code';

-- Add extracted data fields
ALTER TABLE user_identity_levels
ADD COLUMN IF NOT EXISTS extracted_full_name TEXT,
ADD COLUMN IF NOT EXISTS extracted_birth_date DATE,
ADD COLUMN IF NOT EXISTS extracted_gender TEXT CHECK (extracted_gender IN ('M', 'F')),
ADD COLUMN IF NOT EXISTS extracted_nationality TEXT;

-- Add Argentina-specific fields
ALTER TABLE user_identity_levels
ADD COLUMN IF NOT EXISTS cuil TEXT;

COMMENT ON COLUMN user_identity_levels.cuil IS 'Argentina CUIL/CUIT number (XX-XXXXXXXX-X)';

-- Add driver license fields
ALTER TABLE user_identity_levels
ADD COLUMN IF NOT EXISTS driver_license_number TEXT,
ADD COLUMN IF NOT EXISTS driver_license_categories TEXT[],
ADD COLUMN IF NOT EXISTS driver_license_expiry DATE,
ADD COLUMN IF NOT EXISTS driver_license_professional BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS driver_license_ai_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS driver_license_points INTEGER;

COMMENT ON COLUMN user_identity_levels.driver_license_categories IS 'Array of license categories (A1, B2, C1, etc.)';
COMMENT ON COLUMN user_identity_levels.driver_license_professional IS 'True if professional license (C1, D1, E1)';
COMMENT ON COLUMN user_identity_levels.driver_license_points IS 'Ecuador license points (30 max)';

-- Add OCR metadata fields
ALTER TABLE user_identity_levels
ADD COLUMN IF NOT EXISTS last_ocr_text_preview TEXT,
ADD COLUMN IF NOT EXISTS last_ocr_confidence NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS last_ocr_has_face BOOLEAN,
ADD COLUMN IF NOT EXISTS last_ocr_face_confidence NUMERIC(5,2);

COMMENT ON COLUMN user_identity_levels.last_ocr_text_preview IS 'First 500 chars of OCR text for debugging';

-- Add selfie/face verification fields (Level 3)
ALTER TABLE user_identity_levels
ADD COLUMN IF NOT EXISTS selfie_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS face_match_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS liveness_score NUMERIC(5,2);

-- Add manual review fields
ALTER TABLE user_identity_levels
ADD COLUMN IF NOT EXISTS manual_review_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manual_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS manual_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manual_review_decision TEXT CHECK (manual_review_decision IN ('APPROVED', 'REJECTED', 'PENDING'));

-- Add phone number field
ALTER TABLE user_identity_levels
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_identity_levels_country ON user_identity_levels(country);
CREATE INDEX IF NOT EXISTS idx_user_identity_levels_document_number ON user_identity_levels(document_number);

-- ============================================================================
-- Add document_kind enum values if not exist
-- ============================================================================

-- Check if document_kind type exists and add values
DO $$
BEGIN
  -- Add new values to document_kind enum if they don't exist
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_kind') THEN
    BEGIN
      ALTER TYPE document_kind ADD VALUE IF NOT EXISTS 'dni_front';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE document_kind ADD VALUE IF NOT EXISTS 'dni_back';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE document_kind ADD VALUE IF NOT EXISTS 'cedula_front';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE document_kind ADD VALUE IF NOT EXISTS 'cedula_back';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- Add metadata column to user_documents if not exists
-- ============================================================================

ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN user_documents.metadata IS 'OCR and validation metadata from verify-document';

-- ============================================================================
-- Done
-- ============================================================================
