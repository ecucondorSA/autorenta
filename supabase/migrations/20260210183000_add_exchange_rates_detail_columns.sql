-- Add detailed exchange rate columns for update-exchange-rates Edge Function
-- The function tracks binance rate, platform rate (with margin), and volatility

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exchange_rates' AND column_name = 'binance_rate') THEN
    ALTER TABLE public.exchange_rates ADD COLUMN binance_rate numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exchange_rates' AND column_name = 'platform_rate') THEN
    ALTER TABLE public.exchange_rates ADD COLUMN platform_rate numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exchange_rates' AND column_name = 'margin_percent') THEN
    ALTER TABLE public.exchange_rates ADD COLUMN margin_percent numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exchange_rates' AND column_name = 'margin_absolute') THEN
    ALTER TABLE public.exchange_rates ADD COLUMN margin_absolute numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exchange_rates' AND column_name = 'volatility_24h') THEN
    ALTER TABLE public.exchange_rates ADD COLUMN volatility_24h numeric;
  END IF;
END $$;

-- Backfill existing rows: set binance_rate = rate (they were the same before margin tracking)
UPDATE public.exchange_rates
SET binance_rate = rate, platform_rate = rate
WHERE binance_rate IS NULL;
