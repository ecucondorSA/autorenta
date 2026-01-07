-- P2P Automation Tables
-- Run this migration in Supabase SQL editor

-- =====================================================
-- P2P Orders Table (State Machine Source of Truth)
-- =====================================================
CREATE TABLE IF NOT EXISTS p2p_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Binance Order Data
    order_number VARCHAR(22) UNIQUE NOT NULL,
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('buy', 'sell')),

    -- Amounts
    amount_fiat DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
    amount_crypto DECIMAL(18,8),

    -- Counterparty
    counterparty_name VARCHAR(100),
    counterparty_id VARCHAR(50),

    -- Payment Details (extracted from Binance)
    payment_cvu VARCHAR(22),
    payment_alias VARCHAR(50),
    payment_holder VARCHAR(100),

    -- State Machine
    status VARCHAR(30) NOT NULL DEFAULT 'detected',

    -- MercadoPago Transfer
    mp_transfer_id VARCHAR(50),
    mp_transfer_status VARCHAR(20),
    mp_transferred_at TIMESTAMPTZ,

    -- Binance Confirmation
    binance_marked_paid_at TIMESTAMPTZ,
    binance_released_at TIMESTAMPTZ,

    -- Retry Logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,

    -- Timestamps
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Locking for concurrent access
    locked_by VARCHAR(50),
    lock_expires_at TIMESTAMPTZ,

    CONSTRAINT valid_status CHECK (status IN (
        'detected', 'extracting', 'pending_transfer', 'transferring',
        'awaiting_qr', 'confirming', 'marking_paid', 'completed',
        'failed', 'cancelled', 'manual_review'
    ))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_p2p_orders_status ON p2p_orders(status);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_pending ON p2p_orders(status)
    WHERE status IN ('detected', 'pending_transfer', 'awaiting_qr');
CREATE INDEX IF NOT EXISTS idx_p2p_orders_updated ON p2p_orders(updated_at);

-- =====================================================
-- P2P Events Table (Event Sourcing for Audit)
-- =====================================================
CREATE TABLE IF NOT EXISTS p2p_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES p2p_orders(id) ON DELETE CASCADE,

    event_type VARCHAR(50) NOT NULL,

    previous_status VARCHAR(30),
    new_status VARCHAR(30),

    payload JSONB,
    error_message TEXT,

    service_name VARCHAR(30),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p2p_events_order_id ON p2p_events(order_id);
CREATE INDEX IF NOT EXISTS idx_p2p_events_created_at ON p2p_events(created_at);

-- =====================================================
-- RPC: Get next order with lock
-- =====================================================
CREATE OR REPLACE FUNCTION p2p_get_next_order(
    p_service_name VARCHAR(50),
    p_status VARCHAR(30) DEFAULT 'pending_transfer',
    p_lock_duration_seconds INTEGER DEFAULT 300
)
RETURNS SETOF p2p_orders AS $$
DECLARE
    v_order p2p_orders;
BEGIN
    -- Select and lock in one atomic operation
    SELECT * INTO v_order
    FROM p2p_orders
    WHERE status = p_status
      AND (locked_by IS NULL OR lock_expires_at < NOW())
    ORDER BY detected_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_order.id IS NOT NULL THEN
        -- Acquire lock
        UPDATE p2p_orders
        SET
            locked_by = p_service_name,
            lock_expires_at = NOW() + (p_lock_duration_seconds || ' seconds')::INTERVAL
        WHERE id = v_order.id;

        -- Return updated order
        RETURN QUERY SELECT * FROM p2p_orders WHERE id = v_order.id;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Trigger: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_p2p_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_p2p_orders_updated_at ON p2p_orders;
CREATE TRIGGER trigger_p2p_orders_updated_at
    BEFORE UPDATE ON p2p_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_p2p_orders_updated_at();

-- =====================================================
-- RLS Policies (if needed)
-- =====================================================
-- ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE p2p_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by automation)
-- CREATE POLICY "Service role full access" ON p2p_orders
--     FOR ALL USING (auth.role() = 'service_role');
