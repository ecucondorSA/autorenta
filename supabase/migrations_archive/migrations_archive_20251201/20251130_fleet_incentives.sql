-- ============================================================================
-- MIGRATION: Fleet Incentives (Revenue Share + Performance Bonuses)
-- Date: 2025-11-30
-- Description: 
-- 1. Support for Manager Commission (Option 2): Split payments 3 ways.
-- 2. Performance Bonuses (Option 3): Track reliable fleets.
-- ============================================================================

BEGIN;

-- 1. REVENUE SHARE (Option 2)
-- Add commission config to Organization Members
-- Only 'manager' role usually gets this, but flexible for others.
ALTER TABLE public.organization_members 
ADD COLUMN IF NOT EXISTS commission_fixed_percent NUMERIC(5,2) DEFAULT 0 CHECK (commission_fixed_percent >= 0 AND commission_fixed_percent <= 50);

COMMENT ON COLUMN public.organization_members.commission_fixed_percent IS 'Percentage of booking total that goes to this manager (deducted from owner share)';

-- 2. PERFORMANCE BONUSES (Option 3)
-- Track bonuses for high-quality fleet onboarding
CREATE TABLE IF NOT EXISTS public.fleet_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    car_id UUID NOT NULL REFERENCES public.cars(id),
    
    -- Bonus Criteria Progress
    trips_completed INT DEFAULT 0,
    trips_required INT DEFAULT 3,
    avg_rating NUMERIC(3,2) DEFAULT 0,
    min_rating_required NUMERIC(3,2) DEFAULT 4.8,
    
    -- Reward
    bonus_amount_usd NUMERIC(10,2) DEFAULT 50.00,
    currency TEXT DEFAULT 'USD',
    
    status TEXT CHECK (status IN ('pending', 'eligible', 'paid', 'expired')) DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(organization_id, car_id) -- One bonus per car per fleet
);

-- 3. FUNCTION TO CHECK BONUS ELIGIBILITY
-- Runs after every booking completion or review
CREATE OR REPLACE FUNCTION public.check_fleet_bonus_eligibility()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_car_id UUID;
    v_org_id UUID;
    v_bonus_record RECORD;
    v_stats RECORD;
BEGIN
    -- Determine car_id based on trigger source (bookings or reviews)
    IF TG_TABLE_NAME = 'bookings' THEN
        v_car_id := NEW.car_id;
    ELSIF TG_TABLE_NAME = 'reviews' THEN
        -- Get car_id from booking
        SELECT car_id INTO v_car_id FROM public.bookings WHERE id = NEW.booking_id;
    END IF;

    -- Check if car belongs to an organization
    SELECT organization_id INTO v_org_id FROM public.cars WHERE id = v_car_id;
    IF v_org_id IS NULL THEN RETURN NEW; END IF;

    -- Get/Create Bonus Record
    SELECT * INTO v_bonus_record FROM public.fleet_bonuses 
    WHERE car_id = v_car_id AND organization_id = v_org_id AND status = 'pending';
    
    -- If no pending bonus exists, exit
    IF NOT FOUND THEN RETURN NEW; END IF;

    -- Calculate Stats (Completed trips & Avg Rating)
    SELECT 
        COUNT(*) as trips,
        COALESCE(AVG(r.rating), 0) as rating
    FROM public.bookings b
    LEFT JOIN public.reviews r ON r.booking_id = b.id AND r.is_renter_review = true -- Reviews FROM renter
    WHERE b.car_id = v_car_id 
    AND b.status = 'completed';
    
    -- Update Bonus Progress
    UPDATE public.fleet_bonuses
    SET 
        trips_completed = v_stats.trips,
        avg_rating = v_stats.rating,
        status = CASE 
            WHEN v_stats.trips >= trips_required AND v_stats.rating >= min_rating_required THEN 'eligible'
            ELSE 'pending'
        END,
        updated_at = now()
    WHERE id = v_bonus_record.id;

    RETURN NEW;
END;
$$;

-- Triggers for Bonus Check
DROP TRIGGER IF EXISTS check_bonus_on_booking ON public.bookings;
CREATE TRIGGER check_bonus_on_booking
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION public.check_fleet_bonus_eligibility();

DROP TRIGGER IF EXISTS check_bonus_on_review ON public.reviews;
CREATE TRIGGER check_bonus_on_review
    AFTER INSERT ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.check_fleet_bonus_eligibility();

COMMIT;
