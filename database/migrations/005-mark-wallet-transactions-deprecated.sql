-- =====================================================
-- Migration 005: Mark wallet_transactions as DEPRECATED
-- =====================================================
-- Fecha: 2025-10-22
-- Propósito: Marcar wallet_transactions como tabla legacy
--            La tabla aún existe para backward compatibility,
--            pero todo nuevo código debe usar wallet_ledger
-- =====================================================

-- Actualizar comentario de la tabla
COMMENT ON TABLE wallet_transactions IS
'⚠️ DEPRECATED: Esta tabla se mantiene solo para backward compatibility.

Todo nuevo código debe usar wallet_ledger (sistema de doble partida).

Migración planeada:
- Fase 1 (ACTUAL): Lectura desde ambas tablas (wallet_transactions y wallet_ledger)
- Fase 2: Solo lectura desde wallet_ledger (consolidar datos históricos)
- Fase 3: Eliminar wallet_transactions (después de 3 meses)

Última actualización: 2025-10-22
Responsable: Sistema de Wallet AutoRenta';

-- Actualizar comentarios de columnas críticas
COMMENT ON COLUMN wallet_transactions.id IS
'UUID de la transacción. ⚠️ DEPRECATED: Migrar a wallet_ledger.id';

COMMENT ON COLUMN wallet_transactions.type IS
'Tipo de transacción. ⚠️ DEPRECATED: Migrar a wallet_ledger.kind (enum ledger_kind)';

COMMENT ON COLUMN wallet_transactions.status IS
'Estado de la transacción. ⚠️ DEPRECATED: wallet_ledger usa triggers atómicos';

COMMENT ON COLUMN wallet_transactions.provider_metadata IS
'Metadata del proveedor de pago. ⚠️ DEPRECATED: Migrar a wallet_ledger.meta (JSONB)';

-- Crear vista de compatibilidad para facilitar migración
CREATE OR REPLACE VIEW v_wallet_transactions_legacy_compat AS
SELECT
  wt.id,
  wt.user_id,
  wt.type,
  wt.status,
  wt.amount,
  wt.currency,
  wt.is_withdrawable,
  wt.reference_type,
  wt.reference_id,
  wt.provider,
  wt.provider_transaction_id,
  wt.provider_metadata,
  wt.description,
  wt.admin_notes,
  wt.created_at,
  wt.updated_at,
  wt.completed_at,

  -- Flag para identificar si existe en ledger
  EXISTS (
    SELECT 1 FROM wallet_ledger wl
    WHERE wl.transaction_id = wt.id
  ) as migrated_to_ledger,

  -- ID en ledger si existe
  (
    SELECT wl.id FROM wallet_ledger wl
    WHERE wl.transaction_id = wt.id
    LIMIT 1
  ) as ledger_id

FROM wallet_transactions wt
ORDER BY wt.created_at DESC;

COMMENT ON VIEW v_wallet_transactions_legacy_compat IS
'Vista de compatibilidad que muestra wallet_transactions con flag de migración a ledger.
 Usar esta vista para identificar transacciones que aún no fueron migradas.';

-- Grants
GRANT SELECT ON v_wallet_transactions_legacy_compat TO authenticated;
GRANT SELECT ON v_wallet_transactions_legacy_compat TO service_role;

-- =====================================================
-- TRIGGER DE ADVERTENCIA (opcional - comentado)
-- =====================================================

/*
-- Trigger que registra un warning cada vez que se inserta en wallet_transactions
CREATE OR REPLACE FUNCTION warn_deprecated_table()
RETURNS TRIGGER AS $$
BEGIN
  RAISE WARNING 'wallet_transactions is DEPRECATED. Use wallet_ledger instead. Transaction ID: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_warn_deprecated_wallet_transactions
  BEFORE INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION warn_deprecated_table();
*/

-- =====================================================
-- FIN DE MIGRACIÓN 005
-- =====================================================
