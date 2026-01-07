-- Migration: 002_p2p_market_prices
-- Date: 2025-12-05
-- Description: Add table for market price monitoring

-- =====================================================
-- P2P Market Prices Table (Histórico de precios)
-- =====================================================
CREATE TABLE IF NOT EXISTS p2p_market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificación del par
    crypto_currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
    fiat_currency VARCHAR(3) NOT NULL,

    -- Tipo de anuncio (buy = compradores, sell = vendedores)
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('buy', 'sell')),

    -- Precio observado
    price_per_unit DECIMAL(15,2) NOT NULL,

    -- Límites de la oferta
    min_order_limit DECIMAL(15,2),
    max_order_limit DECIMAL(15,2),

    -- Cantidad disponible
    available_amount DECIMAL(18,8),

    -- Métodos de pago (JSON array como texto)
    payment_methods TEXT,

    -- Información del vendedor/comprador
    source_user_id VARCHAR(100),
    source_user_name VARCHAR(100),
    source_user_trades INTEGER,
    source_user_completion_rate DECIMAL(5,2),

    -- Posición en el ranking (1 = mejor precio)
    ranking_position INTEGER,

    -- Timestamps
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries eficientes
CREATE INDEX IF NOT EXISTS idx_p2p_market_prices_pair
    ON p2p_market_prices(fiat_currency, order_type, crypto_currency);

CREATE INDEX IF NOT EXISTS idx_p2p_market_prices_created
    ON p2p_market_prices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_p2p_market_prices_recent
    ON p2p_market_prices(fiat_currency, order_type, created_at DESC)
    WHERE created_at > NOW() - INTERVAL '24 hours';

CREATE INDEX IF NOT EXISTS idx_p2p_market_prices_best
    ON p2p_market_prices(fiat_currency, order_type, ranking_position)
    WHERE ranking_position <= 10;

-- =====================================================
-- P2P Config Table (Configuración por país)
-- =====================================================
CREATE TABLE IF NOT EXISTS p2p_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificación del país
    country_code VARCHAR(2) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,

    -- Moneda fiat
    fiat_currency VARCHAR(3) NOT NULL,

    -- Configuración de Binance
    binance_trade_url TEXT,

    -- Métodos de pago disponibles (JSON array)
    payment_methods TEXT,

    -- Límites operacionales
    min_order_fiat DECIMAL(15,2),
    max_order_fiat DECIMAL(15,2),

    -- Configuración de precios
    price_update_interval_minutes INTEGER DEFAULT 15,
    price_margin_percentage DECIMAL(5,2) DEFAULT 1.0,

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Zona horaria
    timezone VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_p2p_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_p2p_config_updated_at ON p2p_config;
CREATE TRIGGER trigger_p2p_config_updated_at
    BEFORE UPDATE ON p2p_config
    FOR EACH ROW
    EXECUTE FUNCTION update_p2p_config_updated_at();

-- =====================================================
-- Datos iniciales de configuración
-- =====================================================
INSERT INTO p2p_config (country_code, country_name, fiat_currency, binance_trade_url, payment_methods, min_order_fiat, max_order_fiat, timezone)
VALUES
    ('AR', 'Argentina', 'ARS',
     'https://p2p.binance.com/en/trade/all-payments/USDT?fiat=ARS',
     '["MercadoPago", "CBU/CVU", "Banco Nación", "Banco Galicia"]',
     1000, 500000,
     'America/Argentina/Buenos_Aires'),
    ('EC', 'Ecuador', 'USD',
     'https://p2p.binance.com/en/trade/all-payments/USDT?fiat=USD',
     '["Produbanco", "Pichincha", "BanEcuador", "Banco del Pacífico"]',
     50, 10000,
     'America/Guayaquil')
ON CONFLICT (country_code) DO NOTHING;

-- =====================================================
-- Vista útil: Últimos precios por par
-- =====================================================
CREATE OR REPLACE VIEW v_latest_market_prices AS
SELECT DISTINCT ON (fiat_currency, order_type, ranking_position)
    id,
    crypto_currency,
    fiat_currency,
    order_type,
    price_per_unit,
    min_order_limit,
    max_order_limit,
    available_amount,
    payment_methods,
    source_user_name,
    ranking_position,
    detected_at
FROM p2p_market_prices
WHERE detected_at > NOW() - INTERVAL '1 hour'
ORDER BY fiat_currency, order_type, ranking_position, detected_at DESC;

-- =====================================================
-- Vista útil: Spread actual por moneda
-- =====================================================
CREATE OR REPLACE VIEW v_market_spread AS
SELECT
    fiat_currency,
    MAX(CASE WHEN order_type = 'buy' AND ranking_position = 1 THEN price_per_unit END) as best_buy_price,
    MIN(CASE WHEN order_type = 'sell' AND ranking_position = 1 THEN price_per_unit END) as best_sell_price,
    MIN(CASE WHEN order_type = 'sell' AND ranking_position = 1 THEN price_per_unit END) -
    MAX(CASE WHEN order_type = 'buy' AND ranking_position = 1 THEN price_per_unit END) as spread,
    ROUND(
        (MIN(CASE WHEN order_type = 'sell' AND ranking_position = 1 THEN price_per_unit END) -
         MAX(CASE WHEN order_type = 'buy' AND ranking_position = 1 THEN price_per_unit END)) /
        MAX(CASE WHEN order_type = 'buy' AND ranking_position = 1 THEN price_per_unit END) * 100,
        2
    ) as spread_percentage,
    MAX(detected_at) as last_update
FROM p2p_market_prices
WHERE detected_at > NOW() - INTERVAL '1 hour'
GROUP BY fiat_currency;
