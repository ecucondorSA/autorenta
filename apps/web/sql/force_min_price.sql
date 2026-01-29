-- Force minimum price for cars with invalid/low prices
-- This is a fallback for cars that might lack estimated_value_usd

UPDATE public.cars
SET price_per_day = 20 -- Set a safe default minimum (e.g. $20 USD)
WHERE 
  price_per_day < 10 -- Apply to anything suspiciously low
  AND deleted_at IS NULL;
