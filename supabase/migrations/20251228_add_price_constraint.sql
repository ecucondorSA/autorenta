-- Add price validation constraint to cars table
-- Enforces MIN_DAILY_RATE_USD ($10) and MAX_DAILY_RATE_USD ($500) from APP_CONSTANTS

-- First, let's check if there are any violating rows
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM cars
  WHERE price_per_day IS NOT NULL
    AND (price_per_day < 10 OR price_per_day > 500);

  IF v_count > 0 THEN
    RAISE NOTICE 'Found % cars with price outside $10-$500 range. Updating...', v_count;

    -- Clamp prices to valid range instead of failing
    UPDATE cars
    SET
      price_per_day = CASE
        WHEN price_per_day < 10 THEN 10
        WHEN price_per_day > 500 THEN 500
        ELSE price_per_day
      END,
      updated_at = NOW()
    WHERE price_per_day IS NOT NULL
      AND (price_per_day < 10 OR price_per_day > 500);

    RAISE NOTICE 'Updated % cars to valid price range', v_count;
  END IF;
END $$;

-- Now add the constraint
ALTER TABLE cars
DROP CONSTRAINT IF EXISTS chk_daily_rate_range;

ALTER TABLE cars
ADD CONSTRAINT chk_daily_rate_range
CHECK (price_per_day IS NULL OR (price_per_day >= 10 AND price_per_day <= 500));

COMMENT ON CONSTRAINT chk_daily_rate_range ON cars IS
  'Price per day must be between $10 and $500 USD (from APP_CONSTANTS.MIN_DAILY_RATE_USD and MAX_DAILY_RATE_USD)';
