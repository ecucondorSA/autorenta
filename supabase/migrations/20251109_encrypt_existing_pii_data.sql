-- ============================================================================
-- PII ENCRYPTION SYSTEM - Part 3: Encrypt existing data
-- Created: 2025-11-09
-- Priority: P0 CRITICAL (GDPR Compliance)
-- Dependencies:
--   - 20251109_enable_pgcrypto_and_pii_encryption_functions.sql
--   - 20251109_add_encrypted_pii_columns.sql
-- ============================================================================

-- ⚠️ WARNING: This migration should be run during LOW TRAFFIC hours
-- ⚠️ Estimated time: 5-10 minutes for 10,000 profiles
-- ⚠️ IMPORTANT: Ensure encryption key is set before running

BEGIN;

-- ============================================================================
-- SECTION 1: Pre-flight checks
-- ============================================================================

-- Verify pgcrypto is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE EXCEPTION 'pgcrypto extension not found. Run 20251109_enable_pgcrypto_and_pii_encryption_functions.sql first.';
  END IF;
END $$;

-- Verify encryption functions exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'encrypt_pii'
  ) THEN
    RAISE EXCEPTION 'encrypt_pii() function not found. Run 20251109_enable_pgcrypto_and_pii_encryption_functions.sql first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'decrypt_pii'
  ) THEN
    RAISE EXCEPTION 'decrypt_pii() function not found. Run 20251109_enable_pgcrypto_and_pii_encryption_functions.sql first.';
  END IF;
END $$;

-- Verify encrypted columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_encrypted'
  ) THEN
    RAISE EXCEPTION 'Encrypted columns not found in profiles table. Run 20251109_add_encrypted_pii_columns.sql first.';
  END IF;
END $$;

RAISE NOTICE '✅ Pre-flight checks passed. Starting data encryption...';

-- ============================================================================
-- SECTION 2: Encrypt profiles table
-- ============================================================================

RAISE NOTICE 'Encrypting profiles table...';

-- Count profiles to encrypt
DO $$
DECLARE
  total_profiles INT;
  profiles_with_phone INT;
  profiles_with_dni INT;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM profiles;
  SELECT COUNT(*) INTO profiles_with_phone FROM profiles WHERE phone IS NOT NULL;
  SELECT COUNT(*) INTO profiles_with_dni FROM profiles WHERE dni IS NOT NULL OR gov_id_number IS NOT NULL;

  RAISE NOTICE 'Total profiles: %', total_profiles;
  RAISE NOTICE 'Profiles with phone: %', profiles_with_phone;
  RAISE NOTICE 'Profiles with DNI/gov_id: %', profiles_with_dni;
END $$;

-- Encrypt phone numbers
UPDATE profiles
SET phone_encrypted = encrypt_pii(phone)
WHERE phone IS NOT NULL
  AND phone_encrypted IS NULL;

RAISE NOTICE '✅ Phone numbers encrypted';

-- Encrypt WhatsApp numbers
UPDATE profiles
SET whatsapp_encrypted = encrypt_pii(whatsapp)
WHERE whatsapp IS NOT NULL
  AND whatsapp_encrypted IS NULL;

RAISE NOTICE '✅ WhatsApp numbers encrypted';

-- Encrypt addresses
UPDATE profiles
SET
  address_line1_encrypted = encrypt_pii(address_line1),
  address_line2_encrypted = encrypt_pii(address_line2),
  postal_code_encrypted = encrypt_pii(postal_code)
WHERE (address_line1 IS NOT NULL OR address_line2 IS NOT NULL OR postal_code IS NOT NULL)
  AND address_line1_encrypted IS NULL;

RAISE NOTICE '✅ Addresses encrypted';

-- Encrypt identity documents (CRITICAL PII)
UPDATE profiles
SET
  dni_encrypted = encrypt_pii(dni),
  gov_id_number_encrypted = encrypt_pii(gov_id_number),
  driver_license_number_encrypted = encrypt_pii(driver_license_number)
