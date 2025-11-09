-- ============================================================================
-- PII ENCRYPTION SYSTEM - Part 1: Setup pgcrypto and encryption functions
-- Created: 2025-11-09
-- Priority: P0 CRITICAL (GDPR Compliance)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Enable pgcrypto extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMENT ON EXTENSION pgcrypto IS 'Cryptographic functions for PII encryption (GDPR compliance)';

-- ============================================================================
-- STEP 2: Create encryption/decryption helper functions
-- ============================================================================

-- Function: encrypt_pii
-- Purpose: Encrypt sensitive PII data using AES-256
-- Usage: SELECT encrypt_pii('sensitive data');
CREATE OR REPLACE FUNCTION public.encrypt_pii(plaintext TEXT)
RETURNS TEXT AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Return NULL if input is NULL
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;

  -- Get encryption key from environment (Supabase Vault or environment variable)
  BEGIN
    encryption_key := current_setting('app.pii_encryption_key', TRUE);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'PII encryption key not configured. Set app.pii_encryption_key in Supabase Vault.';
  END;

  -- Check key exists
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'PII encryption key is empty. Configure app.pii_encryption_key.';
  END IF;

  -- Encrypt using AES-256-CBC and encode as base64
  RETURN encode(
    pgp_sym_encrypt(
      plaintext,
      encryption_key,
      'cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.encrypt_pii IS 'Encrypts PII data using AES-256. Requires app.pii_encryption_key to be set.';

-- Function: decrypt_pii
-- Purpose: Decrypt PII data encrypted with encrypt_pii()
-- Usage: SELECT decrypt_pii(encrypted_column);
CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted TEXT)
RETURNS TEXT AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Return NULL if input is NULL
  IF encrypted IS NULL OR encrypted = '' THEN
    RETURN NULL;
  END IF;

  -- Get encryption key from environment
  BEGIN
    encryption_key := current_setting('app.pii_encryption_key', TRUE);
  EXCEPTION
    WHEN OTHERS THEN
      -- If key not set, return NULL (don't crash)
      RETURN NULL;
  END;

  -- Check key exists
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN NULL;
  END IF;

  -- Decrypt: decode base64 then decrypt with AES-256
  RETURN pgp_sym_decrypt(
    decode(encrypted, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails (corrupted data, wrong key, etc.), return NULL
    -- This prevents crashes but logs should be monitored for failed decryptions
    RAISE WARNING 'PII decryption failed for value. Error: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.decrypt_pii IS 'Decrypts PII data. Returns NULL if decryption fails (prevents crashes).';

-- ============================================================================
-- STEP 3: Grant permissions
-- ============================================================================

-- Allow authenticated users to use encryption functions
GRANT EXECUTE ON FUNCTION public.encrypt_pii(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(TEXT) TO authenticated;

-- Allow service role (for migrations and admin operations)
GRANT EXECUTE ON FUNCTION public.encrypt_pii(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(TEXT) TO service_role;

-- ============================================================================
-- STEP 4: Test encryption/decryption
-- ============================================================================

-- Test function (commented out for production)
/*
DO $$
DECLARE
  test_plaintext TEXT := 'Test PII Data: +54 11 1234-5678';
  test_encrypted TEXT;
  test_decrypted TEXT;
BEGIN
  -- Test encryption
  test_encrypted := encrypt_pii(test_plaintext);
  RAISE NOTICE 'Encrypted: %', test_encrypted;

  -- Test decryption
  test_decrypted := decrypt_pii(test_encrypted);
  RAISE NOTICE 'Decrypted: %', test_decrypted;

  -- Verify round-trip
  IF test_decrypted = test_plaintext THEN
    RAISE NOTICE '✅ Encryption test PASSED';
  ELSE
    RAISE EXCEPTION '❌ Encryption test FAILED: decrypted value does not match original';
  END IF;
END $$;
*/

COMMIT;

-- ============================================================================
-- NOTES FOR DEPLOYMENT
-- ============================================================================

-- Before running this migration:
-- 1. Generate encryption key: openssl rand -base64 32
-- 2. Store key in Supabase Vault:
--    SELECT vault.create_secret('pii-encryption-key', '<your-key-here>');
-- 3. Or set environment variable: PII_ENCRYPTION_KEY=<your-key>
-- 4. Configure PostgreSQL to load the key:
--    ALTER DATABASE postgres SET app.pii_encryption_key = '<your-key>';
--    -- OR use Supabase Vault (recommended)

-- To test after deployment:
-- SELECT encrypt_pii('test data');
-- SELECT decrypt_pii(encrypt_pii('test data'));

-- Rollback instructions:
-- DROP FUNCTION IF EXISTS public.decrypt_pii(TEXT);
-- DROP FUNCTION IF EXISTS public.encrypt_pii(TEXT);
-- DROP EXTENSION IF EXISTS pgcrypto CASCADE;
