-- ============================================================================
-- FIX: Booking Status Enum
-- Date: 2026-01-08
-- Description: Adds missing values to booking_status enum to prevent runtime crashes
--              in the new V2 flow (returned, damage_reported, etc).
-- ============================================================================

-- Safely add 'returned' status
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'returned';
EXCEPTION
    WHEN duplicate_object THEN null; -- Ignore if exists
    WHEN OTHERS THEN RAISE NOTICE 'Warning: check booking_status type';
END $$;

-- Safely add 'inspected_good' status
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'inspected_good';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN null;
END $$;

-- Safely add 'damage_reported' status
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'damage_reported';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN null;
END $$;

-- Safely add 'disputed' status
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'disputed';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN null;
END $$;