WHERE (dni IS NOT NULL OR gov_id_number IS NOT NULL OR driver_license_number IS NOT NULL)
  AND dni_encrypted IS NULL;

RAISE NOTICE '✅ Identity documents encrypted';

-- ============================================================================
-- SECTION 3: Verify profiles encryption
-- ============================================================================

DO $$
DECLARE
  plaintext_phone_count INT;
  encrypted_phone_count INT;
  plaintext_dni_count INT;
  encrypted_dni_count INT;
  test_plaintext TEXT;
  test_encrypted TEXT;
  test_decrypted TEXT;
BEGIN
  -- Count verification
  SELECT COUNT(*) INTO plaintext_phone_count FROM profiles WHERE phone IS NOT NULL;
  SELECT COUNT(*) INTO encrypted_phone_count FROM profiles WHERE phone_encrypted IS NOT NULL;

  SELECT COUNT(*) INTO plaintext_dni_count
  FROM profiles
  WHERE dni IS NOT NULL OR gov_id_number IS NOT NULL;

  SELECT COUNT(*) INTO encrypted_dni_count
  FROM profiles
  WHERE dni_encrypted IS NOT NULL OR gov_id_number_encrypted IS NOT NULL;

  RAISE NOTICE 'Plaintext phones: %, Encrypted phones: %', plaintext_phone_count, encrypted_phone_count;
  RAISE NOTICE 'Plaintext DNIs: %, Encrypted DNIs: %', plaintext_dni_count, encrypted_dni_count;

  -- Encryption/decryption round-trip test
  IF encrypted_phone_count > 0 THEN
    SELECT phone, phone_encrypted INTO test_plaintext, test_encrypted
    FROM profiles
    WHERE phone_encrypted IS NOT NULL
    LIMIT 1;

    test_decrypted := decrypt_pii(test_encrypted);

    IF test_decrypted != test_plaintext THEN
      RAISE EXCEPTION 'Encryption verification FAILED: decrypted value does not match original. Expected: %, Got: %',
        test_plaintext, test_decrypted;
    END IF;

    RAISE NOTICE '✅ Encryption round-trip test PASSED';
  END IF;

  -- Final verification
  IF plaintext_phone_count != encrypted_phone_count THEN
    RAISE WARNING 'Phone encryption count mismatch: % plaintext, % encrypted',
      plaintext_phone_count, encrypted_phone_count;
  END IF;

  IF plaintext_dni_count != encrypted_dni_count THEN
    RAISE WARNING 'DNI encryption count mismatch: % plaintext, % encrypted',
      plaintext_dni_count, encrypted_dni_count;
  END IF;

  RAISE NOTICE '✅ Profiles encryption verification complete';
END $$;

-- ============================================================================
-- SECTION 4: Encrypt bank_accounts table
-- ============================================================================

RAISE NOTICE 'Encrypting bank_accounts table...';

-- Count bank accounts to encrypt
DO $$
DECLARE
  total_accounts INT;
BEGIN
  SELECT COUNT(*) INTO total_accounts FROM bank_accounts;
  RAISE NOTICE 'Total bank accounts: %', total_accounts;
END $$;

-- Encrypt account numbers (CRITICAL)
UPDATE bank_accounts
SET
  account_number_encrypted = encrypt_pii(account_number),
  account_holder_document_encrypted = encrypt_pii(account_holder_document),
  account_holder_name_encrypted = encrypt_pii(account_holder_name)
WHERE account_number IS NOT NULL
  AND account_number_encrypted IS NULL;

RAISE NOTICE '✅ Bank accounts encrypted';

-- ============================================================================
-- SECTION 5: Verify bank_accounts encryption
-- ============================================================================

DO $$
DECLARE
  total_accounts INT;
  encrypted_accounts INT;
  test_plaintext TEXT;
  test_encrypted TEXT;
  test_decrypted TEXT;
