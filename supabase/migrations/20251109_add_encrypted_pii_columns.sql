-- ============================================================================
-- PII ENCRYPTION SYSTEM - Part 2: Add encrypted columns
-- Created: 2025-11-09
-- Priority: P0 CRITICAL (GDPR Compliance)
-- Dependencies: 20251109_enable_pgcrypto_and_pii_encryption_functions.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Add encrypted columns to profiles table
-- ============================================================================

ALTER TABLE public.profiles
  -- Phone numbers
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_encrypted TEXT,

  -- Address fields
  ADD COLUMN IF NOT EXISTS address_line1_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS address_line2_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS postal_code_encrypted TEXT,

  -- Identity documents (CRITICAL)
  ADD COLUMN IF NOT EXISTS dni_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS gov_id_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_number_encrypted TEXT;

-- Comments for documentation
COMMENT ON COLUMN public.profiles.phone_encrypted IS 'Encrypted phone number (AES-256)';
COMMENT ON COLUMN public.profiles.whatsapp_encrypted IS 'Encrypted WhatsApp number (AES-256)';
COMMENT ON COLUMN public.profiles.address_line1_encrypted IS 'Encrypted address line 1 (AES-256)';
COMMENT ON COLUMN public.profiles.address_line2_encrypted IS 'Encrypted address line 2 (AES-256)';
COMMENT ON COLUMN public.profiles.postal_code_encrypted IS 'Encrypted postal code (AES-256)';
COMMENT ON COLUMN public.profiles.dni_encrypted IS 'Encrypted DNI/national ID (AES-256) - CRITICAL PII';
COMMENT ON COLUMN public.profiles.gov_id_number_encrypted IS 'Encrypted government ID number (AES-256) - CRITICAL PII';
COMMENT ON COLUMN public.profiles.driver_license_number_encrypted IS 'Encrypted driver license number (AES-256) - CRITICAL PII';

-- ============================================================================
-- SECTION 2: Add encrypted columns to bank_accounts table
-- ============================================================================

ALTER TABLE public.bank_accounts
  -- Bank account details (CRITICAL)
  ADD COLUMN IF NOT EXISTS account_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS account_holder_document_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS account_holder_name_encrypted TEXT;

-- Comments
COMMENT ON COLUMN public.bank_accounts.account_number_encrypted IS 'Encrypted bank account number (AES-256) - CRITICAL PII';
COMMENT ON COLUMN public.bank_accounts.account_holder_document_encrypted IS 'Encrypted account holder document/ID (AES-256) - CRITICAL PII';
COMMENT ON COLUMN public.bank_accounts.account_holder_name_encrypted IS 'Encrypted account holder name (AES-256)';

-- ============================================================================
-- SECTION 3: Create indexes for encrypted columns
-- ============================================================================

-- Indexes for profiles (improve query performance)
CREATE INDEX IF NOT EXISTS idx_profiles_phone_encrypted
  ON public.profiles(phone_encrypted)
  WHERE phone_encrypted IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_dni_encrypted
  ON public.profiles(dni_encrypted)
  WHERE dni_encrypted IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_gov_id_encrypted
  ON public.profiles(gov_id_number_encrypted)
  WHERE gov_id_number_encrypted IS NOT NULL;

-- Indexes for bank_accounts
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number_encrypted
  ON public.bank_accounts(account_number_encrypted)
  WHERE account_number_encrypted IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_holder_document_encrypted
  ON public.bank_accounts(account_holder_document_encrypted)
  WHERE account_holder_document_encrypted IS NOT NULL;

-- ============================================================================
-- SECTION 4: Create triggers to auto-encrypt on INSERT/UPDATE (OPTIONAL)
-- ============================================================================

