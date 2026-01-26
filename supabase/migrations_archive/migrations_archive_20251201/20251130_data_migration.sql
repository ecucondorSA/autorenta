-- ============================================================================
-- MIGRATION: Data Migration for Organizations
-- Date: 2025-11-30
-- Description: 
-- Automatically converts existing individual owners into "Fleets" (Organizations).
-- 1. Creates an Organization for every user who owns at least one car.
-- 2. Links their cars to the new Organization.
-- 3. Adds the owner as an 'owner' member of the Organization.
-- ============================================================================

BEGIN;

-- 1. Insert Organizations for existing Car Owners
INSERT INTO public.organizations (id, owner_id, name, type, verified, created_at)
SELECT 
  gen_random_uuid(),      -- Generate new ID
  p.id,                   -- Owner ID
  'Flota de ' || COALESCE(p.full_name, p.email, 'Usuario ' || SUBSTRING(p.id::text, 1, 8)), -- Name: "Flota de Juan" or fallback
  'fleet',                -- Default type
  true,                   -- Auto-verify existing owners
  now()
FROM public.profiles p
WHERE EXISTS (SELECT 1 FROM public.cars c WHERE c.owner_id = p.id)
AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.owner_id = p.id); -- Prevent duplicates

-- 2. Add the Owners as Members of their new Organization
INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
SELECT 
  o.id,
  o.owner_id,
  'owner',
  now()
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om 
  WHERE om.organization_id = o.id AND om.user_id = o.owner_id
);

-- 3. Update Cars to point to the new Organization
-- We use a correlated subquery to find the organization owned by the car's owner
UPDATE public.cars c
SET organization_id = o.id
FROM public.organizations o
WHERE c.owner_id = o.owner_id
AND c.organization_id IS NULL; -- Only update if not already assigned

-- 4. Log the result
DO $$
DECLARE
  v_org_count INT;
  v_car_count INT;
BEGIN
  SELECT COUNT(*) INTO v_org_count FROM public.organizations;
  SELECT COUNT(*) INTO v_car_count FROM public.cars WHERE organization_id IS NOT NULL;
  
  RAISE NOTICE 'Data Migration Complete: Created % organizations and linked % cars.', v_org_count, v_car_count;
END $$;

COMMIT;
