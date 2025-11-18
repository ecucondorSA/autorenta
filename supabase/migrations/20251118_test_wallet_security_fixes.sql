-- ============================================
-- TESTS: Validación de Fixes de Seguridad P0/P1
-- Fecha: 2025-11-18
-- Run: psql < 20251118_test_wallet_security_fixes.sql
-- ============================================

-- NOTA: Este archivo DEBE ejecutarse DESPUÉS de las migraciones P0/P1
-- Requiere:
-- - 20251118_enable_rls_wallets_p0_critical.sql
-- - 20251118_wallet_constraints_and_admin_validation_p0.sql

DO $$
DECLARE
  v_test_user_a UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_test_user_b UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_admin_user UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_test_passed INTEGER := 0;
  v_test_failed INTEGER := 0;
  v_error_msg TEXT;
BEGIN
  RAISE NOTICE 'Ejecutando tests de seguridad...';
  RAISE NOTICE '';

  -- =========================
  -- TEST 1: RLS en user_wallets habilitado
  -- =========================
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = 'user_wallets' 
        AND rowsecurity = true
    ) THEN
      v_test_passed := v_test_passed + 1;
      RAISE NOTICE '✅ TEST 1 PASS: RLS habilitado en user_wallets';
    ELSE
      v_test_failed := v_test_failed + 1;
      RAISE NOTICE '❌ TEST 1 FAIL: RLS NO habilitado en user_wallets';
    END IF;
  END;

  -- =========================
  -- TEST 2: RLS en wallet_transactions habilitado
  -- =========================
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = 'wallet_transactions' 
        AND rowsecurity = true
    ) THEN
      v_test_passed := v_test_passed + 1;
      RAISE NOTICE '✅ TEST 2 PASS: RLS habilitado en wallet_transactions';
    ELSE
      v_test_failed := v_test_failed + 1;
      RAISE NOTICE '❌ TEST 2 FAIL: RLS NO habilitado en wallet_transactions';
    END IF;
  END;

  -- =========================
  -- TEST 3: Policy user_wallets_select_own existe
  -- =========================
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'user_wallets' 
        AND policyname = 'user_wallets_select_own'
    ) THEN
      v_test_passed := v_test_passed + 1;
      RAISE NOTICE '✅ TEST 3 PASS: Policy user_wallets_select_own existe';
    ELSE
      v_test_failed := v_test_failed + 1;
      RAISE NOTICE '❌ TEST 3 FAIL: Policy user_wallets_select_own NO existe';
    END IF;
  END;

  -- =========================
  -- TEST 4: Policy wallet_transactions_select_own existe
  -- =========================
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'wallet_transactions' 
        AND policyname = 'wallet_transactions_select_own'
    ) THEN
      v_test_passed := v_test_passed + 1;
      RAISE NOTICE '✅ TEST 4 PASS: Policy wallet_transactions_select_own existe';
    ELSE
      v_test_failed := v_test_failed + 1;
      RAISE NOTICE '❌ TEST 4 FAIL: Policy wallet_transactions_select_own NO existe';
    END IF;
  END;

  -- =========================
  -- TEST 5: Constraint available_balance >= 0 existe
  -- =========================
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'check_available_balance_non_negative'
    ) THEN
      v_test_passed := v_test_passed + 1;
      RAISE NOTICE '✅ TEST 5 PASS: Constraint available_balance >= 0 existe';
    ELSE
      v_test_failed := v_test_failed + 1;
      RAISE NOTICE '❌ TEST 5 FAIL: Constraint available_balance >= 0 NO existe';
    END IF;
  END;

  -- =========================
  -- TEST 6: Constraint locked_balance >= 0 existe
  -- =========================
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'check_locked_balance_non_negative'
    ) THEN
      v_test_passed := v_test_passed + 1;
      RAISE NOTICE '✅ TEST 6 PASS: Constraint locked_balance >= 0 existe';
    ELSE
      v_test_failed := v_test_failed + 1;
      RAISE NOTICE '❌ TEST 6 FAIL: Constraint locked_balance >= 0 NO existe';
    END IF;
  END;

  -- =========================
  -- TEST 7: Constraint non_withdrawable_floor >= 0 existe
  -- =========================
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'check_non_withdrawable_floor_non_negative'
    ) THEN
      v_test_passed := v_test_passed + 1;
      RAISE NOTICE '✅ TEST 7 PASS: Constraint non_withdrawable_floor >= 0 existe';
    ELSE
      v_test_failed := v_test_failed + 1;
      RAISE NOTICE '❌ TEST 7 FAIL: Constraint non_withdrawable_floor >= 0 NO existe';
    END IF;
  END;

  -- =========================
  -- TEST 8: Constraint non_withdrawable_floor <= available_balance existe
  -- =========================
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'check_non_withdrawable_floor_within_available'
    ) THEN
      v_test_passed := v_test_passed + 1;
      RAISE NOTICE '✅ TEST 8 PASS: Constraint non_withdrawable_floor <= available_balance existe';
    ELSE
      v_test_failed := v_test_failed + 1;
      RAISE NOTICE '❌ TEST 8 FAIL: Constraint non_withdrawable_floor <= available_balance NO existe';
    END IF;
  END;

  -- =========================
  -- TEST 9: Balance negativo debe fallar
  -- =========================
  BEGIN
    -- Crear wallet de prueba
    INSERT INTO user_wallets (user_id, currency, available_balance, locked_balance, non_withdrawable_floor)
    VALUES (v_test_user_a, 'ARS', 1000, 0, 0)
    ON CONFLICT (user_id) DO UPDATE 
    SET available_balance = 1000, locked_balance = 0, non_withdrawable_floor = 0;

    -- Intentar balance negativo (debe fallar)
    BEGIN
      UPDATE user_wallets SET available_balance = -100 WHERE user_id = v_test_user_a;
      v_test_failed := v_test_failed + 1;
      RAISE NOTICE '❌ TEST 9 FAIL: Balance negativo NO fue rechazado';
    EXCEPTION WHEN check_violation THEN
      v_test_passed := v_test_passed + 1;
      RAISE NOTICE '✅ TEST 9 PASS: Balance negativo fue rechazado correctamente';
    END;
  END;

  -- =========================
  -- TEST 10: non_withdrawable_floor > available debe fallar
  -- =========================
  BEGIN
    BEGIN
      UPDATE user_wallets 
      SET non_withdrawable_floor = 2000, available_balance = 1000 
      WHERE user_id = v_test_user_a;
      v_test_failed := v_test_failed + 1;
      RAISE NOTICE '❌ TEST 10 FAIL: non_withdrawable_floor > available NO fue rechazado';
    EXCEPTION WHEN check_violation THEN
      v_test_passed := v_test_passed + 1;
      RAISE NOTICE '✅ TEST 10 PASS: non_withdrawable_floor > available fue rechazado';
    END;
  END;

  -- =========================
  -- CLEANUP
  -- =========================
  DELETE FROM user_wallets WHERE user_id IN (v_test_user_a, v_test_user_b, v_admin_user);

  -- =========================
  -- RESUMEN
  -- =========================
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RESUMEN DE TESTS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tests pasados: %', v_test_passed;
  RAISE NOTICE 'Tests fallidos: %', v_test_failed;
  RAISE NOTICE '';

  IF v_test_failed > 0 THEN
    RAISE EXCEPTION 'TESTS FALLIDOS: % tests no pasaron', v_test_failed;
  ELSE
    RAISE NOTICE '✅ TODOS LOS TESTS PASARON';
  END IF;
END $$;
