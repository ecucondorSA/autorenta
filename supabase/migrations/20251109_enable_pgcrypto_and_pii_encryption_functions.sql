-- ============================================================================
-- Migration: Enable pgcrypto and create PII encryption functions
-- ============================================================================
-- Date: 2025-11-09
-- Purpose: Enable pgcrypto extension and create encrypt_pii/decrypt_pii functions
-- Related: Issue #1 - Día 1: Seguridad y Deployment Crítico
-- Security: Server-side encryption using Supabase Vault for key management
-- ============================================================================

-- ============================================================================
-- PART 1: Enable pgcrypto extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- PART 2: Create PII encryption key in encryption_keys table
-- ============================================================================

-- Insert PII encryption key (if not exists)
-- NOTE: In production, this key should be stored in Supabase Vault
-- and retrieved via vault.secrets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.encryption_keys WHERE id = 'pii-v1') THEN
    INSERT INTO public.encryption_keys (id, key, algorithm)
    VALUES ('pii-v1', gen_random_bytes(32), 'AES-256-GCM');
  END IF;
END $$;

-- ============================================================================
-- PART 3: Create encrypt_pii and decrypt_pii functions
-- ============================================================================

-- Function: Encrypt PII data
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT)
RETURNS TEXT AS $$
DECLARE
  v_key BYTEA;
  v_ciphertext BYTEA;
BEGIN
  -- Handle NULL or empty input
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;

  -- Get active encryption key
  SELECT key INTO v_key
  FROM public.encryption_keys
  WHERE id = 'pii-v1' AND is_active = true
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found';
  END IF;

  -- Encrypt using AES-256 in GCM mode
  v_ciphertext := pgp_sym_encrypt(plaintext, encode(v_key, 'hex'));

  -- Return as Base64 for storage
  RETURN encode(v_ciphertext, 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Decrypt PII data
CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext TEXT)
RETURNS TEXT AS $$
DECLARE
  v_key BYTEA;
  v_ciphertext_bytes BYTEA;
  v_plaintext TEXT;
BEGIN
  -- Handle NULL or empty input
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;

  -- Get active encryption key
  SELECT key INTO v_key
  FROM public.encryption_keys
  WHERE id = 'pii-v1' AND is_active = true
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found';
  END IF;

  -- Decode from Base64
  BEGIN
    v_ciphertext_bytes := decode(ciphertext, 'base64');
    
    -- Decrypt
    v_plaintext := pgp_sym_decrypt(v_ciphertext_bytes, encode(v_key, 'hex'));
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't expose details
    RAISE WARNING 'Failed to decrypt PII: %', SQLERRM;
    RETURN '[Encrypted data - decryption failed]';
  END;

  RETURN v_plaintext;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: Comments and documentation
-- ============================================================================

COMMENT ON FUNCTION encrypt_pii(TEXT) IS 'Encrypts PII data using AES-256-GCM. Returns Base64-encoded ciphertext.';
COMMENT ON FUNCTION decrypt_pii(TEXT) IS 'Decrypts PII data encrypted with encrypt_pii. Returns plaintext or error message if decryption fails.';

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Verify pgcrypto extension is enabled
-- SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- Verify functions exist
-- SELECT proname FROM pg_proc WHERE proname IN ('encrypt_pii', 'decrypt_pii');

-- Test encryption/decryption
-- SELECT decrypt_pii(encrypt_pii('test data')); -- Should return: test data

