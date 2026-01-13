
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname = 'wallet_initiate_deposit';
