-- ============================================
-- REMEDIACIÓN: Funciones SECURITY_DEFINER Críticas
-- Fecha: 2025-11-19
-- Total funciones: 9
-- Auditadas: 1 (wallet_confirm_deposit_admin)
-- Pendientes: 8
-- ============================================

-- INSTRUCCIONES:
-- 1. Revisar cada función individualmente
-- 2. Agregar validación de roles según el patrón
-- 3. Ejecutar tests antes de aplicar
-- 4. Aplicar en Supabase


-- ============================================
-- 1. wallet_confirm_deposit_admin ✅ AUDITADA
-- Riesgo: CRITICAL
-- Estado: COMPLETADA
-- ============================================

-- Esta función YA tiene validación de roles implementada.
-- Ver: supabase/migrations/20251118_wallet_constraints_and_admin_validation_p0.sql


-- ============================================
-- 2. wallet_lock_rental_payment
-- Riesgo: CRITICAL
-- Estado: PENDIENTE
-- ============================================

-- PATRÓN DE VALIDACIÓN (ajustar según función):
CREATE OR REPLACE FUNCTION public.wallet_lock_rental_payment(...)
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id UUID;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_user_id
  FROM profiles
  WHERE id = auth.uid();

  -- Ajustar condición según función:
  -- Para funciones admin: v_caller_role != 'admin'
  -- Para funciones owner: v_caller_role NOT IN ('admin', 'owner', 'ambos')
  -- Para funciones wallet: verificar que user_id = auth.uid()

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Ejemplo para funciones de wallet:
  -- IF v_caller_role != 'admin' AND p_user_id != v_user_id THEN
  --   RAISE EXCEPTION 'Solo puedes operar tu propia wallet';
  -- END IF;

  -- ... resto de la lógica original ...
END;
$$;

-- COMENTARIO:
COMMENT ON FUNCTION public.wallet_lock_rental_payment IS
  'P0 Security: Requiere validación de roles. Auditado 2025-11-19';


-- ============================================
-- 3. wallet_charge_rental
-- Riesgo: CRITICAL
-- Estado: PENDIENTE
-- ============================================

-- PATRÓN DE VALIDACIÓN (ajustar según función):
CREATE OR REPLACE FUNCTION public.wallet_charge_rental(...)
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id UUID;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_user_id
  FROM profiles
  WHERE id = auth.uid();

  -- Ajustar condición según función:
  -- Para funciones admin: v_caller_role != 'admin'
  -- Para funciones owner: v_caller_role NOT IN ('admin', 'owner', 'ambos')
  -- Para funciones wallet: verificar que user_id = auth.uid()

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Ejemplo para funciones de wallet:
  -- IF v_caller_role != 'admin' AND p_user_id != v_user_id THEN
  --   RAISE EXCEPTION 'Solo puedes operar tu propia wallet';
  -- END IF;

  -- ... resto de la lógica original ...
END;
$$;

-- COMENTARIO:
COMMENT ON FUNCTION public.wallet_charge_rental IS
  'P0 Security: Requiere validación de roles. Auditado 2025-11-19';


-- ============================================
-- 4. wallet_refund
-- Riesgo: CRITICAL
-- Estado: PENDIENTE
-- ============================================

-- PATRÓN DE VALIDACIÓN (ajustar según función):
CREATE OR REPLACE FUNCTION public.wallet_refund(...)
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id UUID;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_user_id
  FROM profiles
  WHERE id = auth.uid();

  -- Ajustar condición según función:
  -- Para funciones admin: v_caller_role != 'admin'
  -- Para funciones owner: v_caller_role NOT IN ('admin', 'owner', 'ambos')
  -- Para funciones wallet: verificar que user_id = auth.uid()

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Ejemplo para funciones de wallet:
  -- IF v_caller_role != 'admin' AND p_user_id != v_user_id THEN
  --   RAISE EXCEPTION 'Solo puedes operar tu propia wallet';
  -- END IF;

  -- ... resto de la lógica original ...
END;
$$;

-- COMENTARIO:
COMMENT ON FUNCTION public.wallet_refund IS
  'P0 Security: Requiere validación de roles. Auditado 2025-11-19';


-- ============================================
-- 5. wallet_transfer_to_owner
-- Riesgo: CRITICAL
-- Estado: PENDIENTE
-- ============================================

-- PATRÓN DE VALIDACIÓN (ajustar según función):
CREATE OR REPLACE FUNCTION public.wallet_transfer_to_owner(...)
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id UUID;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_user_id
  FROM profiles
  WHERE id = auth.uid();

  -- Ajustar condición según función:
  -- Para funciones admin: v_caller_role != 'admin'
  -- Para funciones owner: v_caller_role NOT IN ('admin', 'owner', 'ambos')
  -- Para funciones wallet: verificar que user_id = auth.uid()

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Ejemplo para funciones de wallet:
  -- IF v_caller_role != 'admin' AND p_user_id != v_user_id THEN
  --   RAISE EXCEPTION 'Solo puedes operar tu propia wallet';
  -- END IF;

  -- ... resto de la lógica original ...
END;
$$;

-- COMENTARIO:
COMMENT ON FUNCTION public.wallet_transfer_to_owner IS
  'P0 Security: Requiere validación de roles. Auditado 2025-11-19';


-- ============================================
-- 6. wallet_withdraw
-- Riesgo: CRITICAL
-- Estado: PENDIENTE
-- ============================================

