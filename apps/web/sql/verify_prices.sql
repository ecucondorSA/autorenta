-- Verify updated prices (broadened query)
SELECT 
  id, 
  brand, 
  model, 
  year, 
  estimated_value_usd, 
  price_per_day, 
  uses_dynamic_pricing,
  updated_at -- Keep updated_at in select list for inspection
FROM public.cars
WHERE 
  estimated_value_usd IS NOT NULL 
  AND estimated_value_usd > 0 
  AND deleted_at IS NULL
  AND price_per_day IS NOT NULL; -- Ensure price_per_day is not null
-- ORDER BY updated_at DESC -- Removed order by for broader results
-- LIMIT 10;               -- Removed limit for broader results