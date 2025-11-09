-- ============================================================================
-- Migration: Add encrypted PII columns to profiles and bank_accounts
-- ============================================================================
-- Date: 2025-11-09
-- Purpose: Add encrypted columns for PII data (phone, dni, addresses, etc.)
-- Related: Issue #1 - Día 1: Seguridad y Deployment Crítico
-- Security: Encrypted columns store Base64-encoded ciphertext
-- ============================================================================

-- ============================================================================
-- PART 1: Add encrypted columns to profiles table
-- ============================================================================

-- Phone numbers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_encrypted TEXT;

-- Government ID
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gov_id_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS dni_encrypted TEXT;

-- Driver license
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS driver_license_number_encrypted TEXT;

-- Address information
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_line1_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS address_line2_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS postal_code_encrypted TEXT;

-- ============================================================================
-- PART 2: Add encrypted columns to bank_accounts table
-- ============================================================================

-- Bank account details
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS cbu_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS alias_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS bank_name_encrypted TEXT;

-- ============================================================================
-- PART 3: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.profiles.phone_encrypted IS 'Encrypted phone number (Base64 ciphertext)';
COMMENT ON COLUMN public.profiles.whatsapp_encrypted IS 'Encrypted WhatsApp number (Base64 ciphertext)';
COMMENT ON COLUMN public.profiles.gov_id_number_encrypted IS 'Encrypted government ID number (Base64 ciphertext)';
COMMENT ON COLUMN public.profiles.dni_encrypted IS 'Encrypted DNI/CI number (Base64 ciphertext)';
COMMENT ON COLUMN public.profiles.driver_license_number_encrypted IS 'Encrypted driver license number (Base64 ciphertext)';
COMMENT ON COLUMN public.profiles.address_line1_encrypted IS 'Encrypted address line 1 (Base64 ciphertext)';
COMMENT ON COLUMN public.profiles.address_line2_encrypted IS 'Encrypted address line 2 (Base64 ciphertext)';
COMMENT ON COLUMN public.profiles.postal_code_encrypted IS 'Encrypted postal code (Base64 ciphertext)';

COMMENT ON COLUMN public.bank_accounts.account_number_encrypted IS 'Encrypted bank account number (Base64 ciphertext)';
COMMENT ON COLUMN public.bank_accounts.cbu_encrypted IS 'Encrypted CBU (Base64 ciphertext)';
COMMENT ON COLUMN public.bank_accounts.alias_encrypted IS 'Encrypted account alias (Base64 ciphertext)';
COMMENT ON COLUMN public.bank_accounts.bank_name_encrypted IS 'Encrypted bank name (Base64 ciphertext)';

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Verify encrypted columns exist in profiles
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name LIKE '%encrypted%';
-- Should return 8 columns

-- Verify encrypted columns exist in bank_accounts
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'bank_accounts' AND column_name LIKE '%encrypted%';
-- Should return 4 columns