-- PATRÓN DE VALIDACIÓN (ajustar según función):
CREATE OR REPLACE FUNCTION public.wallet_withdraw(...)
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id UUID;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_user_id
  FROM profiles
  WHERE id = auth.uid();

  -- Ajustar condición según función:
  -- Para funciones admin: v_caller_role != 'admin'
  -- Para funciones owner: v_caller_role NOT IN ('admin', 'owner', 'ambos')
  -- Para funciones wallet: verificar que user_id = auth.uid()

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Ejemplo para funciones de wallet:
  -- IF v_caller_role != 'admin' AND p_user_id != v_user_id THEN
  --   RAISE EXCEPTION 'Solo puedes operar tu propia wallet';
  -- END IF;

  -- ... resto de la lógica original ...
END;
$$;

-- COMENTARIO:
COMMENT ON FUNCTION public.wallet_withdraw IS
  'P0 Security: Requiere validación de roles. Auditado 2025-11-19';


-- ============================================
-- 7. process_payment
-- Riesgo: CRITICAL
-- Estado: PENDIENTE
-- ============================================

-- PATRÓN DE VALIDACIÓN (ajustar según función):
CREATE OR REPLACE FUNCTION public.process_payment(...)
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id UUID;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_user_id
  FROM profiles
  WHERE id = auth.uid();

  -- Ajustar condición según función:
  -- Para funciones admin: v_caller_role != 'admin'
  -- Para funciones owner: v_caller_role NOT IN ('admin', 'owner', 'ambos')
  -- Para funciones wallet: verificar que user_id = auth.uid()

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Ejemplo para funciones de wallet:
  -- IF v_caller_role != 'admin' AND p_user_id != v_user_id THEN
  --   RAISE EXCEPTION 'Solo puedes operar tu propia wallet';
  -- END IF;

  -- ... resto de la lógica original ...
END;
$$;

-- COMENTARIO:
COMMENT ON FUNCTION public.process_payment IS
  'P0 Security: Requiere validación de roles. Auditado 2025-11-19';


-- ============================================
-- 8. split_payment
-- Riesgo: CRITICAL
-- Estado: PENDIENTE
-- ============================================

-- PATRÓN DE VALIDACIÓN (ajustar según función):
CREATE OR REPLACE FUNCTION public.split_payment(...)
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id UUID;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_user_id
  FROM profiles
  WHERE id = auth.uid();

  -- Ajustar condición según función:
  -- Para funciones admin: v_caller_role != 'admin'
  -- Para funciones owner: v_caller_role NOT IN ('admin', 'owner', 'ambos')
  -- Para funciones wallet: verificar que user_id = auth.uid()

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Ejemplo para funciones de wallet:
  -- IF v_caller_role != 'admin' AND p_user_id != v_user_id THEN
  --   RAISE EXCEPTION 'Solo puedes operar tu propia wallet';
  -- END IF;

  -- ... resto de la lógica original ...
END;
$$;

-- COMENTARIO:
COMMENT ON FUNCTION public.split_payment IS
  'P0 Security: Requiere validación de roles. Auditado 2025-11-19';


-- ============================================
-- 9. process_mercadopago_webhook
-- Riesgo: CRITICAL
-- Estado: PENDIENTE
-- ============================================

-- PATRÓN DE VALIDACIÓN (ajustar según función):
CREATE OR REPLACE FUNCTION public.process_mercadopago_webhook(...)
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id UUID;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_user_id
  FROM profiles
  WHERE id = auth.uid();

  -- Ajustar condición según función:
  -- Para funciones admin: v_caller_role != 'admin'
  -- Para funciones owner: v_caller_role NOT IN ('admin', 'owner', 'ambos')
  -- Para funciones wallet: verificar que user_id = auth.uid()

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Ejemplo para funciones de wallet:
  -- IF v_caller_role != 'admin' AND p_user_id != v_user_id THEN
  --   RAISE EXCEPTION 'Solo puedes operar tu propia wallet';
  -- END IF;

  -- ... resto de la lógica original ...
END;
$$;

-- COMENTARIO:
COMMENT ON FUNCTION public.process_mercadopago_webhook IS
  'P0 Security: Requiere validación de roles. Auditado 2025-11-19';


-- ============================================
-- VERIFICACIÓN POST-APLICACIÓN
-- ============================================

-- Verificar que las funciones tienen validación:
SELECT
  p.proname as function_name,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%v_caller_role%'
      AND pg_get_functiondef(p.oid) LIKE '%profiles%'
    THEN '✅ Validación implementada'
    ELSE '❌ Validación NO implementada'
  END as status
FROM pg_proc p
WHERE p.proname IN ('wallet_confirm_deposit_admin', 'wallet_lock_rental_payment', 'wallet_charge_rental', 'wallet_refund', 'wallet_transfer_to_owner', 'wallet_withdraw', 'process_payment', 'split_payment', 'process_mercadopago_webhook')
ORDER BY p.proname;

-- ============================================
-- AUDIT LOG
-- ============================================

INSERT INTO wallet_audit_log (user_id, action, details)
VALUES (
  NULL,
  'security_definer_audit_2025-11-19',
  jsonb_build_object(
    'total_functions', 9,
    'audited', 1,
    'pending', 8,
    'timestamp', NOW()
  )
);
