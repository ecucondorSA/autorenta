-- Migration: Add Bonus Protector Notification Types
-- Date: 2025-11-07
-- Epic: #82 - Bonus Protector Purchase Flow
-- Description: Adds notification types for protector expiry reminders

-- 1. Add new notification types for Bonus Protector
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'protector_expiring_soon';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'protector_expiring_tomorrow';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'protector_expired';

-- 2. Add comments for clarity
COMMENT ON TYPE public.notification_type IS 'Notification types including protector_expiring_soon (7 days), protector_expiring_tomorrow (1 day), and protector_expired';
