-- ============================================================================
-- MIGRATION: Update Cars RLS for Organizations
-- Date: 2025-11-30
-- Description: Allow organization members to manage cars
-- ============================================================================

BEGIN;

-- Drop existing policies that restrict access to owner_id only
DROP POLICY IF EXISTS "Owners can update own cars" ON public.cars;
DROP POLICY IF EXISTS "Owners can delete own cars" ON public.cars;
DROP POLICY IF EXISTS "Users can create own cars" ON public.cars;

-- ============================================================================
-- NEW POLICIES
-- ============================================================================

-- 1. INSERT: Users can create cars for themselves OR their organization
CREATE POLICY "Users can create cars"
ON public.cars FOR INSERT
WITH CHECK (
  -- Personal car
  (organization_id IS NULL AND auth.uid() = owner_id)
  OR
  -- Organization car (User must be member with write access)
  (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = cars.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
  ))
);

-- 2. UPDATE: Owners OR Org Members can update
CREATE POLICY "Owners and Org Members can update cars"
ON public.cars FOR UPDATE
USING (
  -- Personal car
  (organization_id IS NULL AND auth.uid() = owner_id)
  OR
  -- Organization car
  (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = cars.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
  ))
);

-- 3. DELETE: Owners OR Org Members can delete (soft delete usually)
CREATE POLICY "Owners and Org Members can delete cars"
ON public.cars FOR DELETE
USING (
  -- Personal car
  (organization_id IS NULL AND auth.uid() = owner_id)
  OR
  -- Organization car
  (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = cars.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin') -- Managers maybe shouldn't delete cars?
  ))
);

COMMIT;
