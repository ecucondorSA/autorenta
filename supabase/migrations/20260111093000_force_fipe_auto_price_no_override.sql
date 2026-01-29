-- Always auto-update price_per_day from FIPE value (ignore price_override)

CREATE OR REPLACE FUNCTION public.auto_update_price_per_day()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estimated_value_usd IS NOT NULL
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

DROP TRIGGER IF EXISTS trigger_auto_update_price_per_day ON public.cars;

CREATE TRIGGER trigger_auto_update_price_per_day
  BEFORE INSERT OR UPDATE OF estimated_value_usd
  ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_price_per_day();
