-- Guarantee Tier System
-- All amounts are in USD (United States Dollars)
--
-- Tier Structure:
--   Club Standard  (< $20,000):  Hold $600 → Con membresía $300 | Coverage $800
--   Silver Access  ($20k-$40k):  Hold $1,200 → Con membresía $500 | Coverage $1,200
--   Black Access   (> $40,000):  Hold $2,500 → Con membresía $1,200 | Coverage $2,000

-- Function to calculate guarantee hold based on vehicle value and membership
CREATE OR REPLACE FUNCTION calculate_guarantee_hold(
  p_vehicle_value_usd NUMERIC,
  p_has_membership BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  tier TEXT,
  tier_name TEXT,
  hold_amount_usd NUMERIC,
  coverage_limit_usd NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  -- All amounts in USD
  IF p_vehicle_value_usd < 20000 THEN
    -- Club Standard tier
    RETURN QUERY SELECT
      'club_standard'::TEXT,
      'Club Access'::TEXT,
      CASE WHEN p_has_membership THEN 300.00 ELSE 600.00 END,
      800.00;
  ELSIF p_vehicle_value_usd < 40000 THEN
    -- Silver Access tier
    RETURN QUERY SELECT
      'club_black'::TEXT,
      'Silver Access'::TEXT,
      CASE WHEN p_has_membership THEN 500.00 ELSE 1200.00 END,
      1200.00;
  ELSE
    -- Black Access tier (luxury)
    RETURN QUERY SELECT
      'club_luxury'::TEXT,
      'Black Access'::TEXT,
      CASE WHEN p_has_membership THEN 1200.00 ELSE 2500.00 END,
      2000.00;
  END IF;
END;
$$;

COMMENT ON FUNCTION calculate_guarantee_hold IS 'Calculate guarantee hold amount in USD based on vehicle value and membership status';

-- View for cars with calculated guarantee holds
CREATE OR REPLACE VIEW v_cars_with_guarantee AS
SELECT
  c.id,
  c.title,
  c.value_usd,
  c.price_per_day,
  c.deposit_amount AS deposit_configured_usd,
  g_no_member.tier,
  g_no_member.tier_name,
  g_no_member.hold_amount_usd AS hold_sin_membresia_usd,
  g_member.hold_amount_usd AS hold_con_membresia_usd,
  g_no_member.coverage_limit_usd AS fgo_coverage_usd
FROM cars c
CROSS JOIN LATERAL calculate_guarantee_hold(COALESCE(c.value_usd, 10000), FALSE) g_no_member
CROSS JOIN LATERAL calculate_guarantee_hold(COALESCE(c.value_usd, 10000), TRUE) g_member
WHERE c.status = 'active';

COMMENT ON VIEW v_cars_with_guarantee IS 'Cars with calculated guarantee holds based on tier system - ALL AMOUNTS IN USD';

-- Trigger to auto-calculate deposit based on vehicle value
CREATE OR REPLACE FUNCTION auto_calculate_deposit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_hold_usd NUMERIC;
BEGIN
  -- Only auto-calculate if deposit_amount is NULL or 0
  IF NEW.deposit_amount IS NULL OR NEW.deposit_amount = 0 THEN
    -- Get hold amount based on vehicle value (without membership)
    SELECT hold_amount_usd INTO v_hold_usd
    FROM calculate_guarantee_hold(COALESCE(NEW.value_usd, 10000), FALSE);

    NEW.deposit_amount := v_hold_usd;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_calculate_deposit IS 'Auto-calculates deposit_amount in USD based on vehicle value tier';

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trg_auto_deposit ON cars;
CREATE TRIGGER trg_auto_deposit
  BEFORE INSERT OR UPDATE OF value_usd ON cars
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_deposit();

-- Reference view for tier structure (documentation)
CREATE OR REPLACE VIEW v_guarantee_tiers AS
SELECT * FROM (VALUES
  ('club_standard', 'Club Access',   0,     19999, 600,  300,  800,  14.99),
  ('club_black',    'Silver Access', 20000, 39999, 1200, 500,  1200, 29.99),
  ('club_luxury',   'Black Access',  40000, NULL,  2500, 1200, 2000, 59.99)
) AS t(
  tier,
  tier_name,
  min_vehicle_value_usd,
  max_vehicle_value_usd,
  hold_without_membership_usd,
  hold_with_membership_usd,
  fgo_coverage_usd,
  membership_price_usd
);

COMMENT ON VIEW v_guarantee_tiers IS 'Reference table for guarantee tier structure - ALL AMOUNTS IN USD';
