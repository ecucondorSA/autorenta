-- Disable server-side encryption for messages to restore functionality
-- This allows messages to be stored in plain text, compatible with current frontend and realtime

DROP TRIGGER IF EXISTS encrypt_message_body_before_insert ON public.messages;
DROP FUNCTION IF EXISTS encrypt_message_body_trigger();
