-- =====================================================
-- Migration 004: Exchange Rates & USD Migration
-- =====================================================
-- Objetivo: Migrar la plataforma de ARS a USD como moneda base
-- Estrategia:
--   1. Crear tabla de tasas de cambio históricas
--   2. Convertir todos los saldos existentes de ARS a USD
--   3. Actualizar user_wallets.currency de 'ARS' a 'USD'
--   4. Guardar tasa de conversión usada en cada transacción
-- =====================================================

-- =====================================================
-- 1. TABLA DE TASAS DE CAMBIO HISTÓRICAS
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,       -- Ej: 'ARS'
  to_currency TEXT NOT NULL,         -- Ej: 'USD'
  rate DECIMAL(20, 8) NOT NULL,      -- Ej: 1015.50 (1 USD = 1015.50 ARS)
  source TEXT NOT NULL,              -- Ej: 'binance', 'manual', 'fallback'
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT valid_rate CHECK (rate > 0),
  CONSTRAINT valid_currencies CHECK (from_currency != to_currency)
);

-- Index para búsquedas rápidas por par de monedas
CREATE INDEX idx_exchange_rates_pair_time
ON exchange_rates(from_currency, to_currency, fetched_at DESC);

-- Index para obtener la última tasa
CREATE INDEX idx_exchange_rates_latest
ON exchange_rates(fetched_at DESC);

-- =====================================================
-- 2. AGREGAR COLUMNA exchange_rate A wallet_ledger
-- =====================================================

-- Agregar columna para almacenar la tasa usada en cada transacción
ALTER TABLE wallet_ledger
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS original_currency TEXT,
ADD COLUMN IF NOT EXISTS original_amount_cents BIGINT;

-- Comentarios para documentación
COMMENT ON COLUMN wallet_ledger.exchange_rate IS 'Tasa de cambio usada al momento de la transacción (ej: 1015.50 = 1 USD = 1015.50 ARS)';
COMMENT ON COLUMN wallet_ledger.original_currency IS 'Moneda original del depósito antes de conversión (ej: ARS)';
COMMENT ON COLUMN wallet_ledger.original_amount_cents IS 'Monto original en centavos antes de conversión (ej: 1000000 centavos ARS)';

-- =====================================================
-- 3. FUNCIÓN PARA OBTENER LA ÚLTIMA TASA DE CAMBIO
-- =====================================================

CREATE OR REPLACE FUNCTION get_latest_exchange_rate(
  p_from_currency TEXT,
  p_to_currency TEXT
) RETURNS DECIMAL(20, 8) AS $$
DECLARE
  v_rate DECIMAL(20, 8);
BEGIN
  -- Buscar la tasa más reciente (últimas 24 horas)
  SELECT rate INTO v_rate
  FROM exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND fetched_at > (NOW() - INTERVAL '24 hours')
  ORDER BY fetched_at DESC
  LIMIT 1;

  -- Si no hay tasa reciente, retornar fallback hardcoded
  IF v_rate IS NULL THEN
    -- Fallback: 1 USD = 1015 ARS (actualizar manualmente cada mes)
    IF p_from_currency = 'ARS' AND p_to_currency = 'USD' THEN
      v_rate := 1015.0;
    ELSIF p_from_currency = 'USD' AND p_to_currency = 'ARS' THEN
      v_rate := 1.0 / 1015.0;
    ELSE
      RAISE EXCEPTION 'No exchange rate found for % to %', p_from_currency, p_to_currency;
    END IF;
  END IF;

  RETURN v_rate;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 4. FUNCIÓN PARA REGISTRAR TASA DE CAMBIO
-- =====================================================

