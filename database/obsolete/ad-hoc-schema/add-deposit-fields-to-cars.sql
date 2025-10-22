-- ================================================
-- Add deposit fields to cars table
-- Description: Add deposit_required and deposit_amount for security deposits
-- Date: 2025-10-17
-- ================================================

BEGIN;

-- Step 1: Add deposit columns to cars table
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) CHECK (deposit_amount >= 0);

-- Step 2: Add comment for documentation
COMMENT ON COLUMN public.cars.deposit_required IS 'Indica si el auto requiere depósito de garantía';
COMMENT ON COLUMN public.cars.deposit_amount IS 'Monto del depósito de garantía (se devuelve al finalizar)';

-- Step 3: Set default deposit for existing cars (optional - adjust as needed)
-- UPDATE public.cars
-- SET deposit_required = TRUE,
--     deposit_amount = price_per_day * 2
-- WHERE status = 'active' AND deposit_required IS NULL;

COMMIT;

-- ================================================
-- Verification Queries
-- ================================================
-- SELECT id, title, deposit_required, deposit_amount, price_per_day
-- FROM cars
-- WHERE status = 'active'
-- LIMIT 10;
