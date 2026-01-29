-- Relax price constraint up to $5000 for luxury cars
ALTER TABLE cars
DROP CONSTRAINT IF EXISTS chk_daily_rate_range;

ALTER TABLE cars
ADD CONSTRAINT chk_daily_rate_range
CHECK (price_per_day IS NULL OR (price_per_day >= 10 AND price_per_day <= 5000));

UPDATE public.cars
SET price_per_day = 537
WHERE id = 'd2cfd10d-701b-4671-a75a-86a8b31fdb95';
