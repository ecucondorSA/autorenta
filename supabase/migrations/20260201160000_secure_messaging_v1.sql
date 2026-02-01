-- ============================================================================
-- MIGRATION: Secure Messaging System (P2P Chat)
-- Date: 2026-02-01
-- Purpose: Context-aware secure messaging with platform leakage detection
-- ============================================================================

BEGIN;

-- 1. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context (Must have one)
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  
  -- Participants
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Content
  body TEXT NOT NULL CHECK (length(body) > 0),
  
  -- Security & Trust
  is_flagged BOOLEAN DEFAULT FALSE, -- Flagged for platform leakage (phone/email detection)
  flag_reason TEXT, -- 'phone_detected', 'email_detected', 'keyword'
  is_system_message BOOLEAN DEFAULT FALSE, -- Auto-generated messages (e.g. "Booking Confirmed")
  
  -- Meta
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT messages_context_check CHECK (booking_id IS NOT NULL OR car_id IS NOT NULL)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_messages_booking ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_car ON public.messages(car_id);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON public.messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- 3. RLS POLICIES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Read: Participants or Admins
CREATE POLICY "messages_read_participants_or_admin"
ON public.messages
FOR SELECT
USING (
  public.is_admin()
  OR sender_id = auth.uid()
  OR recipient_id = auth.uid()
);

-- Insert: Participants only, with context validation
-- Allows users to send messages only if they are part of the booking context
CREATE POLICY "messages_insert_participants"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    -- Case 1: Booking Context
    (
      booking_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.bookings b
        JOIN public.cars c ON c.id = b.car_id
        WHERE b.id = booking_id
          AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
      )
    )
    OR
    -- Case 2: Car Inquiry Context (Pre-booking)
    (
      car_id IS NOT NULL
      AND (
        -- User is owner
        EXISTS (SELECT 1 FROM public.cars WHERE id = car_id AND owner_id = auth.uid())
        OR
        -- User is renter asking about car (allow open inquiry for now, 
        -- logic can be tightened to require an inquiry record if needed)
        auth.uid() IS NOT NULL
      )
    )
  )
);

-- 4. FUNCTION: Send System Message
-- Helper to inject system notifications into chat
CREATE OR REPLACE FUNCTION public.send_system_message(
  p_booking_id UUID,
  p_recipient_id UUID,
  p_body TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_msg_id UUID;
  v_system_user_id UUID;
BEGIN
  -- Use a dedicated system user ID or the booking's other party?
  -- For now, we set sender as the system admin/bot or NULL if allowed (but sender_id is NOT NULL)
  -- Strategy: Use the recipient as sender but flag as system? No, confusing.
  -- Strategy: Use auth.uid() if triggered by user action, or a special UUID if cron.
  
  -- Ideally, we have a 'system' profile. If not, we might need to relax sender_id FK or use a placeholder.
  -- FALLBACK: For V1, we insert as the 'other party' but mark is_system_message = true
  
  INSERT INTO public.messages (
    booking_id, 
    sender_id, -- Should be 'System', using recipient for simplicity in this constraints
    recipient_id, 
    body, 
    is_system_message
  ) VALUES (
    p_booking_id,
    p_recipient_id, -- Self-message technically, but marked as system
    p_recipient_id, 
    p_body, 
    TRUE
  ) RETURNING id INTO v_msg_id;
  
  RETURN v_msg_id;
END;
$$;

-- 5. TRIGGER: Detect Platform Leakage (Backend Guardrail)
-- Scans for phone numbers and emails
CREATE OR REPLACE FUNCTION public.detect_message_leakage()
RETURNS TRIGGER AS $$
DECLARE
  v_phone_regex TEXT := '\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\b';
  v_email_regex TEXT := '[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}';
BEGIN
  IF NEW.body ~ v_phone_regex OR NEW.body ~ v_email_regex THEN
    NEW.is_flagged := TRUE;
    NEW.flag_reason := 'contact_info_detected';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detect_message_leakage
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_message_leakage();

COMMIT;
