-- Force PostgREST schema cache reload
-- This is a no-op migration that triggers cache invalidation

COMMENT ON FUNCTION public.get_pending_retries(INTEGER) IS 'Get pending payment retries for processing - updated 2026-02-03';
COMMENT ON FUNCTION public.update_retry_result(UUID, BOOLEAN, TEXT, TEXT, TEXT) IS 'Update retry result after processing - updated 2026-02-03';
COMMENT ON FUNCTION public.enqueue_payment_retry(UUID, UUID, UUID, UUID, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Add payment to retry queue - updated 2026-02-03';

-- Force a notification to PostgREST
NOTIFY pgrst, 'reload schema';