-- Trigger function: Auto-encrypt PII on INSERT/UPDATE
CREATE OR REPLACE FUNCTION trigger_encrypt_profile_pii()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-encrypt phone if provided and not already encrypted
  IF NEW.phone IS NOT NULL AND NEW.phone_encrypted IS NULL THEN
    NEW.phone_encrypted := encrypt_pii(NEW.phone);
  END IF;

  IF NEW.whatsapp IS NOT NULL AND NEW.whatsapp_encrypted IS NULL THEN
    NEW.whatsapp_encrypted := encrypt_pii(NEW.whatsapp);
  END IF;

  IF NEW.address_line1 IS NOT NULL AND NEW.address_line1_encrypted IS NULL THEN
    NEW.address_line1_encrypted := encrypt_pii(NEW.address_line1);
  END IF;

  IF NEW.address_line2 IS NOT NULL AND NEW.address_line2_encrypted IS NULL THEN
    NEW.address_line2_encrypted := encrypt_pii(NEW.address_line2);
  END IF;

  IF NEW.postal_code IS NOT NULL AND NEW.postal_code_encrypted IS NULL THEN
    NEW.postal_code_encrypted := encrypt_pii(NEW.postal_code);
  END IF;

  IF NEW.dni IS NOT NULL AND NEW.dni_encrypted IS NULL THEN
    NEW.dni_encrypted := encrypt_pii(NEW.dni);
  END IF;

  IF NEW.gov_id_number IS NOT NULL AND NEW.gov_id_number_encrypted IS NULL THEN
    NEW.gov_id_number_encrypted := encrypt_pii(NEW.gov_id_number);
  END IF;

  IF NEW.driver_license_number IS NOT NULL AND NEW.driver_license_number_encrypted IS NULL THEN
    NEW.driver_license_number_encrypted := encrypt_pii(NEW.driver_license_number);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to profiles table
CREATE TRIGGER encrypt_profile_pii_on_write
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_encrypt_profile_pii();

COMMENT ON TRIGGER encrypt_profile_pii_on_write ON public.profiles IS
  'Auto-encrypts PII fields on INSERT/UPDATE to ensure data is never stored in plaintext';

-- Trigger function for bank_accounts
CREATE OR REPLACE FUNCTION trigger_encrypt_bank_account_pii()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_number IS NOT NULL AND NEW.account_number_encrypted IS NULL THEN
    NEW.account_number_encrypted := encrypt_pii(NEW.account_number);
  END IF;

  IF NEW.account_holder_document IS NOT NULL AND NEW.account_holder_document_encrypted IS NULL THEN
    NEW.account_holder_document_encrypted := encrypt_pii(NEW.account_holder_document);
  END IF;

  IF NEW.account_holder_name IS NOT NULL AND NEW.account_holder_name_encrypted IS NULL THEN
    NEW.account_holder_name_encrypted := encrypt_pii(NEW.account_holder_name);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger
CREATE TRIGGER encrypt_bank_account_pii_on_write
  BEFORE INSERT OR UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_encrypt_bank_account_pii();

COMMENT ON TRIGGER encrypt_bank_account_pii_on_write ON public.bank_accounts IS
  'Auto-encrypts bank account PII fields on INSERT/UPDATE';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (for testing after deployment)
-- ============================================================================

-- Verify columns were added
/*
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE '%_encrypted'
ORDER BY column_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bank_accounts'
  AND column_name LIKE '%_encrypted'
ORDER BY column_name;
*/

-- Verify triggers exist
/*
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%encrypt%'
ORDER BY event_object_table, trigger_name;
*/

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

/*
-- Drop triggers
DROP TRIGGER IF EXISTS encrypt_profile_pii_on_write ON public.profiles;
DROP TRIGGER IF EXISTS encrypt_bank_account_pii_on_write ON public.bank_accounts;
DROP FUNCTION IF EXISTS trigger_encrypt_profile_pii();
DROP FUNCTION IF EXISTS trigger_encrypt_bank_account_pii();

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_phone_encrypted;
DROP INDEX IF EXISTS idx_profiles_dni_encrypted;
DROP INDEX IF EXISTS idx_profiles_gov_id_encrypted;
DROP INDEX IF EXISTS idx_bank_accounts_account_number_encrypted;
DROP INDEX IF EXISTS idx_bank_accounts_holder_document_encrypted;

-- Drop columns
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS phone_encrypted,
  DROP COLUMN IF EXISTS whatsapp_encrypted,
  DROP COLUMN IF EXISTS address_line1_encrypted,
  DROP COLUMN IF EXISTS address_line2_encrypted,
  DROP COLUMN IF EXISTS postal_code_encrypted,
  DROP COLUMN IF EXISTS dni_encrypted,
  DROP COLUMN IF EXISTS gov_id_number_encrypted,
  DROP COLUMN IF EXISTS driver_license_number_encrypted;

ALTER TABLE public.bank_accounts
  DROP COLUMN IF EXISTS account_number_encrypted,
  DROP COLUMN IF EXISTS account_holder_document_encrypted,
  DROP COLUMN IF EXISTS account_holder_name_encrypted;
*/
