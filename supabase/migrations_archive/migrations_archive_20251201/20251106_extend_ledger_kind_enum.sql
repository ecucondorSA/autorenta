-- ============================================================================
-- MIGRATION: Extend ledger_kind ENUM for Bonus-Malus
-- Date: 2025-11-06
-- Purpose: Add new ENUM values for Autorentar Credit tracking
-- Note: Must be separate migration - ENUM values can't be used in same transaction
-- ============================================================================

-- Add new kinds for Autorentar Credit
DO $$
BEGIN
  -- Add autorentar_credit_issued
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'autorentar_credit_issued' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_kind')) THEN
    ALTER TYPE ledger_kind ADD VALUE 'autorentar_credit_issued';
  END IF;

  -- Add autorentar_credit_consumed
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'autorentar_credit_consumed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_kind')) THEN
    ALTER TYPE ledger_kind ADD VALUE 'autorentar_credit_consumed';
  END IF;

  -- Add autorentar_credit_renewed
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'autorentar_credit_renewed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_kind')) THEN
    ALTER TYPE ledger_kind ADD VALUE 'autorentar_credit_renewed';
  END IF;

  -- Add autorentar_credit_breakage
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'autorentar_credit_breakage' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_kind')) THEN
    ALTER TYPE ledger_kind ADD VALUE 'autorentar_credit_breakage';
  END IF;

  -- Add addon_purchase
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'addon_purchase' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_kind')) THEN
    ALTER TYPE ledger_kind ADD VALUE 'addon_purchase';
  END IF;

  RAISE NOTICE 'Extended ledger_kind ENUM with 5 new values for Bonus-Malus system';
END $$;
