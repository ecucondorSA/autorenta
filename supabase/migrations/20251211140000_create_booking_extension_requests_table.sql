CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.booking_extension_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    original_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    new_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    request_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
    estimated_cost_amount NUMERIC(10, 2), -- Estimated additional cost
    estimated_cost_currency TEXT DEFAULT 'ARS',
    renter_message TEXT, -- Message from renter with request
    owner_response TEXT, -- Response from owner
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    responded_at TIMESTAMP WITH TIME ZONE,

    -- Ensure that there's only one pending request per booking at any time
    CONSTRAINT unique_pending_request_per_booking UNIQUE (booking_id, request_status) WHERE request_status = 'pending'
);

ALTER TABLE public.booking_extension_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Renter can view their extension requests" ON public.booking_extension_requests
    FOR SELECT USING (auth.uid() = renter_id);

CREATE POLICY "Owner can view extension requests for their bookings" ON public.booking_extension_requests
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Renter can create extension requests" ON public.booking_extension_requests
    FOR INSERT WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Owner can approve/reject extension requests" ON public.booking_extension_requests
    FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Optional: Allow renters to cancel their pending requests
CREATE POLICY "Renter can update/cancel their pending extension requests" ON public.booking_extension_requests
    FOR UPDATE USING (auth.uid() = renter_id AND request_status = 'pending') WITH CHECK (auth.uid() = renter_id);
