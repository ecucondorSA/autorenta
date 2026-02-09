-- ============================================================================
-- ADD REMAINING BOOKING STATUS VALUES
-- Date: 2026-02-09
-- Description: Add missing booking_status enum values that are used in the codebase
--              but were missing from the database enum definition.
-- ============================================================================

-- Add 'pending_review'
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'pending_review';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN RAISE NOTICE 'Warning: Could not add pending_review to booking_status';
END $$;

-- Add 'resolved'
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'resolved';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN RAISE NOTICE 'Warning: Could not add resolved to booking_status';
END $$;

-- Add 'cancelled_system'
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'cancelled_system';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN RAISE NOTICE 'Warning: Could not add cancelled_system to booking_status';
END $$;

-- Add 'rejected'
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN RAISE NOTICE 'Warning: Could not add rejected to booking_status';
END $$;

-- Add 'no_show'
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'no_show';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN RAISE NOTICE 'Warning: Could not add no_show to booking_status';
END $$;

-- Add 'expired'
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN RAISE NOTICE 'Warning: Could not add expired to booking_status';
END $$;

-- Update comment with complete list
COMMENT ON TYPE public.booking_status IS
  'Booking lifecycle states:
  - pending_payment: Initial state, awaiting payment
  - pending_owner_approval: Payment done, awaiting owner approval
  - pending_approval: Legacy state for owner approval
  - confirmed: Owner approved, booking confirmed
  - in_progress: Trip started (check-in done)
  - returned: Car returned, awaiting inspection
  - inspected_good: Inspection passed, no damage
  - damage_reported: Damage found in inspection
  - disputed: Formal dispute opened
  - pending_dispute_resolution: Dispute resolution in progress
  - pending_review: Waiting for reviews
  - resolved: Dispute or issue resolved
  - completed: Trip finished successfully
  - cancelled: Cancelled by user or owner
  - cancelled_system: Cancelled automatically by system
  - rejected: Rejected by owner
  - no_show: Renter did not show up
  - expired: Booking expired
  - payment_validation_failed: Payment validation issues';
