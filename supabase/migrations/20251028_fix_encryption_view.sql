-- Fix messages_decrypted view (remove updated_at column that doesn't exist)

-- Drop view if exists
DROP VIEW IF EXISTS public.messages_decrypted;

-- Recreate view without updated_at column
CREATE OR REPLACE VIEW public.messages_decrypted AS
SELECT
  id,
  booking_id,
  car_id,
  sender_id,
  recipient_id,
  decrypt_message(body) AS body, -- Decrypted content
  body AS body_encrypted,        -- Original encrypted content (for debugging)
  delivered_at,
  read_at,
  created_at
FROM public.messages;

-- Enable RLS on view (inherits from base table)
ALTER VIEW public.messages_decrypted SET (security_invoker = true);

COMMENT ON VIEW public.messages_decrypted IS 'Messages with decrypted content - respects RLS from base table';