BEGIN
  SELECT COUNT(*) INTO total_accounts FROM bank_accounts;
  SELECT COUNT(*) INTO encrypted_accounts FROM bank_accounts WHERE account_number_encrypted IS NOT NULL;

  RAISE NOTICE 'Total bank accounts: %, Encrypted: %', total_accounts, encrypted_accounts;

  -- Round-trip test
  IF encrypted_accounts > 0 THEN
    SELECT account_number, account_number_encrypted INTO test_plaintext, test_encrypted
    FROM bank_accounts
    WHERE account_number_encrypted IS NOT NULL
    LIMIT 1;

    test_decrypted := decrypt_pii(test_encrypted);

    IF test_decrypted != test_plaintext THEN
      RAISE EXCEPTION 'Bank account encryption verification FAILED: decrypted value does not match original';
    END IF;

    RAISE NOTICE '✅ Bank account encryption round-trip test PASSED';
  END IF;

  IF total_accounts != encrypted_accounts THEN
    RAISE EXCEPTION 'Bank account encryption verification FAILED: % total, but only % encrypted',
      total_accounts, encrypted_accounts;
  END IF;

  RAISE NOTICE '✅ Bank accounts encryption verification complete';
END $$;

-- ============================================================================
-- SECTION 6: Final summary
-- ============================================================================

DO $$
DECLARE
  total_profiles_encrypted INT;
  total_accounts_encrypted INT;
BEGIN
  SELECT COUNT(*) INTO total_profiles_encrypted
  FROM profiles
  WHERE phone_encrypted IS NOT NULL
     OR dni_encrypted IS NOT NULL
     OR gov_id_number_encrypted IS NOT NULL;

  SELECT COUNT(*) INTO total_accounts_encrypted
  FROM bank_accounts
  WHERE account_number_encrypted IS NOT NULL;

  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ PII ENCRYPTION MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'Profiles encrypted: %', total_profiles_encrypted;
  RAISE NOTICE 'Bank accounts encrypted: %', total_accounts_encrypted;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify encryption in production';
  RAISE NOTICE '2. Test decryption views';
  RAISE NOTICE '3. Update application services';
  RAISE NOTICE '4. Monitor performance metrics';
  RAISE NOTICE '5. (OPTIONAL) Drop plaintext columns after verification';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Run these queries AFTER migration to verify:

/*
-- 1. Check encryption coverage
SELECT
  COUNT(*) as total_profiles,
  COUNT(phone_encrypted) as phones_encrypted,
  COUNT(dni_encrypted) as dni_encrypted,
  COUNT(address_line1_encrypted) as addresses_encrypted
FROM profiles;

-- 2. Test decryption (sample)
SELECT
  id,
  phone,
  decrypt_pii(phone_encrypted) as decrypted_phone,
  phone = decrypt_pii(phone_encrypted) as matches
FROM profiles
WHERE phone_encrypted IS NOT NULL
LIMIT 5;

-- 3. Check bank accounts
SELECT
  COUNT(*) as total_accounts,
  COUNT(account_number_encrypted) as encrypted_accounts
FROM bank_accounts;

-- 4. Verify no NULL encrypted values where plaintext exists
SELECT
  COUNT(*) as missing_encryption
FROM profiles
WHERE phone IS NOT NULL AND phone_encrypted IS NULL;
*/

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

/*
-- If issues arise, clear encrypted columns (plaintext still intact):
UPDATE profiles SET
  phone_encrypted = NULL,
  whatsapp_encrypted = NULL,
  address_line1_encrypted = NULL,
  address_line2_encrypted = NULL,
  postal_code_encrypted = NULL,
  dni_encrypted = NULL,
  gov_id_number_encrypted = NULL,
  driver_license_number_encrypted = NULL;

UPDATE bank_accounts SET
  account_number_encrypted = NULL,
  account_holder_document_encrypted = NULL,
  account_holder_name_encrypted = NULL;
*/
