-- Add 'pending_payment' status to booking_status enum
-- This status is used when a booking is created but payment hasn't been confirmed yet
-- Previously frontend was trying to use this status but it didn't exist in the enum

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_payment';
