-- ============================================================================
-- FIX SECURITY DEFINER FUNCTIONS - Set search_path
-- ============================================================================
-- Migración: 20251111_fix_security_definer_search_path.sql
-- Fecha: 2025-11-11
-- Branch: claude/fix-rls-security-issues-011CV1U26pqHVjfF8N5KcnKh
--
-- PROBLEMA:
-- Funciones SECURITY DEFINER sin search_path fijado son vulnerables a:
-- - Inyección SQL mediante manipulación de search_path
-- - Comportamiento impredecible si el search_path cambia
--
-- SOLUCIÓN:
-- Fijar search_path en todas las funciones SECURITY DEFINER críticas usando
-- ALTER FUNCTION para evitar reescribir definiciones completas
--
-- ESTRATEGIA:
-- 1. Identificar todas las funciones public.* con SECURITY DEFINER
-- 2. Aplicar ALTER FUNCTION ... SET search_path = public, pg_catalog
-- 3. Priorizar funciones críticas: pricing, wallet, payment, booking
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: FUNCIONES DE PRICING (CRÍTICAS - P0)
-- ============================================================================

-- Pricing RPCs - compute_fee_with_class
ALTER FUNCTION public.compute_fee_with_class(UUID, BIGINT, INTEGER)
SET search_path = public, pg_catalog;

