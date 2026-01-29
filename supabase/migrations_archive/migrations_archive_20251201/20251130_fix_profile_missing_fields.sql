-- ============================================================================
-- MIGRATION: Fix Profile Missing Fields
-- Date: 2025-11-30
-- Description: Adds missing contact and address fields to the profiles table.
-- Reported Issue: User address and phone not saving.
-- ============================================================================

BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'AR',
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gov_id_type TEXT, -- DNI, PASSPORT
ADD COLUMN IF NOT EXISTS gov_id_number TEXT;

-- Update RLS just in case (Standard "Update Own Profile" usually covers all cols, but good to be sure)
-- Assuming existing policy "Users can update own profile" covers this.

COMMIT;
