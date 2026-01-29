-- ============================================
-- Migration: Create car_blocked_dates table
-- Date: 2025-11-14
-- Description: Creates the missing car_blocked_dates table for manual date blocking functionality
-- ============================================

-- Create car_blocked_dates table
CREATE TABLE IF NOT EXISTS public.car_blocked_dates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    blocked_from DATE NOT NULL,
    blocked_to DATE NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('maintenance', 'personal_use', 'vacation', 'other')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Constraints
    CONSTRAINT car_blocked_dates_date_range_check CHECK (blocked_from <= blocked_to),
    CONSTRAINT car_blocked_dates_no_overlap EXCLUDE (
        car_id WITH =,
        daterange(blocked_from, blocked_to, '[]') WITH &&
    ) WHERE (car_id IS NOT NULL)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_car_blocked_dates_car_id ON public.car_blocked_dates(car_id);
CREATE INDEX IF NOT EXISTS idx_car_blocked_dates_dates ON public.car_blocked_dates(blocked_from, blocked_to);
CREATE INDEX IF NOT EXISTS idx_car_blocked_dates_created_by ON public.car_blocked_dates(created_by);

-- Enable RLS
ALTER TABLE public.car_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Car owners can view blocked dates for their cars" ON public.car_blocked_dates
    FOR SELECT USING (
        car_id IN (
            SELECT id FROM public.cars WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Car owners can insert blocked dates for their cars" ON public.car_blocked_dates
    FOR INSERT WITH CHECK (
        car_id IN (
            SELECT id FROM public.cars WHERE owner_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Car owners can update blocked dates for their cars" ON public.car_blocked_dates
    FOR UPDATE USING (
        car_id IN (
            SELECT id FROM public.cars WHERE owner_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Car owners can delete blocked dates for their cars" ON public.car_blocked_dates
    FOR DELETE USING (
        car_id IN (
            SELECT id FROM public.cars WHERE owner_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_car_blocked_dates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_car_blocked_dates_updated_at
    BEFORE UPDATE ON public.car_blocked_dates
    FOR EACH ROW
    EXECUTE FUNCTION update_car_blocked_dates_updated_at();

-- Grant permissions
GRANT ALL ON public.car_blocked_dates TO authenticated;
GRANT ALL ON public.car_blocked_dates TO service_role;

-- Add comment
COMMENT ON TABLE public.car_blocked_dates IS 'Manual date blocking for cars by owners';
COMMENT ON COLUMN public.car_blocked_dates.reason IS 'Reason for blocking: maintenance, personal_use, vacation, other';


