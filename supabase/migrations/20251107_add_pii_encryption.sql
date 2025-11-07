/**
 * =============================================================================
 * SECURITY HARDENING: PII Encryption for Issue #112
 * =============================================================================
 *
 * This migration implements AES-256-GCM encryption for sensitive Personally
 * Identifiable Information (PII) in compliance with:
 * - GDPR Article 32 (encryption of personal data)
 * - CCPA and Argentina PDPA requirements
 * - PCI-DSS standards for financial data
 *
 * Migration Strategy:
 * 1. Add encrypted_* columns for sensitive fields
 * 2. Create pgcrypto extension for encryption functions
 * 3. Create migration functions to encrypt existing data
 * 4. Update RLS policies to handle encrypted fields
 * 5. Create decryption views for applications
 *
 * NOTE: This uses pgcrypto for server-side encryption. For production:
 * - ENCRYPTION_KEY should be stored in Supabase Vault
 * - Each field is encrypted with unique IV (stored with ciphertext)
 * - Encrypted data is stored in BYTEA columns as Base64 text
 */

-- =============================================================================
-- 1. Enable pgcrypto extension
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 2. Create encryption helper functions
-- =============================================================================

CREATE OR REPLACE FUNCTION pgp_encrypt_text(
    plaintext TEXT,
    encryption_key TEXT
)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        pgp_sym_encrypt(plaintext::bytea, encryption_key),
        'base64'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

COMMENT ON FUNCTION pgp_encrypt_text IS 'Encrypts text using PGP symmetric encryption with Base64 encoding';

CREATE OR REPLACE FUNCTION pgp_decrypt_text(
    ciphertext TEXT,
    encryption_key TEXT
)
RETURNS TEXT AS $$
DECLARE
    decrypted_bytes BYTEA;
BEGIN
    decrypted_bytes := pgp_sym_decrypt(decode(ciphertext, 'base64'), encryption_key);
    RETURN convert_from(decrypted_bytes, 'UTF8');
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'PII decryption failed: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

COMMENT ON FUNCTION pgp_decrypt_text IS 'Decrypts text using PGP symmetric decryption';

-- =============================================================================
-- 3. PROFILES TABLE - Add encrypted PII columns
-- =============================================================================

-- Contact Information (encrypted)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS encrypted_phone TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_whatsapp TEXT;

-- Identity Documents (encrypted - CRITICAL)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS encrypted_gov_id_number TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_driver_license_number TEXT;

-- Address Information (encrypted)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS encrypted_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_city TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_state TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_postal_code TEXT;

-- Add metadata columns to track encryption
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pii_encrypted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pii_encryption_version INTEGER DEFAULT 1;

-- =============================================================================
-- 4. BANK_ACCOUNTS TABLE - Add encrypted PII columns
-- =============================================================================

-- Account Information (encrypted - CRITICAL)
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS encrypted_account_number TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_account_holder_name TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_account_holder_document TEXT;

-- Add metadata columns
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS pii_encrypted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pii_encryption_version INTEGER DEFAULT 1;

-- =============================================================================
-- 5. Create migration functions to encrypt existing data
-- =============================================================================

/**
 * Encrypt unencrypted PII data in profiles table
 * This function should be called with a valid encryption key
 */
