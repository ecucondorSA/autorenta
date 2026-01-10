-- ============================================================================
-- Script: consolidate-rls-policies.sql
-- Consolida múltiples políticas permisivas en una sola donde sea apropiado
--
-- Uso: Ejecutar en Supabase SQL Editor (revisar antes de aplicar)
-- ============================================================================

-- 1. Ver tablas con múltiples políticas del mismo tipo
SELECT
  tablename,
  cmd,
  COUNT(*) AS policy_count,
  array_agg(policyname) AS policies
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 2. Ejemplo de consolidación para mp_onboarding_states
-- (Tiene 3 pares de policies: user + service_role)

-- Antes: mp_onboarding_insert_own + mp_onboarding_service_all para INSERT
-- Después: Una sola policy con OR

/*
-- EJEMPLO (no ejecutar directamente, adaptar):

DROP POLICY IF EXISTS "mp_onboarding_insert_own" ON public.mp_onboarding_states;
DROP POLICY IF EXISTS "mp_onboarding_service_all" ON public.mp_onboarding_states;

CREATE POLICY "mp_onboarding_insert" ON public.mp_onboarding_states
  FOR INSERT TO public
  WITH CHECK (
    (select auth.uid()) = user_id
    OR (auth.jwt() ->> 'role') = 'service_role'
  );
*/

-- 3. Generar scripts de consolidación para patterns comunes

-- Pattern: admin_policy + user_policy → combined
-- Este es un pattern VÁLIDO, no siempre debe consolidarse

-- Pattern: legacy_policy + new_policy → eliminar legacy
-- Verificar que legacy no tenga lógica adicional

-- 4. Ver policies que son subconjuntos de otras (candidatas a eliminar)
WITH policy_details AS (
  SELECT
    tablename,
    policyname,
    cmd,
    qual,
    with_check,
    LENGTH(COALESCE(qual, '') || COALESCE(with_check, '')) AS complexity
  FROM pg_policies
  WHERE schemaname = 'public'
)
SELECT
  a.tablename,
  a.policyname AS simpler_policy,
  b.policyname AS complex_policy,
  a.cmd
FROM policy_details a
JOIN policy_details b ON a.tablename = b.tablename
  AND a.cmd = b.cmd
  AND a.policyname != b.policyname
  AND a.complexity < b.complexity
  AND b.qual LIKE '%' || REPLACE(REPLACE(a.qual, '(', ''), ')', '') || '%'
WHERE a.cmd != 'ALL';

-- ============================================================================
-- RECOMENDACIÓN:
-- No consolidar policies admin+user automáticamente.
-- Es un patrón válido para separar permisos.
-- Solo consolidar cuando hay duplicados obvios (mismo nombre legacy/nuevo)
-- ============================================================================
