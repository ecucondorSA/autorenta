-- Feature: Dispute Management & Evidence System
-- Extracted from: sql/feature_reviews_chat_disputes.sql
-- Context: Missing module identified during alignment audit.

-- 1. Create ENUMs safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status') THEN
    CREATE TYPE dispute_status AS ENUM ('open', 'in_review', 'resolved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_kind') THEN
    CREATE TYPE dispute_kind AS ENUM ('damage', 'no_show', 'late_return', 'other');
  END IF;
END
$$;

-- 2. Create Disputes Table
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.profiles(id),
  kind dispute_kind NOT NULL,
  description text,
  status dispute_status NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Disputes

-- Read: Admin, Creator, or Booking Participants (Renter/Owner)
CREATE POLICY "disputes_read_participants_or_admin"
ON public.disputes
FOR SELECT
USING (
  public.is_admin()
  OR opened_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = booking_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

-- Insert: Participants only
CREATE POLICY "disputes_insert_participants"
ON public.disputes
FOR INSERT
WITH CHECK (
  opened_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = booking_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

-- Update: Admin only (for status resolution)
CREATE POLICY "disputes_update_admin_only"
ON public.disputes
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 4. Create Evidence Table
CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  path text NOT NULL, -- Path to storage object
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute ON public.dispute_evidence(dispute_id);

-- 5. RLS Policies for Evidence

-- Read: Anyone involved in the dispute
CREATE POLICY "evidence_read_participants_or_admin"
ON public.dispute_evidence
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.disputes d
    JOIN public.bookings b ON b.id = d.booking_id
    JOIN public.cars c ON c.id = b.car_id
    WHERE d.id = dispute_id
      AND (
        public.is_admin()
        OR d.opened_by = auth.uid()
        OR b.renter_id = auth.uid()
        OR c.owner_id = auth.uid()
      )
  )
);

-- Insert: Anyone involved in the dispute
CREATE POLICY "evidence_insert_participants"
ON public.dispute_evidence
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.disputes d
    JOIN public.bookings b ON b.id = d.booking_id
    JOIN public.cars c ON c.id = b.car_id
    WHERE d.id = dispute_id
      AND (
        public.is_admin()
        OR d.opened_by = auth.uid()
        OR b.renter_id = auth.uid()
        OR c.owner_id = auth.uid()
      )
  )
);
