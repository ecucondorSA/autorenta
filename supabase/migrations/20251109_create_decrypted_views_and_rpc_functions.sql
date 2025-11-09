-- ============================================================================
-- PII ENCRYPTION SYSTEM - Part 4: Decrypted views and RPC functions
-- Created: 2025-11-09
-- Priority: P0 CRITICAL (GDPR Compliance)
-- Dependencies: 20251109_encrypt_existing_pii_data.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Create decrypted view for profiles
-- ============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS profiles_decrypted CASCADE;

-- Create view with decrypted PII fields
CREATE VIEW profiles_decrypted AS
SELECT
  id,

  -- Decrypted PII fields
  CASE
    WHEN phone_encrypted IS NOT NULL THEN decrypt_pii(phone_encrypted)
    ELSE phone
  END AS phone,

  CASE
    WHEN whatsapp_encrypted IS NOT NULL THEN decrypt_pii(whatsapp_encrypted)
    ELSE whatsapp
  END AS whatsapp,

  CASE
    WHEN address_line1_encrypted IS NOT NULL THEN decrypt_pii(address_line1_encrypted)
    ELSE address_line1
  END AS address_line1,

  CASE
    WHEN address_line2_encrypted IS NOT NULL THEN decrypt_pii(address_line2_encrypted)
    ELSE address_line2
  END AS address_line2,

  CASE
    WHEN postal_code_encrypted IS NOT NULL THEN decrypt_pii(postal_code_encrypted)
    ELSE postal_code
  END AS postal_code,

  CASE
    WHEN dni_encrypted IS NOT NULL THEN decrypt_pii(dni_encrypted)
    ELSE dni
  END AS dni,

  CASE
    WHEN gov_id_number_encrypted IS NOT NULL THEN decrypt_pii(gov_id_number_encrypted)
    ELSE gov_id_number
  END AS gov_id_number,

  CASE
    WHEN driver_license_number_encrypted IS NOT NULL THEN decrypt_pii(driver_license_number_encrypted)
    ELSE driver_license_number
  END AS driver_license_number,

  -- Non-PII fields (pass-through)
  avatar_url,
  full_name,
  city,
  state,
  country,
  email_verified,
  phone_verified,
  id_verified,
  is_email_verified,
  is_phone_verified,
  is_driver_verified,
  created_at,
  updated_at,
  deleted_at,
  is_admin,
  role,
  kyc,
  onboarding,
  timezone,
  locale,
  currency,
  rating_avg,
  rating_count,
  marketing_opt_in,
  notif_prefs,
  tos_accepted_at,
  wallet_account_number,
  stripe_customer_id,
  mercadopago_connected,
  mercadopago_connected_at,
  mercadopago_collector_id,
  mercadopago_public_key,
  mercadopago_site_id,
  mercadopago_country,
  mercadopago_account_type,
  mercadopago_oauth_state,
  mercadopago_access_token,
  mercadopago_refresh_token,
  mercadopago_access_token_expires_at,
  driver_license_country,
  driver_license_expiry,
  gov_id_type

FROM profiles;

COMMENT ON VIEW profiles_decrypted IS
  'Decrypted view of profiles table. Automatically decrypts PII fields. ' ||
  'Falls back to plaintext if encrypted version not available (migration period).';

-- Enable RLS on view (security_invoker = on means RLS policies apply)
ALTER VIEW profiles_decrypted SET (security_invoker = on);

-- ============================================================================
-- SECTION 2: Create decrypted view for bank_accounts
-- ============================================================================

DROP VIEW IF EXISTS bank_accounts_decrypted CASCADE;

CREATE VIEW bank_accounts_decrypted AS
SELECT
  id,
  user_id,

  -- Decrypted fields
  CASE
    WHEN account_number_encrypted IS NOT NULL THEN decrypt_pii(account_number_encrypted)
    ELSE account_number
  END AS account_number,

  CASE
    WHEN account_holder_document_encrypted IS NOT NULL THEN decrypt_pii(account_holder_document_encrypted)
    ELSE account_holder_document
  END AS account_holder_document,

  CASE
    WHEN account_holder_name_encrypted IS NOT NULL THEN decrypt_pii(account_holder_name_encrypted)
    ELSE account_holder_name
  END AS account_holder_name,

  -- Non-encrypted fields
  account_type,
  bank_name,
  is_verified,
  is_active,
  is_default,
  verification_method,
  verified_at,
  created_at,
  updated_at

