-- ============================================================================
-- BOOKING SYSTEM P0 FIXES - DATA CLEANUP
-- ============================================================================
-- Migration Date: 2025-01-25
-- Purpose: Clean up invalid data from booking system issues
-- ============================================================================

-- ============================================================================
-- 1. FIX INVALID BOOKING STATUSES
-- ============================================================================

-- Note: This section attempts to fix invalid booking statuses.
-- If 'pending_confirmation' is not a valid enum value, this section is skipped.
-- This is safe because it means there are no bookings with that invalid status.
DO $$
DECLARE
  enum_value_exists BOOLEAN;
BEGIN
  -- Check if 'pending_confirmation' exists in the booking_status enum
  SELECT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'pending_confirmation' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'booking_status')
  ) INTO enum_value_exists;
  
  IF enum_value_exists THEN
    -- Update bookings with invalid status 'pending_confirmation' to 'pending'
    UPDATE bookings 
    SET status = 'pending' 
    WHERE status = 'pending_confirmation';
    
    IF FOUND THEN
      RAISE NOTICE '✅ Updated bookings with invalid status pending_confirmation';
    ELSE
      RAISE NOTICE '✅ No bookings with pending_confirmation status found';
    END IF;
  ELSE
    RAISE NOTICE '✅ Skipping pending_confirmation update (value not in enum, no invalid data)';
  END IF;
END;
$$;

-- Report results
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM bookings
  WHERE status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'expired');

  IF invalid_count > 0 THEN
    RAISE WARNING '⚠️  Found % bookings with invalid status', invalid_count;
  ELSE
    RAISE NOTICE '✅ All booking statuses are valid';
  END IF;
END;
$$;

-- ============================================================================
-- 2. CLEAN ORPHANED RISK SNAPSHOTS
-- ============================================================================

-- Delete risk snapshots that reference non-existent bookings (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) THEN
    DELETE FROM booking_risk_snapshot
    WHERE booking_id NOT IN (SELECT id FROM bookings);

    RAISE NOTICE '✅ Cleaned orphaned risk snapshots';
  ELSE
    RAISE NOTICE 'ℹ️  Skipping orphaned snapshots cleanup: table does not exist';
  END IF;
END;
$$;

-- Report results
DO $$
DECLARE
  orphaned_count INTEGER;
  total_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) THEN
    SELECT COUNT(*) INTO total_count FROM booking_risk_snapshot;

    SELECT COUNT(*) INTO orphaned_count
    FROM booking_risk_snapshot brs
    WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = brs.booking_id);

    IF orphaned_count > 0 THEN
      RAISE WARNING '⚠️  Found % orphaned risk snapshots (total: %)', orphaned_count, total_count;
    ELSE
      RAISE NOTICE '✅ No orphaned risk snapshots (total: %)', total_count;
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Skipping snapshot report: table does not exist';
  END IF;
END;
$$;

-- ============================================================================
-- 3. ADD MISSING COLUMNS TO BOOKINGS (IF NOT EXISTS)
-- ============================================================================

-- Ensure risk_snapshot_id column exists and has proper FK
DO $$
BEGIN
  -- Check if booking_risk_snapshot table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) THEN
    -- Only add column if table exists and has booking_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'bookings' AND column_name = 'risk_snapshot_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'booking_risk_snapshot' AND column_name = 'booking_id'
    ) THEN
      ALTER TABLE bookings
        ADD COLUMN risk_snapshot_id UUID REFERENCES booking_risk_snapshot(booking_id);

      CREATE INDEX IF NOT EXISTS idx_bookings_risk_snapshot_id
        ON bookings(risk_snapshot_id)
        WHERE risk_snapshot_id IS NOT NULL;

      RAISE NOTICE '✅ Added risk_snapshot_id column to bookings';
    ELSE
      RAISE NOTICE '✅ risk_snapshot_id column already exists';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Skipping risk_snapshot_id: booking_risk_snapshot table does not exist';
  END IF;
END;
$$;

