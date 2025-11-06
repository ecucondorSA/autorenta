-- ============================================================================
-- MIGRATION: Bonus-Malus Accounting Integration
-- Date: 2025-11-06
-- Purpose: Add accounting accounts and automatic triggers for Bonus-Malus
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ADD ACCOUNTING ACCOUNTS
-- ============================================================================

-- Check if accounting_accounts table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_accounts') THEN
    RAISE NOTICE 'accounting_accounts table does not exist. Skipping account creation.';
    RETURN;
  END IF;

  -- Add Autorentar Credit accounts
  INSERT INTO accounting_accounts (code, name, account_type, sub_type, is_control_account) VALUES
    ('2108', 'Ingresos Diferidos - Crédito Autorentar', 'LIABILITY', 'current_liability', FALSE),
    ('4104', 'Ingresos por Recuperación Crédito Autorentar', 'INCOME', 'operating_income', FALSE),
    ('4105', 'Ingresos por Breakage Crédito Autorentar', 'INCOME', 'operating_income', FALSE),
    ('4106', 'Ingresos por Servicios Adicionales', 'INCOME', 'operating_income', FALSE)
  ON CONFLICT (code) DO NOTHING;

  RAISE NOTICE 'Added 4 accounting accounts for Bonus-Malus system';
END $$;

-- ============================================================================
-- SECTION 2: ACCOUNTING TRIGGER FUNCTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 Trigger Function: Autorentar Credit Issuance
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_accounting_autorentar_credit_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount_usd NUMERIC;
  v_entry_id UUID;
BEGIN
  -- Only process if accounting system exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_journal_entries') THEN
    RETURN NEW;
  END IF;

  -- Only process issuance events
  IF NEW.kind != 'autorentar_credit_issued' THEN
    RETURN NEW;
  END IF;

  v_amount_usd := ABS(NEW.amount_cents) / 100.0;

  -- Create journal entry (no cash movement, just liability recognition)
  -- DEBE: N/A (virtual credit, no cash received)
  -- HABER: 2108 - Ingresos Diferidos - Crédito Autorentar

  INSERT INTO accounting_journal_entries (
    entry_date,
    description,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    NEW.created_at,
    FORMAT('Emisión Crédito Autorentar - Usuario %s', LEFT(NEW.user_id::TEXT, 8)),
    'autorentar_credit_issue',
    NEW.id,
    NEW.user_id
  )
  RETURNING id INTO v_entry_id;

  -- Credit: Deferred Income (Liability)
  INSERT INTO accounting_ledger (
    journal_entry_id,
    account_code,
    debit_amount,
    credit_amount,
    description
  ) VALUES (
    v_entry_id,
    '2108',
    0,
    v_amount_usd,
    FORMAT('Crédito Autorentar emitido: $%s', v_amount_usd)
  );

  RAISE NOTICE 'Accounting: Issued Autorentar Credit $%', v_amount_usd;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2.2 Trigger Function: Autorentar Credit Consumption
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_accounting_autorentar_credit_consume()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount_usd NUMERIC;
  v_entry_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_journal_entries') THEN
    RETURN NEW;
  END IF;

  IF NEW.kind != 'autorentar_credit_consumed' THEN
    RETURN NEW;
  END IF;

  v_amount_usd := ABS(NEW.amount_cents) / 100.0;

  -- Recognize revenue from credit consumption
  -- DEBE: 2108 - Ingresos Diferidos
  -- HABER: 4104 - Ingresos por Recuperación Crédito Autorentar

  INSERT INTO accounting_journal_entries (
    entry_date,
    description,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    NEW.created_at,
    FORMAT('Consumo Crédito Autorentar - Claim %s', (NEW.meta->>'claim_id')::TEXT),
    'autorentar_credit_consume',
    NEW.id,
    NEW.user_id
  )
  RETURNING id INTO v_entry_id;

  -- Debit: Deferred Income (decrease liability)
  INSERT INTO accounting_ledger (journal_entry_id, account_code, debit_amount, credit_amount, description)
  VALUES (v_entry_id, '2108', v_amount_usd, 0, FORMAT('Consumo Crédito Autorentar: $%s', v_amount_usd));

  -- Credit: Revenue Recognition
  INSERT INTO accounting_ledger (journal_entry_id, account_code, debit_amount, credit_amount, description)
  VALUES (v_entry_id, '4104', 0, v_amount_usd, FORMAT('Ingreso por uso de crédito: $%s', v_amount_usd));

  RAISE NOTICE 'Accounting: Consumed Autorentar Credit $% (Revenue recognized)', v_amount_usd;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2.3 Trigger Function: Autorentar Credit Breakage
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_accounting_autorentar_credit_breakage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount_usd NUMERIC;
  v_entry_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_journal_entries') THEN
    RETURN NEW;
  END IF;

  IF NEW.kind != 'autorentar_credit_breakage' THEN
    RETURN NEW;
  END IF;

  v_amount_usd := ABS(NEW.amount_cents) / 100.0;

  -- Recognize breakage revenue (unused credit expired)
  -- DEBE: 2108 - Ingresos Diferidos
  -- HABER: 4105 - Ingresos por Breakage

  INSERT INTO accounting_journal_entries (
    entry_date,
    description,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    NEW.created_at,
    FORMAT('Breakage Crédito Autorentar - Motivo: %s', NEW.meta->>'reason'),
    'autorentar_credit_breakage',
    NEW.id,
    NEW.user_id
  )
  RETURNING id INTO v_entry_id;

  -- Debit: Deferred Income
  INSERT INTO accounting_ledger (journal_entry_id, account_code, debit_amount, credit_amount, description)
  VALUES (v_entry_id, '2108', v_amount_usd, 0, FORMAT('Breakage Crédito Autorentar: $%s', v_amount_usd));

  -- Credit: Breakage Revenue
  INSERT INTO accounting_ledger (journal_entry_id, account_code, debit_amount, credit_amount, description)
  VALUES (v_entry_id, '4105', 0, v_amount_usd, FORMAT('Ingreso por breakage: $%s', v_amount_usd));

  RAISE NOTICE 'Accounting: Breakage revenue recognized $%', v_amount_usd;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2.4 Trigger Function: Bonus Protector Purchase
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_accounting_addon_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount_usd NUMERIC;
  v_entry_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_journal_entries') THEN
    RETURN NEW;
  END IF;

  -- Only process addon purchases (kind = 'addon_purchase')
  IF NEW.kind != 'addon_purchase' THEN
    RETURN NEW;
  END IF;

  v_amount_usd := ABS(NEW.amount_cents) / 100.0;

  -- Immediate revenue recognition (addon purchase)
  -- DEBE: User Wallet (implicit, handled separately)
  -- HABER: 4106 - Ingresos por Servicios Adicionales

  INSERT INTO accounting_journal_entries (
    entry_date,
    description,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    NEW.created_at,
    FORMAT('Compra %s', NEW.meta->>'addon_type'),
    'addon_purchase',
    NEW.id,
    NEW.user_id
  )
  RETURNING id INTO v_entry_id;

  -- Credit: Additional Services Revenue
  INSERT INTO accounting_ledger (journal_entry_id, account_code, debit_amount, credit_amount, description)
  VALUES (v_entry_id, '4106', 0, v_amount_usd, FORMAT('Ingreso por addon: $%s', v_amount_usd));

  -- Note: Debit side is handled by wallet deduction (separate ledger entry)

  RAISE NOTICE 'Accounting: Addon purchase revenue $%', v_amount_usd;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 3: ATTACH TRIGGERS TO wallet_ledger
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_accounting_ac_issue ON wallet_ledger;
DROP TRIGGER IF EXISTS trigger_accounting_ac_consume ON wallet_ledger;
DROP TRIGGER IF EXISTS trigger_accounting_ac_breakage ON wallet_ledger;
DROP TRIGGER IF EXISTS trigger_accounting_addon ON wallet_ledger;

