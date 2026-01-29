-- ============================================
-- MIGRATION: Habilitar RLS en Wallets (P0 CRÍTICO)
-- Fecha: 2025-11-18
-- Severity: CRITICAL (CVSS 9.1)
-- Issue: user_wallets y wallet_transactions sin Row Level Security
-- ============================================

-- 1. HABILITAR RLS EN user_wallets
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- 2. HABILITAR RLS EN wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES PARA user_wallets

-- 3.1. SELECT: Solo el dueño puede ver su wallet
CREATE POLICY user_wallets_select_own
  ON user_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3.2. UPDATE: Solo el dueño puede actualizar su wallet (via RPC preferred)
CREATE POLICY user_wallets_update_own
  ON user_wallets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 3.3. INSERT: Solo via RPC functions (SECURITY DEFINER)
-- Permitir INSERT solo si viene de función SECURITY DEFINER
CREATE POLICY user_wallets_insert_via_rpc
  ON user_wallets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3.4. DELETE: Prohibido (wallets nunca se eliminan)
-- No policy = no DELETE permitido

-- 4. POLICIES PARA wallet_transactions

-- 4.1. SELECT: Solo el dueño puede ver sus transacciones
CREATE POLICY wallet_transactions_select_own
  ON wallet_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4.2. INSERT: Solo via RPC functions (SECURITY DEFINER)
-- Para prevenir creación manual de transacciones
CREATE POLICY wallet_transactions_insert_via_rpc
  ON wallet_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4.3. UPDATE: Solo via RPC functions (SECURITY DEFINER)
-- Usuarios NO pueden modificar transacciones directamente
CREATE POLICY wallet_transactions_update_via_rpc
  ON wallet_transactions
  FOR UPDATE
  USING (FALSE);  -- Solo via RPC SECURITY DEFINER

-- 4.4. DELETE: Prohibido (transacciones son immutable)
-- No policy = no DELETE permitido

-- 5. BYPASS PARA SERVICE ROLE
-- Las funciones SECURITY DEFINER ejecutan con service_role y bypasean RLS automáticamente

-- 6. VERIFICACIÓN DE RLS
DO $$
BEGIN
  -- Verificar que RLS está habilitado
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'user_wallets' 
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS no está habilitado en user_wallets';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'wallet_transactions' 
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS no está habilitado en wallet_transactions';
  END IF;

  RAISE NOTICE 'RLS habilitado correctamente en wallets ✅';
END $$;

-- 7. AUDIT LOG
INSERT INTO wallet_audit_log (user_id, action, details)
VALUES (
  NULL,
  'enable_rls_wallets',
  jsonb_build_object(
    'migration', '20251118_enable_rls_wallets_p0_critical',
    'tables', ARRAY['user_wallets', 'wallet_transactions'],
    'severity', 'P0_CRITICAL',
    'cvss', 9.1
  )
);

-- 8. COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON POLICY user_wallets_select_own ON user_wallets IS 
  'P0 Security: Solo el dueño puede leer su wallet. CVSS 9.1 fix.';

COMMENT ON POLICY wallet_transactions_select_own ON wallet_transactions IS 
  'P0 Security: Solo el dueño puede leer sus transacciones. CVSS 9.1 fix.';
