-- Feature pack: Reviews refinements, secure messaging, dispute center
-- Compatible with existing AutorentA schema (UUID-based IDs)

-- 1. Rating roles & richer review model
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rating_role') THEN
    CREATE TYPE rating_role AS ENUM ('owner_rates_renter', 'renter_rates_owner');
  END IF;
END
$$;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS role rating_role;

UPDATE public.reviews
SET role = COALESCE(role, 'renter_rates_owner');

ALTER TABLE public.reviews
  ALTER COLUMN role SET DEFAULT 'renter_rates_owner',
  ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_booking_id_reviewer_id_key;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_booking_id_reviewer_id_role_key
  UNIQUE (booking_id, reviewer_id, role);

DROP POLICY IF EXISTS "reviews insert if user participated" ON public.reviews;
DROP POLICY IF EXISTS "reviews public read" ON public.reviews;

CREATE POLICY "reviews_read_participants_or_admin"
ON public.reviews
FOR SELECT
USING (
  public.is_admin()
  OR reviewer_id = auth.uid()
  OR reviewee_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = booking_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

CREATE POLICY "reviews_insert_participant_after_completed"
ON public.reviews
FOR INSERT
WITH CHECK (
  reviewer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND b.status = 'completed'
      AND (
        b.renter_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.cars c
          WHERE c.id = b.car_id AND c.owner_id = auth.uid()
        )
      )
  )
);

CREATE OR REPLACE VIEW public.user_ratings AS
SELECT
  reviewee_id AS user_id,
  AVG(rating)::numeric(3, 2) AS avg_rating,
  COUNT(*) AS reviews_count
FROM public.reviews
GROUP BY reviewee_id;

-- 2. Secure messaging (inquiry & booking threads)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid REFERENCES public.cars(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_context_check CHECK (car_id IS NOT NULL OR booking_id IS NOT NULL)
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_booking ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_car ON public.messages(car_id);

CREATE POLICY "messages_read_participants_or_admin"
ON public.messages
FOR SELECT
USING (
  public.is_admin()
  OR sender_id = auth.uid()
  OR recipient_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = booking_id
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

CREATE POLICY "messages_insert_participants"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    (
      booking_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.bookings b
        JOIN public.cars c ON c.id = b.car_id
        WHERE b.id = booking_id
          AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid() OR public.is_admin())
      )
    )
    OR (
      car_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.cars c
          WHERE c.id = car_id AND (c.owner_id = auth.uid() OR public.is_admin())
        )
        OR EXISTS (
          SELECT 1
          FROM public.bookings b
          WHERE b.car_id = car_id AND b.renter_id = auth.uid()
        )
      )
    )
  )
);

-- 3. Dispute management & evidence
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

CREATE POLICY "disputes_update_admin_only"
ON public.disputes
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  path text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute ON public.dispute_evidence(dispute_id);

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
