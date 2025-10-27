-- Migration: Create Notifications System
-- Date: 2025-10-26

-- 1. Define Notification Type Enum
-- This allows us to categorize notifications for filtering and handling.
CREATE TYPE public.notification_type AS ENUM (
    'new_booking_for_owner',
    'booking_cancelled_for_owner',
    'booking_cancelled_for_renter',
    'new_chat_message',
    'payment_successful',
    'payout_successful',
    'inspection_reminder',
    'generic_announcement'
);

-- 2. Create Notifications Table
-- This table will store all user-facing notifications.
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) > 0),
    body TEXT NOT NULL CHECK (char_length(body) > 0),
    cta_link TEXT, -- (e.g., /bookings/uuid-of-booking)
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    type public.notification_type NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add Indexes for Performance
-- Index for efficiently querying a user's notifications, ordered by date.
CREATE INDEX idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);

-- Index for quickly finding unread notifications for a user.
CREATE INDEX idx_notifications_user_id_is_read ON public.notifications(user_id, is_read);

-- 4. Enable Realtime
-- Allows the frontend to subscribe to new notifications in real-time.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 5. Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications.
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update the 'is_read' status of their own notifications.
CREATE POLICY "Users can mark their own notifications as read"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: Inserts should be handled by trusted backend functions (using service_role) or database triggers,
-- so we do not grant direct INSERT permissions to users.

-- 6. Add comments for clarity
COMMENT ON TABLE public.notifications IS 'Stores user-facing notifications for events within the platform.';
COMMENT ON COLUMN public.notifications.cta_link IS 'Call-to-action link for the notification to navigate the user upon interaction.';
COMMENT ON COLUMN public.notifications.type IS 'Categorizes the notification for client-side logic and display.';
