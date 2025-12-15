-- Fix Daily Prices based on Estimated Value (0.3% rule) - Safe Version without diagnostics
BEGIN;

-- 1. Update price_per_day for cars where estimated_value_usd is available, active,
--    dynamic pricing is not enabled, and the calculated price differs.
UPDATE public.cars
SET
  price_per_day = ROUND((c.estimated_value_usd * 0.003)::numeric, 2)
FROM public.cars AS c
WHERE
  public.cars.id = c.id
  AND c.estimated_value_usd IS NOT NULL
  AND c.estimated_value_usd > 0
  AND c.deleted_at IS NULL
  AND (c.uses_dynamic_pricing IS NOT TRUE OR c.uses_dynamic_pricing IS NULL)
  AND ROUND((c.estimated_value_usd * 0.003)::numeric, 2) IS DISTINCT FROM public.cars.price_per_day;

-- 2. Ensure minimum price safety (e.g., nothing below $10 USD)
UPDATE public.cars
SET price_per_day = 10
WHERE price_per_day < 10
  AND (uses_dynamic_pricing IS NOT TRUE OR uses_dynamic_pricing IS NULL)
  AND deleted_at IS NULL
  AND estimated_value_usd IS NOT NULL;

COMMIT;