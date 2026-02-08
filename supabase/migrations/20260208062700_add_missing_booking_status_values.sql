-- ============================================================================
-- ADD MISSING BOOKING STATUS VALUES
-- Date: 2026-02-08
-- Description: Add booking_status enum values used in code but missing in DB
--              - pending_dispute_resolution: Used in 14 frontend files
--              - pending_owner_approval: Used in payment-reconciliation edge function
-- ============================================================================

-- Add 'pending_dispute_resolution' status (used extensively in frontend)
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'pending_dispute_resolution';
EXCEPTION
    WHEN duplicate_object THEN null; -- Already exists
    WHEN OTHERS THEN RAISE NOTICE 'Warning: Could not add pending_dispute_resolution to booking_status';
END $$;

-- Add 'pending_owner_approval' status (used in payment reconciliation)
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'pending_owner_approval';
EXCEPTION
    WHEN duplicate_object THEN null; -- Already exists
    WHEN OTHERS THEN RAISE NOTICE 'Warning: Could not add pending_owner_approval to booking_status';
END $$;

-- Document the full enum for reference
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
  - completed: Trip finished successfully
  - cancelled: Cancelled by user or owner
  - no_show: Renter did not show up
  - expired: Booking expired
  - payment_validation_failed: Payment validation issues';