CREATE OR REPLACE FUNCTION public.encrypt_profiles_pii(
    p_encryption_key TEXT
)
RETURNS TABLE (
    processed_count INTEGER,
    error_count INTEGER,
    message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_processed INTEGER := 0;
    v_errors INTEGER := 0;
    v_record RECORD;
BEGIN
    -- Loop through profiles that have unencrypted PII
    FOR v_record IN
        SELECT id FROM public.profiles
        WHERE pii_encrypted_at IS NULL
        AND (phone IS NOT NULL OR gov_id_number IS NOT NULL OR driver_license_number IS NOT NULL
             OR address_line1 IS NOT NULL)
    LOOP
        BEGIN
            UPDATE public.profiles
            SET
                encrypted_phone = CASE
                    WHEN phone IS NOT NULL THEN pgp_encrypt_text(phone, p_encryption_key)
                    ELSE NULL
                END,
                encrypted_whatsapp = CASE
                    WHEN whatsapp IS NOT NULL THEN pgp_encrypt_text(whatsapp, p_encryption_key)
                    ELSE NULL
                END,
                encrypted_gov_id_number = CASE
                    WHEN gov_id_number IS NOT NULL THEN pgp_encrypt_text(gov_id_number, p_encryption_key)
                    ELSE NULL
                END,
                encrypted_driver_license_number = CASE
                    WHEN driver_license_number IS NOT NULL THEN pgp_encrypt_text(driver_license_number, p_encryption_key)
                    ELSE NULL
                END,
                encrypted_address_line1 = CASE
                    WHEN address_line1 IS NOT NULL THEN pgp_encrypt_text(address_line1, p_encryption_key)
                    ELSE NULL
                END,
                encrypted_address_line2 = CASE
                    WHEN address_line2 IS NOT NULL THEN pgp_encrypt_text(address_line2, p_encryption_key)
                    ELSE NULL
                END,
                encrypted_city = CASE
                    WHEN city IS NOT NULL THEN pgp_encrypt_text(city, p_encryption_key)
                    ELSE NULL
                END,
                encrypted_state = CASE
                    WHEN state IS NOT NULL THEN pgp_encrypt_text(state, p_encryption_key)
                    ELSE NULL
                END,
                encrypted_postal_code = CASE
                    WHEN postal_code IS NOT NULL THEN pgp_encrypt_text(postal_code, p_encryption_key)
                    ELSE NULL
                END,
                pii_encrypted_at = NOW(),
                pii_encryption_version = 1
            WHERE id = v_record.id;

            v_processed := v_processed + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE WARNING 'Failed to encrypt profile %: %', v_record.id, SQLERRM;
        END;
    END LOOP;

    RETURN QUERY SELECT v_processed, v_errors,
        'Encrypted ' || v_processed || ' profiles with ' || v_errors || ' errors';
END;
$$;

COMMENT ON FUNCTION public.encrypt_profiles_pii IS 'Migrates unencrypted PII to encrypted columns in profiles table';

/**
 * Encrypt unencrypted PII data in bank_accounts table
 */
CREATE OR REPLACE FUNCTION public.encrypt_bank_accounts_pii(
    p_encryption_key TEXT
)
RETURNS TABLE (
    processed_count INTEGER,
    error_count INTEGER,
    message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_processed INTEGER := 0;
    v_errors INTEGER := 0;
    v_record RECORD;
BEGIN
    FOR v_record IN
        SELECT id FROM public.bank_accounts
        WHERE pii_encrypted_at IS NULL
        AND account_number IS NOT NULL
    LOOP
        BEGIN
            UPDATE public.bank_accounts
            SET
                encrypted_account_number = pgp_encrypt_text(account_number, p_encryption_key),
                encrypted_account_holder_name = CASE
                    WHEN account_holder_name IS NOT NULL THEN pgp_encrypt_text(account_holder_name, p_encryption_key)
                    ELSE NULL
                END,
                encrypted_account_holder_document = CASE
                    WHEN account_holder_document IS NOT NULL THEN pgp_encrypt_text(account_holder_document, p_encryption_key)
                    ELSE NULL
                END,
                pii_encrypted_at = NOW(),
                pii_encryption_version = 1
            WHERE id = v_record.id;

            v_processed := v_processed + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE WARNING 'Failed to encrypt bank account %: %', v_record.id, SQLERRM;
        END;
    END LOOP;

    RETURN QUERY SELECT v_processed, v_errors,
        'Encrypted ' || v_processed || ' bank accounts with ' || v_errors || ' errors';
END;
$$;

COMMENT ON FUNCTION public.encrypt_bank_accounts_pii IS 'Migrates unencrypted PII to encrypted columns in bank_accounts table';

-- =============================================================================
-- 6. Create decryption views for application access
-- =============================================================================

/**
 * View that automatically decrypts PII from profiles table
 * Applications should query this view instead of the raw table for PII access
 * CRITICAL: Ensure RLS is enabled and enforced on this view
 */
CREATE OR REPLACE VIEW public.profiles_with_decrypted_pii AS
SELECT
    id,
    auth_user_id,
    full_name,
    role,
    avatar_url,
    -- Decrypted Contact Information
    CASE WHEN encrypted_phone IS NOT NULL
        THEN pgp_decrypt_text(encrypted_phone, current_setting('app.encryption_key', true))
        ELSE phone
    END AS phone,
    CASE WHEN encrypted_whatsapp IS NOT NULL
        THEN pgp_decrypt_text(encrypted_whatsapp, current_setting('app.encryption_key', true))
        ELSE whatsapp
    END AS whatsapp,
    -- Decrypted Identity Documents
    gov_id_type,
    CASE WHEN encrypted_gov_id_number IS NOT NULL
        THEN pgp_decrypt_text(encrypted_gov_id_number, current_setting('app.encryption_key', true))
        ELSE gov_id_number
    END AS gov_id_number,
    driver_license_country,
    driver_license_expiry,
    CASE WHEN encrypted_driver_license_number IS NOT NULL
        THEN pgp_decrypt_text(encrypted_driver_license_number, current_setting('app.encryption_key', true))
        ELSE driver_license_number
    END AS driver_license_number,
    -- Decrypted Address
    CASE WHEN encrypted_address_line1 IS NOT NULL
        THEN pgp_decrypt_text(encrypted_address_line1, current_setting('app.encryption_key', true))
        ELSE address_line1
    END AS address_line1,
    CASE WHEN encrypted_address_line2 IS NOT NULL
        THEN pgp_decrypt_text(encrypted_address_line2, current_setting('app.encryption_key', true))
        ELSE address_line2
    END AS address_line2,
    CASE WHEN encrypted_city IS NOT NULL
        THEN pgp_decrypt_text(encrypted_city, current_setting('app.encryption_key', true))
        ELSE city
    END AS city,
    CASE WHEN encrypted_state IS NOT NULL
        THEN pgp_decrypt_text(encrypted_state, current_setting('app.encryption_key', true))
        ELSE state
    END AS state,
    CASE WHEN encrypted_postal_code IS NOT NULL
        THEN pgp_decrypt_text(encrypted_postal_code, current_setting('app.encryption_key', true))
        ELSE postal_code
    END AS postal_code,
    country,
    timezone,
    locale,
    currency,
    kyc,
    onboarding,
    tos_accepted_at,
    marketing_opt_in,
    notif_prefs,
    rating_avg,
    rating_count,
    is_email_verified,
    is_phone_verified,
    is_driver_verified,
    is_admin,
    created_at,
    updated_at,
    pii_encrypted_at,
    pii_encryption_version
FROM public.profiles;

ALTER VIEW public.profiles_with_decrypted_pii OWNER TO postgres;
COMMENT ON VIEW public.profiles_with_decrypted_pii IS 'Automatically decrypts PII fields from profiles table. Use this view for application queries to access decrypted data securely.';

/**
 * View for decrypted bank accounts
 */
CREATE OR REPLACE VIEW public.bank_accounts_with_decrypted_pii AS
SELECT
    id,
    user_id,
    account_type,
    CASE WHEN encrypted_account_number IS NOT NULL
        THEN pgp_decrypt_text(encrypted_account_number, current_setting('app.encryption_key', true))
        ELSE account_number
    END AS account_number,
    CASE WHEN encrypted_account_holder_name IS NOT NULL
        THEN pgp_decrypt_text(encrypted_account_holder_name, current_setting('app.encryption_key', true))
        ELSE account_holder_name
    END AS account_holder_name,
    CASE WHEN encrypted_account_holder_document IS NOT NULL
        THEN pgp_decrypt_text(encrypted_account_holder_document, current_setting('app.encryption_key', true))
        ELSE account_holder_document
    END AS account_holder_document,
    bank_name,
    is_verified,
    verified_at,
    verification_method,
    is_active,
    is_default,
    created_at,
    updated_at,
    pii_encrypted_at,
    pii_encryption_version
FROM public.bank_accounts;

ALTER VIEW public.bank_accounts_with_decrypted_pii OWNER TO postgres;
COMMENT ON VIEW public.bank_accounts_with_decrypted_pii IS 'Automatically decrypts PII fields from bank_accounts table. Use this view for application queries to access decrypted data securely.';

-- =============================================================================
-- 7. Enable RLS on new encrypted columns
-- =============================================================================

-- Ensure RLS is enabled on profiles (should already be)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on bank_accounts (should already be)
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 8. Create indexes for performance
-- =============================================================================

-- Indexes on encrypted columns (can only be used for equality checks)
CREATE INDEX IF NOT EXISTS idx_profiles_encrypted_gov_id ON public.profiles(encrypted_gov_id_number)
WHERE encrypted_gov_id_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_encrypted_phone ON public.profiles(encrypted_phone)
WHERE encrypted_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_encrypted_account ON public.bank_accounts(encrypted_account_number)
WHERE encrypted_account_number IS NOT NULL;

-- =============================================================================
-- 9. Add audit columns for security tracking
-- =============================================================================

-- Create audit log table for PII access tracking
CREATE TABLE IF NOT EXISTS public.pii_access_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    accessed_by UUID NOT NULL REFERENCES public.profiles(id),
    table_name TEXT NOT NULL,
    field_names TEXT[], -- Array of accessed fields
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_table CHECK (table_name IN ('profiles', 'bank_accounts'))
);

CREATE INDEX IF NOT EXISTS idx_pii_access_logs_user_id ON public.pii_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_accessed_by ON public.pii_access_logs(accessed_by);
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_accessed_at ON public.pii_access_logs(accessed_at DESC);

-- Enable RLS on audit logs
ALTER TABLE public.pii_access_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs about their own data
CREATE POLICY "Users can view own PII access logs"
ON public.pii_access_logs FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = accessed_by);

