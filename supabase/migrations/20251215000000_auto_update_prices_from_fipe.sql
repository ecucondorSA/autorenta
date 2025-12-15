-- Migration: Auto-update price_per_day from estimated_value_usd
-- Description: Automatically calculates price_per_day (0.3% daily) when estimated_value_usd changes
-- Also adds price_override flag to allow owners to lock custom prices

-- 1. Add price_override column
ALTER TABLE cars
ADD COLUMN IF NOT EXISTS price_override BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN cars.price_override IS 'If true, prevents automatic price updates from FIPE sync. Allows owners to set custom pricing.';

-- 2. Function to auto-update price_per_day
CREATE OR REPLACE FUNCTION auto_update_price_per_day()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-update if:
  -- a) estimated_value_usd changed
  -- b) price_override is false (owner hasn't locked the price)
  IF NEW.estimated_value_usd IS NOT NULL
     AND (NEW.price_override IS FALSE OR NEW.price_override IS NULL)
     AND (
       OLD.estimated_value_usd IS NULL
       OR NEW.estimated_value_usd != OLD.estimated_value_usd
     ) THEN

    -- Apply 0.3% daily rate with $10 minimum
    NEW.price_per_day := GREATEST(
      ROUND(NEW.estimated_value_usd * 0.003, 2),
      10.00
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger
DROP TRIGGER IF EXISTS trigger_auto_update_price_per_day ON cars;

CREATE TRIGGER trigger_auto_update_price_per_day
  BEFORE INSERT OR UPDATE OF estimated_value_usd
  ON cars
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_price_per_day();

-- 4. One-time: Update existing cars with NULL estimated_value_usd but valid value_usd from FIPE
-- (This fixes cars where value_usd exists but estimated_value_usd is NULL)
UPDATE cars
SET
  estimated_value_usd = value_usd,
  price_per_day = GREATEST(ROUND(value_usd * 0.003, 2), 10.00),
  updated_at = NOW()
WHERE estimated_value_usd IS NULL
  AND value_usd IS NOT NULL
  AND value_usd > 100  -- Only if value_usd looks like a real vehicle value
  AND value_usd_source = 'fipe'
  AND (price_override IS FALSE OR price_override IS NULL);

-- 5. Create index for price_override queries
CREATE INDEX IF NOT EXISTS idx_cars_price_override ON cars(price_override)
WHERE price_override = TRUE;
