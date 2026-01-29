-- ============================================================================
-- Migration: Fix unlock_expired_wallet_locks with LIMIT and SKIP LOCKED
-- P0-6: Prevent deadlocks and timeouts when processing many expired locks
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DROP AND RECREATE: unlock_expired_wallet_locks()
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS unlock_expired_wallet_locks();

-- Recreate with LIMIT and SKIP LOCKED
CREATE OR REPLACE FUNCTION unlock_expired_wallet_locks(
  p_batch_size INTEGER DEFAULT 100  -- Process in batches to prevent timeouts
)
RETURNS TABLE (
  unlocked_count INTEGER,
  total_amount_unlocked BIGINT,
  affected_users UUID[],
  has_more BOOLEAN  -- Indicates if there are more locks to process
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- P0-7: Prevent search_path hijacking
AS $$
DECLARE
  v_unlocked_count INTEGER := 0;
  v_total_amount BIGINT := 0;
  v_affected_users UUID[] := ARRAY[]::UUID[];
  v_lock RECORD;
  v_remaining_count INTEGER;
BEGIN
  -- P0-6: Process locks in batches with LIMIT and SKIP LOCKED
  -- - LIMIT prevents processing too many in one transaction
  -- - SKIP LOCKED prevents deadlocks from concurrent executions
  -- - ORDER BY ensures oldest locks are processed first
  FOR v_lock IN
    SELECT
      wt.id,
      wt.user_id,
      wt.amount,
      wt.type,
      wt.reference_id,
      b.status as booking_status
    FROM wallet_transactions wt
    LEFT JOIN bookings b ON wt.reference_id = b.id
    WHERE wt.type IN ('lock', 'security_deposit_lock', 'rental_payment_lock')
      AND wt.status = 'completed'  -- Lock activo
      AND wt.locked_until IS NOT NULL
      AND wt.locked_until < NOW()  -- Expirado
      AND (
        -- Reserva no existe o esta en estado no-final
        b.id IS NULL
        OR b.status IN ('pending', 'pending_payment', 'cancelled_renter', 'cancelled_owner', 'cancelled_system', 'expired')
      )
    ORDER BY wt.locked_until ASC  -- Oldest first
    LIMIT p_batch_size
    FOR UPDATE OF wt SKIP LOCKED  -- P0-6: Skip locked rows to prevent deadlocks
  LOOP
    -- Marcar el lock como expirado
    UPDATE wallet_transactions
    SET
      status = 'expired',
      updated_at = NOW(),
      metadata = metadata || jsonb_build_object(
        'expired_at', NOW(),
        'expired_reason', 'automatic_expiration',
        'booking_status_at_expiration', v_lock.booking_status,
        'batch_processed', TRUE
      )
    WHERE id = v_lock.id;

    -- Actualizar el balance del usuario (desbloquear fondos)
    UPDATE user_wallets
    SET
      locked_balance_cents = GREATEST(0, locked_balance_cents - v_lock.amount),
      available_balance_cents = available_balance_cents + v_lock.amount,
      updated_at = NOW()
    WHERE user_id = v_lock.user_id;

    -- Crear transaccion de unlock correspondiente
    INSERT INTO wallet_transactions (
      user_id,
      type,
      amount,
      status,
      reference_id,
      description,
      metadata
    ) VALUES (
      v_lock.user_id,
      'unlock',
      v_lock.amount,
      'completed',
      v_lock.reference_id,
      'Unlock automatico por expiracion de lock',
      jsonb_build_object(
        'original_lock_id', v_lock.id,
        'original_lock_type', v_lock.type,
        'unlock_reason', 'lock_expiration',
        'booking_status', v_lock.booking_status
      )
    );

    -- Acumular contadores
    v_unlocked_count := v_unlocked_count + 1;
    v_total_amount := v_total_amount + v_lock.amount;

    -- Agregar usuario a lista de afectados (si no esta ya)
    IF NOT v_lock.user_id = ANY(v_affected_users) THEN
      v_affected_users := array_append(v_affected_users, v_lock.user_id);
    END IF;
  END LOOP;

  -- Check if there are more locks to process
  SELECT COUNT(*) INTO v_remaining_count
  FROM wallet_transactions wt
  LEFT JOIN bookings b ON wt.reference_id = b.id
  WHERE wt.type IN ('lock', 'security_deposit_lock', 'rental_payment_lock')
    AND wt.status = 'completed'
    AND wt.locked_until IS NOT NULL
    AND wt.locked_until < NOW()
    AND (
      b.id IS NULL
      OR b.status IN ('pending', 'pending_payment', 'cancelled_renter', 'cancelled_owner', 'cancelled_system', 'expired')
    );

  -- Log summary
  RAISE NOTICE 'Unlock batch completed: % locks, % cents, % more remaining',
    v_unlocked_count, v_total_amount, v_remaining_count;

  RETURN QUERY SELECT
    v_unlocked_count,
    v_total_amount,
    v_affected_users,
    (v_remaining_count > 0);  -- has_more
END;
$$;

COMMENT ON FUNCTION unlock_expired_wallet_locks(INTEGER) IS
'P0-6 FIX: Libera locks expirados en batches de tamaño configurable.
- Usa SKIP LOCKED para evitar deadlocks
- Usa LIMIT para evitar timeouts en Edge Functions
- Retorna has_more para indicar si hay mas locks por procesar
- Ejecutar multiples veces si has_more = true

Ejemplo de uso en cron job:
DO $$
DECLARE
  result RECORD;
BEGIN
  LOOP
    SELECT * INTO result FROM unlock_expired_wallet_locks(100);
    EXIT WHEN NOT result.has_more;
  END LOOP;
END $$;';

-- ============================================================================
-- 2. GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION unlock_expired_wallet_locks(INTEGER) TO service_role;

COMMIT;
