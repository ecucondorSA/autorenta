
-- Inspect get_owner_penalties
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname = 'get_owner_penalties';

-- Inspect start_location_tracking
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname = 'start_location_tracking';
