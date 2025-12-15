-- ============================================================================
-- MIGRATION: mp_webhook_logs idempotency via event_id
-- Date: 2025-12-15
-- Purpose: Ensure MercadoPago webhooks can be deduplicated safely using x-request-id.
-- ============================================================================

BEGIN;

-- Ensure column exists (baseline schema should already have it)
ALTER TABLE public.mp_webhook_logs
  ADD COLUMN IF NOT EXISTS event_id TEXT;

-- Enforce idempotency: one row per event_id (ignore NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_webhook_logs_event_id_unique
  ON public.mp_webhook_logs(event_id)
  WHERE event_id IS NOT NULL;

COMMENT ON INDEX public.idx_mp_webhook_logs_event_id_unique IS
  'Idempotency key for MercadoPago webhooks (x-request-id). Prevents duplicate processing.';

COMMIT;
