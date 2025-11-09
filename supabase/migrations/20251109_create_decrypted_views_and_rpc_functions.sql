-- ============================================================================
-- Migration: Create decrypted views and RPC functions for PII access
-- ============================================================================
-- Date: 2025-11-09
-- Purpose: Create views and RPC functions to access decrypted PII data
-- Related: Issue #1 - Día 1: Seguridad y Deployment Crítico
-- Security: Views use RLS, RPC functions require authentication
-- ============================================================================

-- ============================================================================
-- PART 1: Create decrypted view for profiles
-- ============================================================================

CREATE OR REPLACE VIEW public.profiles_decrypted AS
SELECT
  id,
  full_name,
  avatar_url,
  role,
  is_admin,
  -- Decrypted PII fields
  decrypt_pii(phone_encrypted) as phone,
  decrypt_pii(whatsapp_encrypted) as whatsapp,
  decrypt_pii(gov_id_number_encrypted) as gov_id_number,
  decrypt_pii(dni_encrypted) as dni,
  decrypt_pii(driver_license_number_encrypted) as driver_license_number,
  decrypt_pii(address_line1_encrypted) as address_line1,
  decrypt_pii(address_line2_encrypted) as address_line2,
  decrypt_pii(postal_code_encrypted) as postal_code,
  -- Non-PII fields (not encrypted)
  city,
  state,
  country,
  gov_id_type,
  driver_license_country,
  driver_license_expiry,
  email_verified,
  phone_verified,
  id_verified,
  created_at,
  updated_at,
  -- Other fields
  rating_avg,
  rating_count,
  home_latitude,
  home_longitude,
  location_verified_at,
  preferred_search_radius_km
FROM public.profiles;

-- Enable RLS on view
ALTER VIEW public.profiles_decrypted SET (security_invoker = true);

-- RLS Policy: Users can only see their own decrypted data
CREATE POLICY "Users can view own decrypted profile"
ON public.profiles_decrypted
FOR SELECT
USING (auth.uid() = id);

-- Admin policy: Admins can view all decrypted profiles
CREATE POLICY "Admins can view all decrypted profiles"
ON public.profiles_decrypted
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- ============================================================================
-- PART 2: Create decrypted view for bank_accounts
-- ============================================================================

CREATE OR REPLACE VIEW public.bank_accounts_decrypted AS
SELECT
  id,
  user_id,
  -- Decrypted PII fields
  decrypt_pii(account_number_encrypted) as account_number,
  decrypt_pii(cbu_encrypted) as cbu,
  decrypt_pii(alias_encrypted) as alias,
  decrypt_pii(bank_name_encrypted) as bank_name,
  -- Non-PII fields
  account_type,
  is_primary,
  is_verified,
  created_at,
  updated_at
FROM public.bank_accounts;

-- Enable RLS on view
ALTER VIEW public.bank_accounts_decrypted SET (security_invoker = true);

-- RLS Policy: Users can only see their own decrypted bank accounts
CREATE POLICY "Users can view own decrypted bank accounts"
ON public.bank_accounts_decrypted
FOR SELECT
USING (auth.uid() = user_id);

-- ============================================================================
-- PART 3: Create RPC function to get decrypted profile
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_profile_decrypted()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  gov_id_number TEXT,
  dni TEXT,
  driver_license_number TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code TEXT,
  city TEXT,
  state TEXT,
  country TEXT
) AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    decrypt_pii(p.phone_encrypted) as phone,
    decrypt_pii(p.whatsapp_encrypted) as whatsapp,
    decrypt_pii(p.gov_id_number_encrypted) as gov_id_number,
    decrypt_pii(p.dni_encrypted) as dni,
    decrypt_pii(p.driver_license_number_encrypted) as driver_license_number,
    decrypt_pii(p.address_line1_encrypted) as address_line1,
    decrypt_pii(p.address_line2_encrypted) as address_line2,
    decrypt_pii(p.postal_code_encrypted) as postal_code,
    p.city,
    p.state,
    p.country
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: Comments and documentation
-- ============================================================================

COMMENT ON VIEW public.profiles_decrypted IS 'Decrypted view of profiles with PII data. Users can only see their own data.';
COMMENT ON VIEW public.bank_accounts_decrypted IS 'Decrypted view of bank_accounts with PII data. Users can only see their own data.';
COMMENT ON FUNCTION get_my_profile_decrypted() IS 'RPC function to get current user decrypted profile data. Requires authentication.';

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Verify views exist
-- SELECT table_name FROM information_schema.views 
-- WHERE table_name IN ('profiles_decrypted', 'bank_accounts_decrypted');

-- Test view access (as authenticated user)
-- SELECT * FROM profiles_decrypted WHERE id = auth.uid();

-- Test RPC function (as authenticated user)
-- SELECT * FROM get_my_profile_decrypted();

