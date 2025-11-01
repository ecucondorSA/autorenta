-- ============================================================================
-- Migration: Fix messages table for production
-- ============================================================================
-- Date: 2025-11-01
-- Purpose: Ensure messages table exists and has correct structure for production
-- ============================================================================

-- Drop existing table if it exists (be careful in production!)
-- DO NOT run this if you have production data you want to keep
-- DROP TABLE IF EXISTS public.messages CASCADE;

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context: one or the other (not both)
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,

  -- Participants
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  body TEXT NOT NULL,

  -- Message status
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT messages_context_check CHECK (
    (booking_id IS NOT NULL AND car_id IS NULL) OR
    (booking_id IS NULL AND car_id IS NOT NULL)
  ),
  CONSTRAINT messages_not_self CHECK (sender_id <> recipient_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON public.messages(booking_id)
WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_car_id ON public.messages(car_id)
WHERE car_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_car_participants ON public.messages(car_id, sender_id, recipient_id)
WHERE car_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_booking_participants ON public.messages(booking_id, sender_id, recipient_id)
WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_undelivered ON public.messages(recipient_id, created_at)
WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(recipient_id, created_at)
WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Recipients can update message status" ON public.messages;

-- Policy: Users can view messages where they are participants
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
USING (
  auth.uid() = sender_id OR
  auth.uid() = recipient_id
);

-- Policy: Users can send messages
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
      SELECT 1 FROM public.bookings
      WHERE id = booking_id
      AND (renter_id = auth.uid() OR owner_id = auth.uid())
    ))
  )
);

-- Policy: Recipients can update message status (delivered_at, read_at)
CREATE POLICY "Recipients can update message status"
ON public.messages FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (
  auth.uid() = recipient_id AND
  -- Only allow updating status fields
  (
    (OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL) OR
    (OLD.read_at IS NULL AND NEW.read_at IS NOT NULL)
  ) AND
  -- Prevent changing message content or metadata
  OLD.id = NEW.id AND
  OLD.booking_id IS NOT DISTINCT FROM NEW.booking_id AND
  OLD.car_id IS NOT DISTINCT FROM NEW.car_id AND
  OLD.sender_id = NEW.sender_id AND
  OLD.recipient_id = NEW.recipient_id AND
  OLD.body = NEW.body AND
  OLD.created_at = NEW.created_at
);

-- Enable replica identity for realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add to realtime publication (if not already added)
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Create helper functions
CREATE OR REPLACE FUNCTION get_unread_messages_count(p_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.messages
    WHERE recipient_id = p_user_id
      AND read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark all messages as read in a conversation
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  p_booking_id UUID DEFAULT NULL,
  p_car_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Use current user if not specified
  IF p_user_id IS NULL THEN
    p_user_id := auth.uid();
  END IF;

  -- Update messages
  UPDATE public.messages
  SET read_at = NOW()
  WHERE recipient_id = p_user_id
    AND read_at IS NULL
    AND (
      (p_booking_id IS NOT NULL AND booking_id = p_booking_id) OR
      (p_car_id IS NOT NULL AND car_id = p_car_id)
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.messages IS 'Chat messages - supports both pre-booking (car_id) and post-booking (booking_id) conversations';
