-- ============================================================================
-- PII ENCRYPTION - Migration 4 MISSING PARTS (FIXED FOR REAL SCHEMA)
-- ============================================================================
-- Execute this in Supabase SQL Editor to complete Migration 4
-- Missing: bank_accounts_decrypted view + 3 RPC functions
--
-- FIXED: Updated to match real bank_accounts schema
-- - account_holder_document_encrypted → cbu_encrypted
-- - account_holder_name_encrypted → alias_encrypted
-- - is_verified → verified
-- - is_active → removed (doesn't exist)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create bank_accounts_decrypted view (FIXED)
-- ============================================================================

DROP VIEW IF EXISTS bank_accounts_decrypted CASCADE;

CREATE VIEW bank_accounts_decrypted AS
SELECT
  id,
  user_id,

  -- Decrypted fields (using REAL column names)
  CASE
    WHEN account_number_encrypted IS NOT NULL THEN decrypt_pii(account_number_encrypted)
    ELSE account_number
  END AS account_number,

  CASE
    WHEN cbu_encrypted IS NOT NULL THEN decrypt_pii(cbu_encrypted)
    ELSE NULL
  END AS cbu,

  CASE
    WHEN alias_encrypted IS NOT NULL THEN decrypt_pii(alias_encrypted)
    ELSE NULL
  END AS alias,

  CASE
    WHEN bank_name_encrypted IS NOT NULL THEN decrypt_pii(bank_name_encrypted)
    ELSE bank_name
  END AS bank_name,

  -- Non-encrypted fields (using REAL column names)
  account_type,
  bank_code,
  account_holder_name,    -- plaintext (no encrypted version exists)
  account_holder_id,       -- plaintext (no encrypted version exists)
  verified,                -- REAL name (not is_verified)
  verified_at,
  is_default,              -- EXISTS
  created_at,
  updated_at

FROM bank_accounts;

COMMENT ON VIEW bank_accounts_decrypted IS
  'Decrypted view of bank_accounts table. Automatically decrypts sensitive fields. Uses real schema: cbu_encrypted, alias_encrypted, verified.';

ALTER VIEW bank_accounts_decrypted SET (security_invoker = on);

-- ============================================================================
-- PART 2: update_profile_with_encryption (NO CHANGES - uses profiles table)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_profile_with_encryption(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_phone TEXT;
  v_whatsapp TEXT;
  v_address_line1 TEXT;
  v_address_line2 TEXT;
  v_postal_code TEXT;
  v_dni TEXT;
  v_gov_id_number TEXT;
  v_driver_license_number TEXT;
  v_result JSONB;
BEGIN
  -- Security: Ensure user can only update their own profile
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot update another user profile';
  END IF;

  -- Extract PII fields from updates JSON
  v_phone := p_updates->>'phone';
  v_whatsapp := p_updates->>'whatsapp';
  v_address_line1 := p_updates->>'address_line1';
  v_address_line2 := p_updates->>'address_line2';
  v_postal_code := p_updates->>'postal_code';
  v_dni := p_updates->>'dni';
  v_gov_id_number := p_updates->>'gov_id_number';
  v_driver_license_number := p_updates->>'driver_license_number';

  -- Update profile with encrypted PII
  UPDATE profiles
  SET
    -- Encrypted fields
    phone_encrypted = CASE WHEN v_phone IS NOT NULL THEN encrypt_pii(v_phone) ELSE phone_encrypted END,
    whatsapp_encrypted = CASE WHEN v_whatsapp IS NOT NULL THEN encrypt_pii(v_whatsapp) ELSE whatsapp_encrypted END,
    address_line1_encrypted = CASE WHEN v_address_line1 IS NOT NULL THEN encrypt_pii(v_address_line1) ELSE address_line1_encrypted END,
    address_line2_encrypted = CASE WHEN v_address_line2 IS NOT NULL THEN encrypt_pii(v_address_line2) ELSE address_line2_encrypted END,
    postal_code_encrypted = CASE WHEN v_postal_code IS NOT NULL THEN encrypt_pii(v_postal_code) ELSE postal_code_encrypted END,
    dni_encrypted = CASE WHEN v_dni IS NOT NULL THEN encrypt_pii(v_dni) ELSE dni_encrypted END,
    gov_id_number_encrypted = CASE WHEN v_gov_id_number IS NOT NULL THEN encrypt_pii(v_gov_id_number) ELSE gov_id_number_encrypted END,
    driver_license_number_encrypted = CASE WHEN v_driver_license_number IS NOT NULL THEN encrypt_pii(v_driver_license_number) ELSE driver_license_number_encrypted END,

    -- Non-PII fields (if provided in updates)
    full_name = COALESCE(p_updates->>'full_name', full_name),
    city = COALESCE(p_updates->>'city', city),
    state = COALESCE(p_updates->>'state', state),
    country = COALESCE(p_updates->>'country', country),
    locale = COALESCE(p_updates->>'locale', locale),
    timezone = COALESCE(p_updates->>'timezone', timezone),

    updated_at = NOW()
  WHERE id = p_user_id;

  -- Return success with decrypted values
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Profile updated successfully',
    'user_id', p_user_id
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION update_profile_with_encryption IS
  'Updates user profile with automatic PII encryption. Only allows users to update their own profile.';

GRANT EXECUTE ON FUNCTION update_profile_with_encryption TO authenticated;

-- ============================================================================
-- PART 3: add_bank_account_with_encryption (FIXED FOR REAL SCHEMA)
-- ============================================================================

CREATE OR REPLACE FUNCTION add_bank_account_with_encryption(
  p_account_number TEXT,
  p_cbu TEXT,                       -- FIXED: changed from p_account_holder_document
  p_alias TEXT,                     -- FIXED: changed from p_account_holder_name
  p_account_type TEXT,
  p_bank_name TEXT DEFAULT NULL,
  p_bank_code TEXT DEFAULT NULL,
  p_account_holder_name TEXT DEFAULT NULL,  -- plaintext field
  p_account_holder_id TEXT DEFAULT NULL     -- plaintext field
)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: must be authenticated';
  END IF;

  -- Validate inputs
  IF p_account_number IS NULL OR p_account_number = '' THEN
    RAISE EXCEPTION 'Account number is required';
  END IF;

  -- Insert with encrypted PII (FIXED: using real column names)
  INSERT INTO bank_accounts (
    user_id,
    account_number_encrypted,
    cbu_encrypted,              -- FIXED: real column name
    alias_encrypted,            -- FIXED: real column name
    bank_name_encrypted,        -- FIXED: encrypt bank_name
    account_type,
    bank_code,
    account_holder_name,        -- plaintext (no encrypted version)
    account_holder_id,          -- plaintext (no encrypted version)
    verified,                   -- FIXED: real column name (not is_verified)
    is_default
  ) VALUES (
    v_user_id,
    encrypt_pii(p_account_number),
    CASE WHEN p_cbu IS NOT NULL THEN encrypt_pii(p_cbu) ELSE NULL END,
    CASE WHEN p_alias IS NOT NULL THEN encrypt_pii(p_alias) ELSE NULL END,
    CASE WHEN p_bank_name IS NOT NULL THEN encrypt_pii(p_bank_name) ELSE NULL END,
    p_account_type,
    p_bank_code,
    p_account_holder_name,
    p_account_holder_id,
    false,  -- verified = false (requires verification)
    false   -- is_default = false
  )
  RETURNING id INTO v_account_id;

  RETURN v_account_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Bank account already exists';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating bank account: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION add_bank_account_with_encryption IS
  'Adds a new bank account with automatic PII encryption for current user. FIXED to use real schema: cbu_encrypted, alias_encrypted, verified.';

GRANT EXECUTE ON FUNCTION add_bank_account_with_encryption TO authenticated;

-- ============================================================================
-- PART 4: get_my_profile_decrypted (NO CHANGES - uses profiles table)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_profile_decrypted()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_profile JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: must be authenticated';
  END IF;

  SELECT jsonb_build_object(
    'id', id,
    'phone', phone,
    'whatsapp', whatsapp,
    'address_line1', address_line1,
    'address_line2', address_line2,
    'postal_code', postal_code,
    'dni', dni,
    'gov_id_number', gov_id_number,
    'driver_license_number', driver_license_number,
    'full_name', full_name,
    'city', city,
    'state', state,
    'country', country,
    'email_verified', email_verified,
    'phone_verified', phone_verified,
    'role', role,
    'kyc', kyc
  )
  INTO v_profile
  FROM profiles_decrypted
  WHERE id = v_user_id;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION get_my_profile_decrypted IS
  'Returns current user profile with decrypted PII fields.';

GRANT EXECUTE ON FUNCTION get_my_profile_decrypted TO authenticated;

COMMIT;

-- ============================================================================
-- ✅ VERIFICATION QUERIES (Run after the migration)
-- ============================================================================

-- 1. Verify bank_accounts_decrypted view exists
SELECT COUNT(*) as decrypted_views
FROM information_schema.views
WHERE table_name IN ('profiles_decrypted', 'bank_accounts_decrypted');
-- Expected: 2

-- 2. Verify RPC functions exist
SELECT COUNT(*) as encryption_rpc_functions
FROM pg_proc
WHERE proname IN (
  'update_profile_with_encryption',
  'add_bank_account_with_encryption',
  'get_my_profile_decrypted'
);
-- Expected: 3

-- 3. List all encryption-related functions
SELECT proname
FROM pg_proc
WHERE proname LIKE '%encryption%' OR proname LIKE '%decrypted%'
ORDER BY proname;
-- Expected to see: update_profile_with_encryption, add_bank_account_with_encryption,
--                  get_my_profile_decrypted, rotate_encryption_key

-- 4. Test the bank_accounts_decrypted view
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bank_accounts_decrypted'
ORDER BY ordinal_position;
-- Should show: id, user_id, account_number, cbu, alias, bank_name, etc.

-- ============================================================================
-- 🎉 DONE
-- ============================================================================
-- After running this script successfully, you should have:
-- ✅ bank_accounts_decrypted view (FIXED for real schema)
-- ✅ update_profile_with_encryption() function
-- ✅ add_bank_account_with_encryption() function (FIXED for real schema)
-- ✅ get_my_profile_decrypted() function
--
-- This completes Migration 4.
--
-- CHANGES FROM ORIGINAL:
-- - Vista usa: cbu_encrypted, alias_encrypted, bank_name_encrypted (nombres reales)
-- - Vista usa: verified (no is_verified), is_default (no is_active)
-- - Función add_bank_account_with_encryption actualizada con parámetros reales
-- - Agrega campos plaintext: account_holder_name, account_holder_id, bank_code
-- ============================================================================
