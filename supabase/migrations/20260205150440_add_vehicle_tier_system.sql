-- ============================================================================
-- Migration: Vehicle Tier System (6 tiers separados de Membership)
-- Date: 2026-02-05
-- Author: Claude
--
-- Este migration separa dos conceptos:
-- 1. VehicleTier (6) - Define el hold BASE según valor del auto
-- 2. MembershipPlan (3) - Define el descuento % para el usuario
--
-- El FGO solo paga el buy-down: hold_base - hold_con_descuento
-- ============================================================================

-- 1. Crear enum vehicle_tier (6 tiers basados en valor del auto)
DO $$ BEGIN
  CREATE TYPE public.vehicle_tier AS ENUM (
    'starter',   -- < $8,000
    'economy',   -- $8,000 - $15,000
    'standard',  -- $15,000 - $25,000
    'silver',    -- $25,000 - $40,000
    'premium',   -- $40,000 - $70,000
    'luxury'     -- > $70,000
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Agregar columna vehicle_tier a cars (con default calculado)
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS vehicle_tier public.vehicle_tier;

-- 3. Backfill vehicle_tier basado en value_usd
UPDATE public.cars
SET vehicle_tier =
  CASE
    WHEN value_usd IS NULL THEN 'standard'::public.vehicle_tier
    WHEN value_usd < 8000 THEN 'starter'::public.vehicle_tier
    WHEN value_usd < 15000 THEN 'economy'::public.vehicle_tier
    WHEN value_usd < 25000 THEN 'standard'::public.vehicle_tier
    WHEN value_usd < 40000 THEN 'silver'::public.vehicle_tier
    WHEN value_usd < 70000 THEN 'premium'::public.vehicle_tier
    ELSE 'luxury'::public.vehicle_tier
  END
WHERE vehicle_tier IS NULL;

-- 4. Hacer NOT NULL con default
ALTER TABLE public.cars
ALTER COLUMN vehicle_tier SET DEFAULT 'standard'::public.vehicle_tier;

ALTER TABLE public.cars
ALTER COLUMN vehicle_tier SET NOT NULL;

-- 5. Agregar club_luxury al enum subscription_tier si no existe
DO $$ BEGIN
  ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'club_luxury';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. Crear tabla de configuración de vehicle tiers (para queries y reportes)
CREATE TABLE IF NOT EXISTS public.vehicle_tier_config (
  tier public.vehicle_tier PRIMARY KEY,
  value_min_usd numeric,
  value_max_usd numeric,
  hold_base_usd numeric NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Popular configuración de tiers
INSERT INTO public.vehicle_tier_config (tier, value_min_usd, value_max_usd, hold_base_usd, description)
VALUES
  ('starter', NULL, 8000, 300, 'Autos económicos de entrada'),
  ('economy', 8000, 15000, 500, 'Autos económicos de uso diario'),
  ('standard', 15000, 25000, 800, 'Autos de gama media'),
  ('silver', 25000, 40000, 1500, 'Autos de gama media-alta'),
  ('premium', 40000, 70000, 2500, 'Autos premium'),
  ('luxury', 70000, NULL, 4000, 'Autos de lujo')
ON CONFLICT (tier) DO UPDATE SET
  value_min_usd = EXCLUDED.value_min_usd,
  value_max_usd = EXCLUDED.value_max_usd,
  hold_base_usd = EXCLUDED.hold_base_usd,
  description = EXCLUDED.description,
  updated_at = now();

-- 8. Crear función para calcular vehicle_tier desde value_usd
CREATE OR REPLACE FUNCTION public.get_vehicle_tier(p_value_usd numeric)
RETURNS public.vehicle_tier
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_value_usd IS NULL THEN
    RETURN 'standard'::public.vehicle_tier;
  ELSIF p_value_usd < 8000 THEN
    RETURN 'starter'::public.vehicle_tier;
  ELSIF p_value_usd < 15000 THEN
    RETURN 'economy'::public.vehicle_tier;
  ELSIF p_value_usd < 25000 THEN
    RETURN 'standard'::public.vehicle_tier;
  ELSIF p_value_usd < 40000 THEN
    RETURN 'silver'::public.vehicle_tier;
  ELSIF p_value_usd < 70000 THEN
    RETURN 'premium'::public.vehicle_tier;
  ELSE
    RETURN 'luxury'::public.vehicle_tier;
  END IF;
END;
$$;

-- 9. Crear función para calcular hold y buy-down
CREATE OR REPLACE FUNCTION public.calc_hold_and_buydown(
  p_vehicle_tier public.vehicle_tier,
  p_membership_plan text DEFAULT 'none'
)
RETURNS TABLE (
  hold_usd numeric,
  base_hold_usd numeric,
  buy_down_fgo_usd numeric,
  discount_pct numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_base_hold numeric;
  v_discount numeric := 0;
  v_hold numeric;
  v_buydown numeric;
BEGIN
  -- Obtener hold base del tier
  SELECT hold_base_usd INTO v_base_hold
  FROM public.vehicle_tier_config
  WHERE tier = p_vehicle_tier;

  IF v_base_hold IS NULL THEN
    v_base_hold := 800; -- Default si no encuentra
  END IF;

  -- Calcular descuento según membership
  CASE p_membership_plan
    WHEN 'club' THEN v_discount := 0.25;  -- 25%
    WHEN 'silver' THEN v_discount := 0.40; -- 40%
    WHEN 'black' THEN v_discount := 0.50;  -- 50%
    ELSE v_discount := 0;
  END CASE;

  -- Calcular hold final y buy-down
  v_hold := ROUND(v_base_hold * (1 - v_discount));
  v_buydown := v_base_hold - v_hold;

  RETURN QUERY SELECT v_hold, v_base_hold, v_buydown, v_discount;
END;
$$;

-- 10. Trigger para auto-calcular vehicle_tier cuando cambia value_usd
CREATE OR REPLACE FUNCTION public.auto_set_vehicle_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.value_usd IS DISTINCT FROM OLD.value_usd OR NEW.vehicle_tier IS NULL THEN
    NEW.vehicle_tier := public.get_vehicle_tier(NEW.value_usd);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_vehicle_tier ON public.cars;
CREATE TRIGGER trg_auto_vehicle_tier
  BEFORE INSERT OR UPDATE ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_vehicle_tier();

-- 11. Vista para ver autos con su tier y hold calculado
CREATE OR REPLACE VIEW public.v_cars_with_hold AS
SELECT
  c.id,
  c.brand,
  c.model,
  c.year,
  c.value_usd,
  c.vehicle_tier,
  vtc.hold_base_usd,
  vtc.description as tier_description
FROM public.cars c
LEFT JOIN public.vehicle_tier_config vtc ON vtc.tier = c.vehicle_tier;

-- 12. Comentarios
COMMENT ON TYPE public.vehicle_tier IS 'Tier del vehículo basado en su valor USD - define hold base';
COMMENT ON TABLE public.vehicle_tier_config IS 'Configuración de holds por tier de vehículo';
COMMENT ON FUNCTION public.get_vehicle_tier IS 'Calcula el tier de un vehículo basado en su valor USD';
COMMENT ON FUNCTION public.calc_hold_and_buydown IS 'Calcula hold final y buy-down FGO según tier y membresía';
