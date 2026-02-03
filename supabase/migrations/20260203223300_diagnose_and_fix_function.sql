-- Diagnostic and fix for get_pending_retries function
-- The function exists but PostgREST can't see it

-- 1. Grant execute to all necessary roles
GRANT EXECUTE ON FUNCTION public.get_pending_retries(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pending_retries(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_retries(INTEGER) TO service_role;

-- 2. Also grant the other functions
GRANT EXECUTE ON FUNCTION public.enqueue_payment_retry TO anon;
GRANT EXECUTE ON FUNCTION public.update_retry_result TO anon;
GRANT EXECUTE ON FUNCTION public.enqueue_payment_retry TO service_role;
GRANT EXECUTE ON FUNCTION public.update_retry_result TO service_role;

-- 3. Force schema cache reload via pg_notify
SELECT pg_notify('pgrst', 'reload schema');
