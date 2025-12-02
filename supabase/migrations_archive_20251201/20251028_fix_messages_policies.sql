-- Fix RLS policies for messages table
-- This patches the original migration to fix owner_id reference and OLD/NEW usage

-- Drop the policies that have errors
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Recipients can update message status" ON public.messages;

-- Policy: Users can send messages (FIXED)
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  sender_id <> recipient_id AND
  (
    -- For car messages: ensure user is authenticated
    (car_id IS NOT NULL) OR
    -- For booking messages: ensure user is part of the booking
    (booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings b
      INNER JOIN public.cars c ON c.id = b.car_id
      WHERE b.id = booking_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
    ))
  )
);

-- Policy: Recipients can update message status (FIXED - removed OLD/NEW references)
-- Note: We can't easily prevent field changes in policies without OLD/NEW
-- This simplified version only checks recipient_id
CREATE POLICY "Recipients can update message status"
ON public.messages FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Add a trigger to enforce read-only fields on UPDATE
CREATE OR REPLACE FUNCTION prevent_message_content_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changes to core message fields
  IF OLD.booking_id IS DISTINCT FROM NEW.booking_id OR
     OLD.car_id IS DISTINCT FROM NEW.car_id OR
     OLD.sender_id <> NEW.sender_id OR
     OLD.recipient_id <> NEW.recipient_id OR
     OLD.body <> NEW.body OR
     OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify message content or metadata after creation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce content immutability
DROP TRIGGER IF EXISTS enforce_message_immutability ON public.messages;
CREATE TRIGGER enforce_message_immutability
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_message_content_changes();

COMMENT ON FUNCTION prevent_message_content_changes() IS
'Ensures message content and metadata cannot be changed after creation. Only status fields (delivered_at, read_at) can be updated.';