-- ============================================================================
-- 4. VALIDATE FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Check for bookings referencing non-existent risk snapshots
DO $$
DECLARE
  invalid_refs INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'risk_snapshot_id'
  ) THEN
    SELECT COUNT(*) INTO invalid_refs
    FROM bookings b
    WHERE b.risk_snapshot_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM booking_risk_snapshot brs WHERE brs.booking_id = b.risk_snapshot_id);

    IF invalid_refs > 0 THEN
      RAISE WARNING '⚠️  Found % bookings with invalid risk_snapshot_id references', invalid_refs;

      -- Optionally null out invalid references
      -- UPDATE bookings SET risk_snapshot_id = NULL
      -- WHERE risk_snapshot_id IS NOT NULL
      --   AND NOT EXISTS (SELECT 1 FROM booking_risk_snapshot WHERE booking_id = bookings.risk_snapshot_id);
    ELSE
      RAISE NOTICE '✅ All risk_snapshot_id references are valid';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Skipping FK validation: booking_risk_snapshot table does not exist';
  END IF;
END;
$$;

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Summary of booking statuses
DO $$
DECLARE
  pending_count INTEGER;
  confirmed_count INTEGER;
  active_count INTEGER;
  completed_count INTEGER;
  cancelled_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) FILTER (WHERE status = 'pending') INTO pending_count FROM bookings;
  SELECT COUNT(*) FILTER (WHERE status = 'confirmed') INTO confirmed_count FROM bookings;
  SELECT COUNT(*) FILTER (WHERE status = 'in_progress') INTO active_count FROM bookings;
  SELECT COUNT(*) FILTER (WHERE status = 'completed') INTO completed_count FROM bookings;
  SELECT COUNT(*) FILTER (WHERE status = 'cancelled') INTO cancelled_count FROM bookings;
  SELECT COUNT(*) INTO total_count FROM bookings;

  RAISE NOTICE '📊 Booking Status Summary:';
  RAISE NOTICE '   Pending: %', pending_count;
  RAISE NOTICE '   Confirmed: %', confirmed_count;
  RAISE NOTICE '   In Progress: %', active_count;
  RAISE NOTICE '   Completed: %', completed_count;
  RAISE NOTICE '   Cancelled: %', cancelled_count;
  RAISE NOTICE '   TOTAL: %', total_count;
END;
$$;

-- Summary of risk snapshots
DO $$
DECLARE
  snapshot_count INTEGER;
  linked_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) THEN
    SELECT COUNT(*) INTO snapshot_count FROM booking_risk_snapshot;
    SELECT COUNT(*) INTO linked_count FROM bookings WHERE risk_snapshot_id IS NOT NULL;

    RAISE NOTICE '📊 Risk Snapshot Summary:';
    RAISE NOTICE '   Total snapshots: %', snapshot_count;
    RAISE NOTICE '   Linked bookings: %', linked_count;
  ELSE
    RAISE NOTICE 'ℹ️  Skipping snapshot summary: table does not exist';
  END IF;
END;
$$;

-- ============================================================================
-- 6. FINAL VALIDATION
-- ============================================================================

DO $$
DECLARE
  errors INTEGER := 0;
  table_exists BOOLEAN;
BEGIN
  -- Check if booking_risk_snapshot table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) INTO table_exists;

  -- Check 1: No invalid statuses
  SELECT COUNT(*) INTO errors
  FROM bookings
  WHERE status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'expired');

  IF errors > 0 THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: % bookings with invalid status', errors;
  END IF;

  -- Check 2: No orphaned snapshots (only if table exists)
  IF table_exists THEN
    SELECT COUNT(*) INTO errors
    FROM booking_risk_snapshot brs
    WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = brs.booking_id);

    IF errors > 0 THEN
      RAISE EXCEPTION '❌ VALIDATION FAILED: % orphaned risk snapshots', errors;
    END IF;
  END IF;

  -- Check 3: No invalid risk_snapshot_id references (only if table exists)
  IF table_exists THEN
    SELECT COUNT(*) INTO errors
    FROM bookings b
    WHERE b.risk_snapshot_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM booking_risk_snapshot brs WHERE brs.booking_id = b.risk_snapshot_id);

    IF errors > 0 THEN
      RAISE EXCEPTION '❌ VALIDATION FAILED: % invalid risk_snapshot_id references', errors;
    END IF;
  END IF;

  RAISE NOTICE '✅ ALL VALIDATIONS PASSED';
  RAISE NOTICE '✅ P0 fixes migration completed successfully';
END;
$$;
