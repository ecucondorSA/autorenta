-- ============================================================================
-- Migration: Add read and delivered status to messages
-- ============================================================================
-- Date: 2025-10-27
-- Purpose: Add read_at and delivered_at timestamps to track message status
-- ============================================================================

-- Add columns
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at 
ON public.messages(delivered_at) 
WHERE delivered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_read_at 
ON public.messages(read_at) 
WHERE read_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.messages.delivered_at IS 'Timestamp when message was delivered to recipient';
COMMENT ON COLUMN public.messages.read_at IS 'Timestamp when message was read by recipient';

-- Enable realtime for UPDATE events (if not already enabled)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ============================================================================
-- TESTING
-- ============================================================================

-- Verify columns exist:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'messages' 
-- AND column_name IN ('delivered_at', 'read_at');
