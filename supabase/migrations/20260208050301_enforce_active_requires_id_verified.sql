-- ============================================================================
-- P0 Policy: Enforce that a car can be activated only if the owner is ID verified.
-- Date: 2026-02-08
--
-- Business rule (hard):
-- - `cars.status = 'active'` is only allowed when `profiles.id_verified = true` for the owner.
-- - Cars may still be published as `pending` until verification is completed.
--
-- Notes:
-- - Implemented as a DB trigger (authoritative source of truth).
-- - Only blocks transitions into 'active' (does not block editing other fields).
-- - Includes a one-time cleanup: downgrade any existing invalid active cars to 'pending'.
-- ============================================================================

-- Ensure enum value exists (idempotent on Postgres 15+)
ALTER TYPE public.car_status ADD VALUE IF NOT EXISTS 'pending';

CREATE OR REPLACE FUNCTION public.enforce_car_active_requires_id_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_verified boolean;
BEGIN
  -- Only enforce when the row is being activated.
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'active' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active') THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT COALESCE(p.id_verified, false)
    INTO v_id_verified
    FROM public.profiles p
   WHERE p.id = NEW.owner_id;

  IF v_id_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'No se puede activar el auto: el propietario debe completar verificacion de identidad (nivel 2).'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_enforce_car_active_requires_id_verified ON public.cars;
CREATE TRIGGER trg_enforce_car_active_requires_id_verified
BEFORE INSERT OR UPDATE OF status ON public.cars
FOR EACH ROW
EXECUTE FUNCTION public.enforce_car_active_requires_id_verified();

-- One-time cleanup: any invalid active cars become pending
UPDATE public.cars c
SET status = 'pending'
WHERE c.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = c.owner_id
      AND p.id_verified IS TRUE
  );

