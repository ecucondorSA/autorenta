BEGIN;

CREATE OR REPLACE FUNCTION public.user_is_member_of_org(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = p_org_id
      AND user_id = p_user_id
  );
END;
$$;

COMMENT ON FUNCTION public.user_is_member_of_org IS
  'Helper que verifica si un usuario pertenece a una organización sin activar la política de la misma tabla';

GRANT EXECUTE ON FUNCTION public.user_is_member_of_org(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Members can view other members of same org" ON public.organization_members;

CREATE POLICY "Members can view other members of same org"
  ON public.organization_members
  FOR SELECT
  USING (public.user_is_member_of_org(auth.uid(), organization_members.organization_id));

COMMIT;
