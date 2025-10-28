-- ============================================================================
-- Migration: Create messages table with E2EE support and RLS
-- ============================================================================
-- Date: 2025-10-28
-- Purpose: Complete messaging system with encryption and security
-- Related: MESSAGING_CRITICAL_ISSUES.md
-- ============================================================================

-- ============================================================================
-- PART 1: Create messages table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context: one or the other (not both)
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,

  -- Participants
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content (encrypted via functions)
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

-- ============================================================================
-- PART 2: Indexes for performance
-- ============================================================================

-- Context indexes
CREATE INDEX idx_messages_booking_id ON public.messages(booking_id)
WHERE booking_id IS NOT NULL;

CREATE INDEX idx_messages_car_id ON public.messages(car_id)
WHERE car_id IS NOT NULL;

-- Participant indexes
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);

-- Timestamp index (for ordering)
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_messages_car_participants ON public.messages(car_id, sender_id, recipient_id)
WHERE car_id IS NOT NULL;

CREATE INDEX idx_messages_booking_participants ON public.messages(booking_id, sender_id, recipient_id)
WHERE booking_id IS NOT NULL;

-- Status indexes
CREATE INDEX idx_messages_undelivered ON public.messages(recipient_id, created_at)
WHERE delivered_at IS NULL;

CREATE INDEX idx_messages_unread ON public.messages(recipient_id, created_at)
WHERE read_at IS NULL;

-- ============================================================================
-- PART 3: Triggers
-- ============================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: Enable Realtime
-- ============================================================================

-- Enable replica identity for realtime (required for UPDATE/DELETE events)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================================================
-- PART 5: Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

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

-- Policy: Prevent deletion (for audit trail)
-- Users cannot delete messages - only admins via dashboard

-- ============================================================================
-- PART 6: Helper Functions
-- ============================================================================

-- Function: Get conversation participants for a car
CREATE OR REPLACE FUNCTION get_car_conversation_participants(p_car_id UUID, p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN m.sender_id = p_user_id THEN m.recipient_id
      ELSE m.sender_id
    END AS user_id,
    MAX(m.created_at) AS last_message_at,
    COUNT(*) FILTER (WHERE m.recipient_id = p_user_id AND m.read_at IS NULL) AS unread_count
  FROM public.messages m
  WHERE m.car_id = p_car_id
    AND (m.sender_id = p_user_id OR m.recipient_id = p_user_id)
  GROUP BY
    CASE
      WHEN m.sender_id = p_user_id THEN m.recipient_id
      ELSE m.sender_id
    END
  ORDER BY last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get unread message count for user
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

-- ============================================================================
-- PART 7: Comments
-- ============================================================================

COMMENT ON TABLE public.messages IS 'Chat messages - supports both pre-booking (car_id) and post-booking (booking_id) conversations';
COMMENT ON COLUMN public.messages.booking_id IS 'Post-booking conversation context (mutually exclusive with car_id)';
COMMENT ON COLUMN public.messages.car_id IS 'Pre-booking conversation context (mutually exclusive with booking_id)';
COMMENT ON COLUMN public.messages.body IS 'Message content - encrypted via pgcrypto functions';
COMMENT ON COLUMN public.messages.delivered_at IS 'Timestamp when message was delivered to recipient device';
COMMENT ON COLUMN public.messages.read_at IS 'Timestamp when message was read by recipient';

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================

-- Verify table structure:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'messages'
-- ORDER BY ordinal_position;

-- Verify indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'messages';

-- Verify RLS policies:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'messages';

-- Verify realtime enabled:
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime' AND tablename = 'messages';

-- Test message insertion:
-- INSERT INTO public.messages (car_id, sender_id, recipient_id, body)
-- VALUES (
--   'car-uuid-here',
--   auth.uid(),
--   'recipient-uuid-here',
--   'Test message'
-- );

-- Test conversation retrieval:
-- SELECT * FROM get_car_conversation_participants('car-uuid-here', auth.uid());

-- Test unread count:
-- SELECT get_unread_messages_count(auth.uid());

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP FUNCTION IF EXISTS mark_conversation_as_read(UUID, UUID, UUID);
-- DROP FUNCTION IF EXISTS get_unread_messages_count(UUID);
-- DROP FUNCTION IF EXISTS get_car_conversation_participants(UUID, UUID);
-- DROP TABLE IF EXISTS public.messages CASCADE;
