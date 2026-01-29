-- Add unique index on whatsapp_message_id for deduplication
-- This prevents duplicate responses when WAHA sends the same message twice

CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_messages_whatsapp_id
  ON public.outreach_messages(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

COMMENT ON COLUMN public.outreach_messages.whatsapp_message_id IS 'WAHA message ID for deduplication - prevents duplicate responses';
