-- Migration: Automatic Exchange Rate Sync from Binance
-- Syncs USDTARS rate every 15 minutes using pg_cron and pg_net

-- ============================================
-- 1. TRIGGER FUNCTION TO PROCESS BINANCE RESPONSES
-- ============================================

CREATE OR REPLACE FUNCTION process_binance_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rate_value numeric;
BEGIN
  -- Only process successful responses that look like Binance ticker data
  IF NEW.status_code = 200 AND NEW.content::jsonb ? 'symbol' AND NEW.content::jsonb ? 'price' THEN
    -- Verify it's USDTARS pair
    IF (NEW.content::jsonb->>'symbol') = 'USDTARS' THEN
      rate_value := (NEW.content::jsonb->>'price')::numeric;

      IF rate_value IS NOT NULL AND rate_value > 0 THEN
        -- Update exchange_rates table
        UPDATE exchange_rates
        SET rate = rate_value, source = 'binance-cron', updated_at = NOW()
        WHERE pair IN ('USDARS', 'USDTARS');

        RAISE NOTICE 'Updated USDARS rate to %', rate_value;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 2. TRIGGER ON HTTP RESPONSE TABLE
-- ============================================

DROP TRIGGER IF EXISTS on_binance_response ON net._http_response;
CREATE TRIGGER on_binance_response
  AFTER INSERT ON net._http_response
  FOR EACH ROW
  EXECUTE FUNCTION process_binance_response();

-- ============================================
-- 3. CRON JOB TO FETCH BINANCE RATE EVERY 15 MIN
-- ============================================

-- Remove existing job if any
SELECT cron.unschedule('sync-binance-rates');

-- Create new cron job
SELECT cron.schedule(
  'sync-binance-rates',
  '*/15 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://api.binance.com/api/v3/ticker/price?symbol=USDTARS'
  );
  $$
);

-- ============================================
-- 4. DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION process_binance_response() IS
'Trigger function that processes Binance API responses and updates exchange_rates table.
Called automatically when pg_net receives HTTP responses.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Exchange rate auto-sync configured: USDTARS every 15 minutes from Binance';
END $$;
