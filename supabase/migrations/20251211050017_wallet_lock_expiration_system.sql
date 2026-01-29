-- ============================================================================
-- MIGRACION: Sistema de Expiracion de Locks de Wallet
-- ============================================================================
-- Fecha: 2025-12-11
-- Proposito: Agregar expiracion automatica a los bloqueos de garantia
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. AGREGAR COLUMNA locked_until A wallet_transactions
-- ============================================================================

-- Agregar columna para fecha de expiracion del lock
ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Agregar indice para busquedas eficientes de locks expirados
CREATE INDEX IF NOT EXISTS idx_wallet_tx_lock_expiration
ON wallet_transactions(locked_until)
WHERE type IN ('lock', 'security_deposit_lock', 'rental_payment_lock')
  AND status = 'completed'
  AND locked_until IS NOT NULL;

-- Comentario explicativo
COMMENT ON COLUMN wallet_transactions.locked_until IS
'Fecha de expiracion del lock. Despues de esta fecha, el lock se libera automaticamente si la reserva no se completo.';

-- ============================================================================
-- 2. ACTUALIZAR STATUS CONSTRAINT PARA INCLUIR ''expired''
-- ============================================================================

-- Primero eliminar el constraint existente
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS valid_status;

-- Recrear con el nuevo valor 'expired'
ALTER TABLE wallet_transactions
ADD CONSTRAINT valid_status CHECK (
  status = ANY (ARRAY[
    'pending'::text,
    'completed'::text,
    'failed'::text,
    'refunded'::text,
    'expired'::text  -- NUEVO: para locks que expiraron sin completar
  ])
);

COMMENT ON CONSTRAINT valid_status ON wallet_transactions IS
'Estados validos: pending, completed, failed, refunded, expired (locks expirados)';

-- ============================================================================
-- 3. FUNCION: unlock_expired_wallet_locks()
-- ============================================================================