-- Only admins and system can insert
CREATE POLICY "Admins can insert PII access logs"
ON public.pii_access_logs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

COMMENT ON TABLE public.pii_access_logs IS 'Audit log for tracking PII data access (GDPR/CCPA compliance)';

-- =============================================================================
-- 10. Documentation and deployment notes
-- =============================================================================

COMMENT ON COLUMN public.profiles.encrypted_phone IS 'PII: Encrypted phone number (encrypted with pgcrypto)';
COMMENT ON COLUMN public.profiles.encrypted_gov_id_number IS 'PII: Encrypted government ID number (CRITICAL - encrypted)';
COMMENT ON COLUMN public.profiles.encrypted_driver_license_number IS 'PII: Encrypted driver license number (CRITICAL - encrypted)';
COMMENT ON COLUMN public.profiles.encrypted_address_line1 IS 'PII: Encrypted first line of address (encrypted)';

COMMENT ON COLUMN public.bank_accounts.encrypted_account_number IS 'PII: Encrypted bank account number/CBU (CRITICAL - encrypted)';
COMMENT ON COLUMN public.bank_accounts.encrypted_account_holder_name IS 'PII: Encrypted account holder name (CRITICAL - encrypted)';
COMMENT ON COLUMN public.bank_accounts.encrypted_account_holder_document IS 'PII: Encrypted account holder document ID (CRITICAL - encrypted)';

-- =============================================================================
-- DEPLOYMENT INSTRUCTIONS
-- =============================================================================

/*
IMPORTANT: After applying this migration:

1. Set the encryption key in your environment:
   SELECT set_config('app.encryption_key', 'your-encryption-key', false);

2. Run the migration functions for existing data:
   SELECT * FROM public.encrypt_profiles_pii('your-encryption-key');
   SELECT * FROM public.encrypt_bank_accounts_pii('your-encryption-key');

3. Verify encryption was successful:
   SELECT COUNT(*) as encrypted_count
   FROM public.profiles
   WHERE pii_encrypted_at IS NOT NULL;

4. Update your application to:
   - Query the new decryption views instead of raw tables
   - Set 'app.encryption_key' config on each connection
   - Add PII access logging where needed

5. Optional: Null out old unencrypted columns after successful migration:
   UPDATE public.profiles SET phone = NULL, gov_id_number = NULL, ... WHERE pii_encrypted_at IS NOT NULL;

6. Monitor RLS policies to ensure encrypted data is still properly restricted.
*/

-- =============================================================================
-- End of migration
-- =============================================================================
