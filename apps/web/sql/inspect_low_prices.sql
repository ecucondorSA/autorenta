-- Inspect cars with suspicious low prices
SELECT 
  id, 
  brand, 
  model, 
  year, 
  price_per_day, 
  estimated_value_usd, 
  value_usd 
FROM public.cars 
WHERE price_per_day < 5; -- Checking anything below $5