-- Create triggers
CREATE TRIGGER trigger_accounting_ac_issue
  AFTER INSERT ON wallet_ledger
  FOR EACH ROW
  WHEN (NEW.kind = 'autorentar_credit_issued')
  EXECUTE FUNCTION trigger_accounting_autorentar_credit_issue();

CREATE TRIGGER trigger_accounting_ac_consume
  AFTER INSERT ON wallet_ledger
  FOR EACH ROW
  WHEN (NEW.kind = 'autorentar_credit_consumed')
  EXECUTE FUNCTION trigger_accounting_autorentar_credit_consume();

CREATE TRIGGER trigger_accounting_ac_breakage
  AFTER INSERT ON wallet_ledger
  FOR EACH ROW
  WHEN (NEW.kind = 'autorentar_credit_breakage')
  EXECUTE FUNCTION trigger_accounting_autorentar_credit_breakage();

CREATE TRIGGER trigger_accounting_addon
  AFTER INSERT ON wallet_ledger
  FOR EACH ROW
  WHEN (NEW.kind = 'addon_purchase')
  EXECUTE FUNCTION trigger_accounting_addon_purchase();

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration integrates Bonus-Malus with the accounting system:
--
-- New Accounts:
-- - 2108: Ingresos Diferidos - Crédito Autorentar (LIABILITY)
-- - 4104: Ingresos por Recuperación Crédito Autorentar (INCOME)
-- - 4105: Ingresos por Breakage Crédito Autorentar (INCOME)
-- - 4106: Ingresos por Servicios Adicionales (INCOME)
--
-- Triggers:
-- - Autorentar Credit issuance → Deferred income recognition
-- - Credit consumption → Revenue recognition
-- - Credit breakage → Breakage revenue
-- - Addon purchase → Immediate revenue
--
-- Accounting Flow:
-- 1. Issue: HABER 2108 (deferred liability)
-- 2. Consume: DEBE 2108, HABER 4104 (recognize revenue)
-- 3. Breakage: DEBE 2108, HABER 4105 (breakage revenue)
-- 4. Addon: HABER 4106 (immediate revenue)
--
-- All movements are automatically recorded via triggers.
-- Compatible with existing accounting_automated_system (20251026).
--
-- Next: FASE 7 - Telemetry RPCs (record_telemetry, calculate_telemetry_score)
-- ============================================================================

COMMIT;
