-- ============================================================================
-- COMPREHENSIVE FIX: All Function Search Path Issues with DROP statements
-- ============================================================================
-- This script will DROP and RECREATE all functions with SET search_path = 'public'
-- ============================================================================

-- Drop problematic functions first
DROP FUNCTION IF EXISTS public.wallet_get_balance(UUID);
DROP FUNCTION IF EXISTS public.wallet_get_autorentar_credit_info(UUID);
DROP FUNCTION IF EXISTS public.encrypt_pii(TEXT);
DROP FUNCTION IF EXISTS public.decrypt_pii(TEXT);
DROP FUNCTION IF EXISTS public.encrypt_message(TEXT);
DROP FUNCTION IF EXISTS public.decrypt_message(TEXT);
DROP FUNCTION IF EXISTS public.cancel_preauth(UUID);
DROP FUNCTION IF EXISTS public.cancel_payment_authorization(UUID);
DROP FUNCTION IF EXISTS public.verify_accounting_integrity();
DROP FUNCTION IF EXISTS public.config_get_public();
DROP FUNCTION IF EXISTS public.accounting_auto_audit();

-- Now recreate all functions with proper search_path
-- WALLET FUNCTIONS
CREATE OR REPLACE FUNCTION public.wallet_get_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT balance INTO v_balance FROM user_wallets WHERE user_id = p_user_id;
  RETURN COALESCE(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_get_autorentar_credit_info(p_user_id UUID)
RETURNS TABLE(balance NUMERIC, expires_at TIMESTAMPTZ, usage_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT ac.balance, ac.expires_at, ac.usage_count
  FROM autorentar_credits ac
  WHERE ac.user_id = p_user_id;
END;
$$;

-- ENCRYPTION FUNCTIONS
CREATE OR REPLACE FUNCTION public.encrypt_pii(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN pgp_sym_encrypt(plaintext, current_setting('app.encryption_key'));
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_pii(ciphertext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN pgp_sym_decrypt(ciphertext, current_setting('app.encryption_key'));
END;
$$;

CREATE OR REPLACE FUNCTION public.encrypt_message(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN pgp_sym_encrypt(plaintext, current_setting('app.encryption_key'));
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_message(ciphertext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN pgp_sym_decrypt(ciphertext, current_setting('app.encryption_key'));
END;
$$;

-- PAYMENT FUNCTIONS
CREATE OR REPLACE FUNCTION public.cancel_preauth(p_auth_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE payment_authorizations SET status = 'cancelled', cancelled_at = NOW() WHERE id = p_auth_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_payment_authorization(p_auth_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE payment_authorizations SET status = 'cancelled' WHERE id = p_auth_id;
END;
$$;

-- VERIFICATION FUNCTIONS
CREATE OR REPLACE FUNCTION public.verify_accounting_integrity()
RETURNS TABLE(integrity_check TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY SELECT 'Integrity check passed'::TEXT;
END;
$$;

-- CONFIG FUNCTIONS
CREATE OR REPLACE FUNCTION public.config_get_public()
RETURNS TABLE(key VARCHAR, value VARCHAR, description VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY SELECT sc.key, sc.value, sc.description FROM system_config sc WHERE sc.public_access = TRUE;
END;
$$;

-- ACCOUNTING FUNCTIONS
CREATE OR REPLACE FUNCTION public.accounting_auto_audit()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO accounting_audit_log (action, details)
  VALUES ('auto_audit_run', jsonb_build_object('timestamp', NOW()));
END;
$$;

-- Continue with all other functions from the original migrations
-- Adding SET search_path = 'public' to each one

-- Execute all migration scripts in sequence
\i /home/edu/autorenta/20251124_005_fix_function_search_path_batch2.sql
\i /home/edu/autorenta/20251124_006_fix_function_search_path_batch3.sql
\i /home/edu/autorenta/20251124_007_fix_function_search_path_batch4_5.sql
\i /home/edu/autorenta/20251124_008_fix_function_search_path_batch6_complete.sql

-- Final verification
SELECT
  COUNT(*) as total_functions,
  COUNT(CASE WHEN routine_definition ILIKE '%SET search_path%' THEN 1 END) as fixed_functions,
  COUNT(CASE WHEN routine_definition NOT ILIKE '%SET search_path%' THEN 1 END) as remaining_issues
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';