FROM bank_accounts;

COMMENT ON VIEW bank_accounts_decrypted IS
  'Decrypted view of bank_accounts table. Automatically decrypts sensitive fields.';

ALTER VIEW bank_accounts_decrypted SET (security_invoker = on);

-- ============================================================================
-- SECTION 3: RPC Functions for profile updates
-- ============================================================================

-- Function: update_profile_with_encryption
-- Purpose: Update profile with automatic PII encryption
-- Usage: SELECT update_profile_with_encryption('user-id', '{"phone": "+54..."}');

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
-- SECTION 4: RPC Functions for bank account management
-- ============================================================================

CREATE OR REPLACE FUNCTION add_bank_account_with_encryption(
  p_account_number TEXT,
  p_account_holder_document TEXT,
  p_account_holder_name TEXT,
  p_account_type TEXT,
  p_bank_name TEXT DEFAULT NULL
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

  IF p_account_holder_document IS NULL OR p_account_holder_document = '' THEN
    RAISE EXCEPTION 'Account holder document is required';
  END IF;

  IF p_account_holder_name IS NULL OR p_account_holder_name = '' THEN
    RAISE EXCEPTION 'Account holder name is required';
  END IF;

  -- Insert with encrypted PII
  INSERT INTO bank_accounts (
    user_id,
    account_number_encrypted,
    account_holder_document_encrypted,
    account_holder_name_encrypted,
    account_type,
    bank_name,
    is_active,
    is_verified
  ) VALUES (
    v_user_id,
    encrypt_pii(p_account_number),
    encrypt_pii(p_account_holder_document),
    encrypt_pii(p_account_holder_name),
    p_account_type,
    p_bank_name,
    true,
    false  -- Requires verification
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
  'Adds a new bank account with automatic PII encryption for current user.';

GRANT EXECUTE ON FUNCTION add_bank_account_with_encryption TO authenticated;

-- ============================================================================
-- SECTION 5: Helper function to get decrypted profile
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

-- ============================================================================
-- SECTION 6: Verification queries
-- ============================================================================

-- Test the views and functions
/*
-- 1. Test decrypted view (should return decrypted data)
SELECT id, phone, dni
FROM profiles_decrypted
WHERE id = auth.uid()
LIMIT 1;

-- 2. Test update function
SELECT update_profile_with_encryption(
  auth.uid(),
  '{"phone": "+54 11 1234-5678", "city": "Buenos Aires"}'::jsonb
);

-- 3. Test get profile function
SELECT get_my_profile_decrypted();

-- 4. Verify encryption/decryption round-trip
SELECT
  p.phone as original_plaintext,
  p.phone_encrypted as encrypted,
  decrypt_pii(p.phone_encrypted) as decrypted,
  p.phone = decrypt_pii(p.phone_encrypted) as matches
FROM profiles p
WHERE p.phone_encrypted IS NOT NULL
LIMIT 5;
*/

COMMIT;

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

/*
After running this migration:

1. ✅ Views are created for backward-compatible decryption
2. ✅ RPC functions allow encrypted updates from application
3. ✅ All existing queries using profiles/bank_accounts tables still work

Next steps:
1. Update application code to use views instead of direct table access
2. Update services to use RPC functions for updates
3. Test thoroughly in staging
4. Monitor performance metrics
5. (OPTIONAL) Drop plaintext columns after full verification

Example service update:

// Before (insecure):
const { data } = await supabase
  .from('profiles')
  .select('phone, address_line1')
  .eq('id', userId);

// After (secure):
const { data } = await supabase
  .from('profiles_decrypted')
  .select('phone, address_line1')
  .eq('id', userId);

// OR use RPC:
const { data } = await supabase.rpc('get_my_profile_decrypted');
*/
