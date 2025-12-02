-- Migration: Cleanup legacy fields from profiles table
-- Date: 2025-11-11
-- Purpose: Remove duplicate and obsolete columns identified in audit
-- WARNING: This migration should only be run AFTER verifying these fields are not used in production

-- IMPORTANT: Review and test this migration carefully before applying to production
-- Run this migration ONLY after:
-- 1. Confirming no active code uses these fields
-- 2. Backing up the profiles table
-- 3. Testing in staging environment

-- Backup note: Before running this migration, create a backup:
-- pg_dump -h <host> -U <user> -t profiles > profiles_backup_$(date +%Y%m%d).sql

-- Step 1: Drop legacy verification flag columns (replaced by is_* versions)
-- These are duplicates from old verification system
DO $$
BEGIN
  -- Check if columns exist before dropping
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='profiles' AND column_name='email_verified') THEN
    ALTER TABLE profiles DROP COLUMN email_verified;
    RAISE NOTICE 'Dropped legacy column: email_verified (use is_email_verified instead)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='profiles' AND column_name='phone_verified') THEN
    ALTER TABLE profiles DROP COLUMN phone_verified;
    RAISE NOTICE 'Dropped legacy column: phone_verified (use is_phone_verified instead)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='profiles' AND column_name='id_verified') THEN
    ALTER TABLE profiles DROP COLUMN id_verified;
    RAISE NOTICE 'Dropped legacy column: id_verified (replaced by is_driver_verified)';
  END IF;
END $$;

-- Step 2: Drop legacy DNI column (replaced by gov_id_number)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='profiles' AND column_name='dni') THEN
    -- Optional: Migrate data before dropping
    -- UPDATE profiles SET gov_id_number = dni WHERE gov_id_number IS NULL AND dni IS NOT NULL;

    ALTER TABLE profiles DROP COLUMN dni;
    RAISE NOTICE 'Dropped legacy column: dni (use gov_id_number instead)';
  END IF;
END $$;

-- Step 3: Drop Stripe-related columns (AutoRenta uses MercadoPago)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='profiles' AND column_name='stripe_customer_id') THEN
    ALTER TABLE profiles DROP COLUMN stripe_customer_id;
    RAISE NOTICE 'Dropped legacy column: stripe_customer_id (AutoRenta uses MercadoPago)';
  END IF;
END $$;

-- Optional Step 4: Add migration metadata
-- This helps track what was cleaned up
DO $$
BEGIN
  RAISE NOTICE '=== Legacy Fields Cleanup Migration Completed ===';
  RAISE NOTICE 'Removed fields:';
  RAISE NOTICE '  - email_verified (use is_email_verified)';
  RAISE NOTICE '  - phone_verified (use is_phone_verified)';
  RAISE NOTICE '  - id_verified (use is_driver_verified)';
  RAISE NOTICE '  - dni (use gov_id_number)';
  RAISE NOTICE '  - stripe_customer_id (AutoRenta uses MercadoPago)';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Run "npm run sync:types" to update TypeScript types after this migration';
END $$;

-- Note: After running this migration successfully:
-- 1. Update database.types.ts by running: npm run sync:types
-- 2. Search codebase for any references to dropped columns
-- 3. Update any remaining references to use new column names
-- 4. Test all profile-related features thoroughly
