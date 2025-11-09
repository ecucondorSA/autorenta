-- ============================================================================
-- Migration: Encrypt existing PII data
-- ============================================================================
-- Date: 2025-11-09
-- Purpose: Migrate existing plaintext PII data to encrypted columns
-- Related: Issue #1 - Día 1: Seguridad y Deployment Crítico
-- WARNING: BACKUP DATABASE BEFORE RUNNING THIS MIGRATION
-- ============================================================================

-- ============================================================================
-- PART 1: Encrypt existing data in profiles table
-- ============================================================================

-- Encrypt phone numbers
UPDATE public.profiles
SET phone_encrypted = encrypt_pii(phone)
WHERE phone IS NOT NULL AND phone_encrypted IS NULL;

UPDATE public.profiles
SET whatsapp_encrypted = encrypt_pii(whatsapp)
WHERE whatsapp IS NOT NULL AND whatsapp_encrypted IS NULL;

-- Encrypt government ID (try both columns)
UPDATE public.profiles
SET gov_id_number_encrypted = encrypt_pii(gov_id_number)
WHERE gov_id_number IS NOT NULL AND gov_id_number_encrypted IS NULL;

UPDATE public.profiles
SET dni_encrypted = encrypt_pii(dni)
WHERE dni IS NOT NULL AND dni_encrypted IS NULL;

-- Encrypt driver license
UPDATE public.profiles
SET driver_license_number_encrypted = encrypt_pii(driver_license_number)
WHERE driver_license_number IS NOT NULL AND driver_license_number_encrypted IS NULL;

-- Encrypt address information
UPDATE public.profiles
SET address_line1_encrypted = encrypt_pii(address_line1)
WHERE address_line1 IS NOT NULL AND address_line1_encrypted IS NULL;

UPDATE public.profiles
SET address_line2_encrypted = encrypt_pii(address_line2)
WHERE address_line2 IS NOT NULL AND address_line2_encrypted IS NULL;

UPDATE public.profiles
SET postal_code_encrypted = encrypt_pii(postal_code)
WHERE postal_code IS NOT NULL AND postal_code_encrypted IS NULL;

-- ============================================================================
-- PART 2: Encrypt existing data in bank_accounts table
-- ============================================================================

-- Note: Adjust column names based on actual bank_accounts schema
-- These are placeholder column names - verify actual schema first

-- UPDATE public.bank_accounts
-- SET account_number_encrypted = encrypt_pii(account_number)
-- WHERE account_number IS NOT NULL AND account_number_encrypted IS NULL;

-- UPDATE public.bank_accounts
-- SET cbu_encrypted = encrypt_pii(cbu)
-- WHERE cbu IS NOT NULL AND cbu_encrypted IS NULL;

-- UPDATE public.bank_accounts
-- SET alias_encrypted = encrypt_pii(alias)
-- WHERE alias IS NOT NULL AND alias_encrypted IS NULL;

-- UPDATE public.bank_accounts
-- SET bank_name_encrypted = encrypt_pii(bank_name)
-- WHERE bank_name IS NOT NULL AND bank_name_encrypted IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Verify encryption counts match
-- SELECT
--   COUNT(*) FILTER (WHERE phone IS NOT NULL) as phone_count,
--   COUNT(*) FILTER (WHERE phone_encrypted IS NOT NULL) as phone_encrypted_count
-- FROM profiles;
-- phone_count SHOULD EQUAL phone_encrypted_count

-- Test decryption (should return original values)
-- SELECT 
--   id,
--   phone,
--   decrypt_pii(phone_encrypted) as phone_decrypted,
--   phone = decrypt_pii(phone_encrypted) as matches
-- FROM profiles
-- WHERE phone_encrypted IS NOT NULL
-- LIMIT 5;