CREATE OR REPLACE FUNCTION unlock_expired_wallet_locks()
RETURNS TABLE (
  unlocked_count INTEGER,
  total_amount_unlocked BIGINT,
  affected_users UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unlocked_count INTEGER := 0;
  v_total_amount BIGINT := 0;
  v_affected_users UUID[] := ARRAY[]::UUID[];
  v_lock RECORD;
BEGIN
  -- Buscar todos los locks expirados que estan en status 'completed' (activos)
  -- y cuya reserva asociada NO esta en un estado final
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
    FOR UPDATE OF wt  -- Lock pesimista para evitar race conditions
  LOOP
    -- Marcar el lock como expirado
    UPDATE wallet_transactions
    SET
      status = 'expired',
      updated_at = NOW(),
      metadata = metadata || jsonb_build_object(
        'expired_at', NOW(),
        'expired_reason', 'automatic_expiration',
        'booking_status_at_expiration', v_lock.booking_status
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
      description,
      reference_type,
      reference_id,
      metadata
    ) VALUES (
      v_lock.user_id,
      'unlock',
      v_lock.amount,
      'completed',
      'Liberacion automatica por expiracion de lock',
      'booking',
      v_lock.reference_id,
      jsonb_build_object(
        'original_lock_id', v_lock.id,
        'unlock_reason', 'lock_expiration',
        'expired_at', NOW()
      )
    );

    -- Contadores
    v_unlocked_count := v_unlocked_count + 1;
    v_total_amount := v_total_amount + v_lock.amount;

    IF NOT (v_lock.user_id = ANY(v_affected_users)) THEN
      v_affected_users := array_append(v_affected_users, v_lock.user_id);
    END IF;

    -- Log para auditoria
    RAISE NOTICE 'Unlocked expired lock: id=%, user=%, amount=%, booking=%',
      v_lock.id, v_lock.user_id, v_lock.amount, v_lock.reference_id;
  END LOOP;

  RETURN QUERY SELECT v_unlocked_count, v_total_amount, v_affected_users;
END;
$$;

COMMENT ON FUNCTION unlock_expired_wallet_locks IS
'Libera automaticamente los locks de wallet que han expirado y cuyas reservas no se completaron.
Ejecutar diariamente via cron job.';

-- ============================================================================
-- 4. FUNCION MEJORADA: wallet_lock_funds_with_expiration()
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_lock_funds_with_expiration(
  p_booking_id UUID,
  p_amount_cents BIGINT,
  p_lock_type TEXT DEFAULT 'security_deposit_lock',
  p_expires_in_days INTEGER DEFAULT 90  -- Default: 90 dias
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_id UUID := gen_random_uuid();
  v_user_id UUID;
  v_available_balance BIGINT;
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- Obtener el renter de la reserva
  SELECT renter_id INTO v_user_id
  FROM bookings
  WHERE id = p_booking_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Calcular fecha de expiracion
  v_locked_until := NOW() + (p_expires_in_days || ' days')::INTERVAL;

  -- Verificar saldo disponible con lock
  SELECT available_balance_cents INTO v_available_balance
  FROM user_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_available_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user: %', v_user_id;
  END IF;

  IF v_available_balance < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %',
      v_available_balance, p_amount_cents;
  END IF;

  -- Actualizar balances
  UPDATE user_wallets
  SET
    available_balance_cents = available_balance_cents - p_amount_cents,
    locked_balance_cents = locked_balance_cents + p_amount_cents,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Crear transaccion de lock con expiracion
  INSERT INTO wallet_transactions (
    id,
    user_id,
    type,
    amount,
    status,
    description,
    reference_type,
    reference_id,
    locked_until,
    metadata
  ) VALUES (
    v_lock_id,
    v_user_id,
    p_lock_type,
    p_amount_cents,
    'completed',
    'Bloqueo de fondos para reserva',
    'booking',
    p_booking_id,
    v_locked_until,
    jsonb_build_object(
      'expires_in_days', p_expires_in_days,
      'locked_at', NOW()
    )
  );

  RETURN v_lock_id;
END;
$$;

COMMENT ON FUNCTION wallet_lock_funds_with_expiration IS
'Bloquea fondos de wallet para una reserva con fecha de expiracion automatica.
Si la reserva no se completa antes de la expiracion, los fondos se liberan automaticamente.';

-- ============================================================================
-- 5. ACTUALIZAR wallet_lock_funds EXISTENTE (backward compatible)
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_lock_funds(
  p_booking_id UUID,
  p_amount_cents BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delegamos a la nueva funcion con expiracion default de 90 dias
  RETURN wallet_lock_funds_with_expiration(
    p_booking_id,
    p_amount_cents,
    'security_deposit_lock',
    90  -- 90 dias default
  );
END;
$$;

-- ============================================================================
-- 6. FUNCION: get_expiring_locks() - Para notificaciones
-- ============================================================================

CREATE OR REPLACE FUNCTION get_expiring_locks(p_days_until_expiration INTEGER DEFAULT 7)
RETURNS TABLE (
  lock_id UUID,
  user_id UUID,
  booking_id UUID,
  amount BIGINT,
  locked_until TIMESTAMPTZ,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wt.id as lock_id,
    wt.user_id,
    wt.reference_id as booking_id,
    wt.amount,
    wt.locked_until,
    EXTRACT(DAY FROM (wt.locked_until - NOW()))::INTEGER as days_remaining
  FROM wallet_transactions wt
  LEFT JOIN bookings b ON wt.reference_id = b.id
  WHERE wt.type IN ('lock', 'security_deposit_lock', 'rental_payment_lock')
    AND wt.status = 'completed'
    AND wt.locked_until IS NOT NULL
    AND wt.locked_until BETWEEN NOW() AND (NOW() + (p_days_until_expiration || ' days')::INTERVAL)
    AND (b.id IS NULL OR b.status IN ('pending', 'pending_payment'))
  ORDER BY wt.locked_until ASC;
END;
$$;

COMMENT ON FUNCTION get_expiring_locks IS
'Obtiene los locks que van a expirar en los proximos N dias.
Util para enviar notificaciones a los usuarios.';

-- ============================================================================
-- 7. VISTA: v_wallet_locks_status
-- ============================================================================

CREATE OR REPLACE VIEW v_wallet_locks_status AS
SELECT
  wt.id,
  wt.user_id,
  p.full_name as user_name,
  wt.type as lock_type,
  wt.amount / 100.0 as amount_ars,
  wt.status,
  wt.reference_id as booking_id,
  b.status as booking_status,
  wt.locked_until,
  CASE
    WHEN wt.locked_until IS NULL THEN 'no_expiration'
    WHEN wt.locked_until < NOW() THEN 'expired'
    WHEN wt.locked_until < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
    ELSE 'active'
  END as expiration_status,
  EXTRACT(DAY FROM (wt.locked_until - NOW()))::INTEGER as days_until_expiration,
  wt.created_at,
  wt.updated_at
FROM wallet_transactions wt
LEFT JOIN profiles p ON wt.user_id = p.id
LEFT JOIN bookings b ON wt.reference_id = b.id
WHERE wt.type IN ('lock', 'security_deposit_lock', 'rental_payment_lock')
ORDER BY
  CASE WHEN wt.status = 'completed' THEN 0 ELSE 1 END,
  wt.locked_until ASC NULLS LAST;

COMMENT ON VIEW v_wallet_locks_status IS
'Vista de estado de todos los locks de wallet con informacion de expiracion';

-- ============================================================================
-- 8. GRANTS
-- ============================================================================

-- Service role puede ejecutar todas las funciones
GRANT EXECUTE ON FUNCTION unlock_expired_wallet_locks() TO service_role;
GRANT EXECUTE ON FUNCTION wallet_lock_funds_with_expiration(UUID, BIGINT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION wallet_lock_funds(UUID, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION get_expiring_locks(INTEGER) TO service_role;

-- Authenticated users pueden ver la vista (filtrada por RLS)
GRANT SELECT ON v_wallet_locks_status TO authenticated;

-- ============================================================================
-- 9. ACTUALIZAR LOCKS EXISTENTES (opcional - agregar expiracion retroactiva)
-- ============================================================================

-- Agregar expiracion de 90 dias a locks existentes que no tengan fecha
-- Solo para locks en estado 'completed' sin expiracion
UPDATE wallet_transactions
SET
  locked_until = created_at + INTERVAL '90 days',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'expiration_added_retroactively', NOW(),
    'original_locked_until', NULL
  )
WHERE type IN ('lock', 'security_deposit_lock', 'rental_payment_lock')
  AND status = 'completed'
  AND locked_until IS NULL;

-- ============================================================================
-- 10. NOTA SOBRE CRON JOB
-- ============================================================================

-- Para ejecutar la limpieza automatica, configurar pg_cron en Supabase:
--
-- En el Dashboard de Supabase > Database > Extensions, habilitar pg_cron
-- Luego ejecutar:
--
-- SELECT cron.schedule(
--   'unlock-expired-wallet-locks',  -- nombre del job
--   '0 4 * * *',                     -- todos los dias a las 4:00 AM UTC
--   $$SELECT * FROM unlock_expired_wallet_locks()$$
-- );
--
-- Para verificar jobs programados:
-- SELECT * FROM cron.job;
--
-- Para eliminar un job:
-- SELECT cron.unschedule('unlock-expired-wallet-locks');

COMMIT;

-- ============================================================================
-- FIN DE MIGRACION
-- ============================================================================
