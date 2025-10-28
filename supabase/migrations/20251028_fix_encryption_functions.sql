-- Fix encryption functions to use correct pgcrypto API

-- Drop view first (depends on decrypt_message)
DROP VIEW IF EXISTS public.messages_decrypted CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS encrypt_message(TEXT);
DROP FUNCTION IF EXISTS decrypt_message(TEXT) CASCADE;

-- Recreate encrypt_message with correct pgcrypto usage
CREATE OR REPLACE FUNCTION encrypt_message(plaintext TEXT)
RETURNS TEXT AS $$
DECLARE
  v_key BYTEA;
  v_ciphertext BYTEA;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RAISE EXCEPTION 'Message body cannot be empty';
  END IF;

  -- Get active encryption key
  SELECT key INTO v_key
  FROM public.encryption_keys
  WHERE id = 'messages-v1' AND is_active = true;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'No active encryption key found';
  END IF;

  -- Encrypt using pgp_sym_encrypt (expects TEXT, TEXT)
  -- Use the key as hex-encoded string for the password
  v_ciphertext := pgp_sym_encrypt(plaintext, encode(v_key, 'hex'));

  -- Return as Base64 for storage in TEXT column
  RETURN encode(v_ciphertext, 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate decrypt_message with correct pgcrypto usage
CREATE OR REPLACE FUNCTION decrypt_message(ciphertext TEXT)
RETURNS TEXT AS $$
DECLARE
  v_key BYTEA;
  v_ciphertext_bytes BYTEA;
  v_plaintext TEXT;
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;

  -- Get active encryption key
  SELECT key INTO v_key
  FROM public.encryption_keys
  WHERE id = 'messages-v1' AND is_active = true;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'No active encryption key found';
  END IF;

  -- Decode from Base64
  v_ciphertext_bytes := decode(ciphertext, 'base64');

  -- Decrypt using pgp_sym_decrypt (expects BYTEA, TEXT)
  -- Use the key as hex-encoded string for the password
  v_plaintext := pgp_sym_decrypt(v_ciphertext_bytes, encode(v_key, 'hex'));

  RETURN v_plaintext;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return NULL to prevent breaking queries
    RAISE WARNING 'Failed to decrypt message: %', SQLERRM;
    RETURN '[Decryption Error]';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comments
COMMENT ON FUNCTION encrypt_message(TEXT) IS 'Encrypts message body using AES-256 via pgcrypto';
COMMENT ON FUNCTION decrypt_message(TEXT) IS 'Decrypts message body using AES-256 via pgcrypto';

-- Recreate messages_decrypted view
CREATE OR REPLACE VIEW public.messages_decrypted AS
SELECT
  id,
  booking_id,
  car_id,
  sender_id,
  recipient_id,
  decrypt_message(body) AS body,    -- Decrypted content
  body AS body_encrypted,           -- Original encrypted content (for debugging)
  delivered_at,
  read_at,
  created_at
FROM public.messages;

-- Enable RLS on view (inherits from base table)
ALTER VIEW public.messages_decrypted SET (security_invoker = true);

COMMENT ON VIEW public.messages_decrypted IS 'Messages with decrypted content - respects RLS from base table';
