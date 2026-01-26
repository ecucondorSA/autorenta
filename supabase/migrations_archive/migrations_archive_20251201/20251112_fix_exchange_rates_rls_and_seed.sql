-- Fix exchange_rates table: Add RLS policies and seed initial data
-- This fixes the 406 Not Acceptable error when querying for initial exchange rate

-- Enable RLS (if not already enabled)
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow public read access to exchange rates
CREATE POLICY IF NOT EXISTS "Public read access to exchange rates"
    ON exchange_rates
    FOR SELECT
    TO PUBLIC
    USING (true);

-- Only allow service role to insert/update/delete
CREATE POLICY IF NOT EXISTS "Service role can manage exchange rates"
    ON exchange_rates
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Insert initial default exchange rates if table is empty
-- Using realistic rates as of 2024 for Argentina
INSERT INTO exchange_rates (pair, rate, source, is_active, last_updated)
SELECT 'USD/ARS', 350.00, 'manual_seed', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM exchange_rates WHERE pair = 'USD/ARS' AND is_active = true)
ON CONFLICT DO NOTHING;

INSERT INTO exchange_rates (pair, rate, source, is_active, last_updated)
SELECT 'USD/UYU', 40.00, 'manual_seed', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM exchange_rates WHERE pair = 'USD/UYU' AND is_active = true)
ON CONFLICT DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE exchange_rates IS
'Stores currency exchange rates. Public read access allowed. Initial rates seeded for USD/ARS and USD/UYU.';

COMMENT ON COLUMN exchange_rates.pair IS 'Currency pair in format BASE/QUOTE (e.g., USD/ARS)';
COMMENT ON COLUMN exchange_rates.rate IS 'Exchange rate value (how much QUOTE currency per 1 BASE currency)';
COMMENT ON COLUMN exchange_rates.is_active IS 'Whether this rate is currently active and should be used';
COMMENT ON COLUMN exchange_rates.source IS 'Source of the rate (e.g., binance, manual_seed, cron)';