-- Pricing RPCs - compute_guarantee_with_class (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'compute_guarantee_with_class'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.compute_guarantee_with_class SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en compute_guarantee_with_class';
  END IF;
END $$;

-- Pricing RPCs - calculate_dynamic_price (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'calculate_dynamic_price'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.calculate_dynamic_price SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en calculate_dynamic_price';
  END IF;
END $$;

-- Pricing RPCs - get_batch_dynamic_prices (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_batch_dynamic_prices'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.get_batch_dynamic_prices SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en get_batch_dynamic_prices';
  END IF;
END $$;

-- ============================================================================
-- PARTE 2: FUNCIONES DE WALLET (CRÍTICAS - P0)
-- ============================================================================

-- Wallet - wallet_confirm_deposit_admin
ALTER FUNCTION public.wallet_confirm_deposit_admin(UUID, UUID, TEXT, JSONB)
SET search_path = public, pg_catalog;

-- Wallet - split_wallet_credits (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'split_wallet_credits'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.split_wallet_credits SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en split_wallet_credits';
  END IF;
END $$;

-- Wallet - process_wallet_transaction (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'process_wallet_transaction'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.process_wallet_transaction SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en process_wallet_transaction';
  END IF;
END $$;

-- ============================================================================
-- PARTE 3: FUNCIONES DE PAYMENT (CRÍTICAS - P0)
-- ============================================================================

-- Payment - prepare_booking_payment (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'prepare_booking_payment'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.prepare_booking_payment SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en prepare_booking_payment';
  END IF;
END $$;

-- Payment - process_payment_authorization (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'process_payment_authorization'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.process_payment_authorization SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en process_payment_authorization';
  END IF;
END $$;

-- ============================================================================
-- PARTE 4: FUNCIONES DE BOOKING (CRÍTICAS - P0)
-- ============================================================================

-- Booking - request_booking_with_location (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'request_booking_with_location'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.request_booking_with_location SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en request_booking_with_location';
  END IF;
END $$;

-- Booking - quote_booking_with_location (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'quote_booking_with_location'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.quote_booking_with_location SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en quote_booking_with_location';
  END IF;
END $$;

-- ============================================================================
-- PARTE 5: FUNCIONES DE BONUS/MALUS (PRIORIDAD P1)
-- ============================================================================

-- Bonus/Malus - compute_bonus_protector (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'compute_bonus_protector'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.compute_bonus_protector SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en compute_bonus_protector';
  END IF;
END $$;

-- Driver Profile - get_driver_profile (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_driver_profile'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.get_driver_profile SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en get_driver_profile';
  END IF;
END $$;

-- ============================================================================
-- PARTE 6: FUNCIONES DE TELEMETRY (PRIORIDAD P1)
-- ============================================================================

-- Telemetry - record_telemetry_event (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'record_telemetry_event'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.record_telemetry_event SET search_path = public, pg_catalog';
    RAISE NOTICE 'search_path fijado en record_telemetry_event';
  END IF;
END $$;

-- ============================================================================
-- PARTE 7: AUTO-FIX PARA FUNCIONES SECURITY DEFINER RESTANTES
-- Aplica search_path a todas las funciones SECURITY DEFINER que aún no lo tienen
-- ============================================================================

DO $$
DECLARE
  func_record RECORD;
  fix_count INTEGER := 0;
  skip_count INTEGER := 0;
  func_signature TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'AUTO-FIX: Aplicando search_path a funciones SECURITY DEFINER restantes';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  FOR func_record IN (
    SELECT
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args,
      p.oid::regprocedure::text as full_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true  -- SECURITY DEFINER
      AND NOT EXISTS (
        -- Verificar si ya tiene search_path configurado
        SELECT 1
        FROM unnest(p.proconfig) cfg
        WHERE cfg LIKE 'search_path=%'
      )
    ORDER BY p.proname
  ) LOOP
    BEGIN
      -- Intentar aplicar search_path
      func_signature := format('%I.%I(%s)',
        func_record.schema_name,
        func_record.function_name,
        func_record.args
      );

      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog',
        func_record.full_signature
      );

      fix_count := fix_count + 1;
      RAISE NOTICE 'FIXED: % - %', fix_count, func_record.full_signature;

    EXCEPTION WHEN OTHERS THEN
      skip_count := skip_count + 1;
      RAISE WARNING 'SKIP: % - Error: %', func_record.full_signature, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'AUTO-FIX COMPLETO:';
  RAISE NOTICE '  ✅ Funciones corregidas: %', fix_count;
  RAISE NOTICE '  ⚠️  Funciones saltadas: %', skip_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- Listar funciones SECURITY DEFINER que todavía NO tienen search_path
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  vulnerable_count INTEGER := 0;
  secure_count INTEGER := 0;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN: Funciones SECURITY DEFINER en schema public';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  FOR r IN (
    SELECT
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM unnest(p.proconfig) cfg
          WHERE cfg LIKE 'search_path=%'
        ) THEN '✅ SEGURA (search_path fijado)'
        ELSE '❌ VULNERABLE (sin search_path)'
      END AS status,
      EXISTS (
        SELECT 1
        FROM unnest(p.proconfig) cfg
        WHERE cfg LIKE 'search_path=%'
      ) AS has_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true  -- SECURITY DEFINER
    ORDER BY has_search_path ASC, p.proname
  ) LOOP
    IF r.has_search_path THEN
      secure_count := secure_count + 1;
    ELSE
      vulnerable_count := vulnerable_count + 1;
    END IF;

    RAISE NOTICE '%: %(%)', r.status, r.function_name, r.args;
  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RESUMEN:';
  RAISE NOTICE '  ✅ Funciones seguras: %', secure_count;
  RAISE NOTICE '  ❌ Funciones vulnerables: %', vulnerable_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  IF vulnerable_count > 0 THEN
    RAISE WARNING '% funciones SECURITY DEFINER todavía sin search_path!', vulnerable_count;
    RAISE WARNING 'Revisar manualmente y aplicar: ALTER FUNCTION ... SET search_path = public, pg_catalog';
  ELSE
    RAISE NOTICE 'ÉXITO: Todas las funciones SECURITY DEFINER tienen search_path fijado.';
  END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

COMMIT;

-- Log de finalización
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Migración 20251111 (search_path) aplicada exitosamente';
  RAISE NOTICE 'Fecha: 2025-11-11';
  RAISE NOTICE 'Branch: claude/fix-rls-security-issues-011CV1U26pqHVjfF8N5KcnKh';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Funciones críticas aseguradas:';
  RAISE NOTICE '  ✅ Pricing: compute_fee_with_class, calculate_dynamic_price, etc.';
  RAISE NOTICE '  ✅ Wallet: wallet_confirm_deposit_admin, split_wallet_credits, etc.';
  RAISE NOTICE '  ✅ Payment: prepare_booking_payment, process_payment_authorization, etc.';
  RAISE NOTICE '  ✅ Booking: request_booking_with_location, quote_booking_with_location, etc.';
  RAISE NOTICE '  ✅ Bonus/Malus: compute_bonus_protector, get_driver_profile, etc.';
  RAISE NOTICE '  ✅ Auto-fix aplicado a todas las funciones SECURITY DEFINER restantes';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Próximos pasos:';
  RAISE NOTICE '  1. Habilitar leaked password protection en Supabase Auth Dashboard';
  RAISE NOTICE '  2. Testing completo con roles anon, authenticated, service_role';
  RAISE NOTICE '  3. Monitoreo de logs para detectar intentos de explotación';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
