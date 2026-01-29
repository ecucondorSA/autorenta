-- ============================================================================
-- Migración 002: Limpieza de non_withdrawable_floor obsoleto
-- ============================================================================
-- Fecha: 2025-10-22
-- Propósito: Eliminar el campo non_withdrawable_floor ya que ahora el crédito
--            protegido se calcula desde transacciones específicas
--
-- Cambios:
-- 1. Resetear non_withdrawable_floor a 0 en todas las filas
-- 2. (Opcional) Eliminar la columna completamente
--
-- Rollback: Restaurar columna con ALTER TABLE ADD COLUMN
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Resetear valores a 0
-- ============================================================================
-- El campo non_withdrawable_floor ya no se usa. El crédito protegido ahora
-- se calcula desde wallet_transactions con reference_type='credit_protected'

UPDATE user_wallets
SET
  non_withdrawable_floor = 0,
  updated_at = NOW()
WHERE non_withdrawable_floor > 0;

-- ============================================================================
-- STEP 2 (OPCIONAL): Eliminar columna
-- ============================================================================
-- Comentado por ahora para mantener backward compatibility.
-- Descomentar cuando se verifique que ningún código usa este campo.

-- ALTER TABLE user_wallets
--   DROP COLUMN IF EXISTS non_withdrawable_floor;

-- ============================================================================
-- Verificación
-- ============================================================================

-- Mostrar cuántas filas tenían floor > 0
SELECT
  COUNT(*) as total_wallets,
  COUNT(CASE WHEN non_withdrawable_floor > 0 THEN 1 END) as wallets_with_floor
FROM user_wallets;

COMMIT;