CREATE OR REPLACE FUNCTION save_exchange_rate(
  p_from_currency TEXT,
  p_to_currency TEXT,
  p_rate DECIMAL(20, 8),
  p_source TEXT DEFAULT 'manual',
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_rate_id UUID;
BEGIN
  INSERT INTO exchange_rates (from_currency, to_currency, rate, source, metadata)
  VALUES (p_from_currency, p_to_currency, p_rate, p_source, p_metadata)
  RETURNING id INTO v_rate_id;

  RETURN v_rate_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. MIGRACIÓN DE DATOS: ARS → USD
-- =====================================================

-- IMPORTANTE: Esta migración se debe ejecutar MANUALMENTE después de verificar
-- que la tasa de cambio es correcta. No se ejecuta automáticamente.

-- Ejemplo de cómo ejecutar la migración (COMENTADO por seguridad):

/*
-- Paso 1: Registrar la tasa de cambio que se usará para la migración
SELECT save_exchange_rate('ARS', 'USD', 1015.50, 'migration',
  jsonb_build_object('migration_date', NOW(), 'note', 'Initial ARS to USD migration'));

-- Paso 2: Obtener la tasa registrada
DO $$
DECLARE
  v_migration_rate DECIMAL(20, 8);
BEGIN
  SELECT get_latest_exchange_rate('ARS', 'USD') INTO v_migration_rate;
  RAISE NOTICE 'Tasa de migración: 1 USD = % ARS', v_migration_rate;
END $$;

-- Paso 3: Convertir wallet_ledger (guardar valores originales)
UPDATE wallet_ledger
SET
  original_currency = 'ARS',
  original_amount_cents = amount_cents,
  exchange_rate = get_latest_exchange_rate('ARS', 'USD'),
  amount_cents = ROUND(amount_cents / get_latest_exchange_rate('ARS', 'USD'))::BIGINT
WHERE original_currency IS NULL;  -- Solo migrar registros no migrados

-- Paso 4: Convertir user_wallets
UPDATE user_wallets
SET
  available_balance = ROUND(available_balance / get_latest_exchange_rate('ARS', 'USD'))::BIGINT,
  locked_balance = ROUND(locked_balance / get_latest_exchange_rate('ARS', 'USD'))::BIGINT,
  non_withdrawable_balance = ROUND(non_withdrawable_balance / get_latest_exchange_rate('ARS', 'USD'))::BIGINT,
  currency = 'USD'
WHERE currency = 'ARS';

-- Paso 5: Verificar la migración
SELECT
  'user_wallets' as tabla,
  COUNT(*) as registros,
  SUM(available_balance) / 100.0 as total_usd
FROM user_wallets
WHERE currency = 'USD'
UNION ALL
SELECT
  'wallet_ledger' as tabla,
  COUNT(*) as registros,
  SUM(amount_cents) / 100.0 as total_cents_migrated
FROM wallet_ledger
WHERE original_currency = 'ARS';
*/

-- =====================================================
-- 6. RLS POLICIES PARA exchange_rates
-- =====================================================

-- Habilitar RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer las tasas de cambio (info pública)
CREATE POLICY "Todos pueden ver tasas de cambio"
ON exchange_rates FOR SELECT
USING (true);

-- Solo admin puede insertar tasas manualmente
CREATE POLICY "Solo admin puede insertar tasas"
ON exchange_rates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_admin = true
  )
);

-- =====================================================
-- 7. TRIGGERS Y FUNCIONES DE AUDITORÍA
-- =====================================================

-- Función para auditar cambios en tasas de cambio
CREATE OR REPLACE FUNCTION audit_exchange_rate_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log en metadata de la tasa
  NEW.metadata = NEW.metadata || jsonb_build_object(
    'created_by', auth.uid(),
    'created_at', NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auditoría
CREATE TRIGGER trigger_audit_exchange_rate
BEFORE INSERT ON exchange_rates
FOR EACH ROW
EXECUTE FUNCTION audit_exchange_rate_change();

-- =====================================================
-- 8. VIEWS ÚTILES
-- =====================================================

-- View para ver balances en ambas monedas
CREATE OR REPLACE VIEW wallet_balances_multi_currency AS
SELECT
  uw.user_id,
  p.full_name,
  uw.currency as base_currency,
  uw.available_balance / 100.0 as available_balance_usd,
  uw.locked_balance / 100.0 as locked_balance_usd,
  (uw.available_balance + uw.locked_balance) / 100.0 as total_balance_usd,

  -- Convertir a ARS para referencia
  (uw.available_balance / 100.0) * COALESCE(
    (SELECT rate FROM exchange_rates
     WHERE from_currency = 'ARS' AND to_currency = 'USD'
     ORDER BY fetched_at DESC LIMIT 1),
    1015.0
  ) as available_balance_ars_equivalent,

  uw.updated_at
FROM user_wallets uw
JOIN profiles p ON uw.user_id = p.id;

-- =====================================================
-- 9. GRANTS
-- =====================================================

-- Grants para funciones
GRANT EXECUTE ON FUNCTION get_latest_exchange_rate TO authenticated;
GRANT EXECUTE ON FUNCTION save_exchange_rate TO authenticated;

-- =====================================================
-- 10. INSERTAR TASA INICIAL (EJEMPLO)
-- =====================================================

-- Insertar tasa inicial de Binance (ejecutar manualmente cuando sea necesario)
-- SELECT save_exchange_rate('ARS', 'USD', 1015.50, 'binance',
--   jsonb_build_object('note', 'Initial rate from Binance API'));

-- =====================================================
-- FIN DE MIGRACIÓN 004
-- =====================================================

-- Comentarios finales
COMMENT ON TABLE exchange_rates IS 'Tasas de cambio históricas obtenidas de Binance y otras fuentes';
COMMENT ON FUNCTION get_latest_exchange_rate IS 'Obtiene la tasa de cambio más reciente entre dos monedas';
COMMENT ON FUNCTION save_exchange_rate IS 'Registra una nueva tasa de cambio en el historial';
