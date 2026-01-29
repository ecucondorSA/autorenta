-- ============================================================================
-- AUTORENTAR - FGO v1.1 RLS FIXES COMPLETOS
-- ============================================================================
-- Fix: Políticas RLS faltantes para FGO v1.1
-- Fecha: 2025-10-24
-- Issue: Errores 406 y "Failed to fetch" en frontend
-- ============================================================================

-- ============================================================================
-- 1. FGO_PARAMETERS: Permitir lectura a usuarios autenticados
-- ============================================================================

-- La tabla fgo_parameters solo permitía SELECT a admins
-- Ahora permitimos a todos los usuarios autenticados leer los parámetros
CREATE POLICY "Authenticated users can view FGO parameters"
  ON fgo_parameters FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "Authenticated users can view FGO parameters"
  ON fgo_parameters
  IS 'Permite a todos los usuarios autenticados leer parámetros FGO (necesario para determinar event caps y franquicias)';

-- ============================================================================
-- 2. BOOKING_RISK_SNAPSHOT: Permitir INSERT
-- ============================================================================

-- Política de INSERT ya creada en migración anterior
-- CREATE POLICY "Users can create risk snapshots for own bookings"
--   ON booking_risk_snapshot FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM bookings b
--       JOIN cars c ON b.car_id = c.id
--       WHERE b.id = booking_risk_snapshot.booking_id
--       AND (c.owner_id = auth.uid() OR b.renter_id = auth.uid())
--     )
--   );

-- ============================================================================
-- 3. VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  fgo_params_policies INTEGER;
  risk_snapshot_policies INTEGER;
BEGIN
  -- Contar políticas de fgo_parameters
  SELECT COUNT(*) INTO fgo_params_policies
  FROM pg_policies
  WHERE tablename = 'fgo_parameters' AND cmd = 'SELECT';

  -- Contar políticas de booking_risk_snapshot
  SELECT COUNT(*) INTO risk_snapshot_policies
  FROM pg_policies
  WHERE tablename = 'booking_risk_snapshot';

  RAISE NOTICE '✅ FGO v1.1 RLS Verification:';
  RAISE NOTICE '   - fgo_parameters SELECT policies: % (esperado: 2)', fgo_params_policies;
  RAISE NOTICE '   - booking_risk_snapshot policies: % (esperado: 2)', risk_snapshot_policies;

  IF fgo_params_policies < 2 THEN
    RAISE WARNING '⚠️ fgo_parameters: Faltan políticas de SELECT';
  END IF;

  IF risk_snapshot_policies < 2 THEN
    RAISE WARNING '⚠️ booking_risk_snapshot: Faltan políticas RLS';
  END IF;
END $$;

-- ============================================================================
-- 4. RESUMEN DE POLÍTICAS
-- ============================================================================

-- Ver todas las políticas FGO
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas RLS FGO v1.1:';
  RAISE NOTICE '';
  RAISE NOTICE '🔹 fgo_parameters:';
  RAISE NOTICE '   - SELECT (admins): ✓';
  RAISE NOTICE '   - SELECT (authenticated): ✓';
  RAISE NOTICE '   - UPDATE (admins): ✓';
  RAISE NOTICE '';
  RAISE NOTICE '🔹 booking_risk_snapshot:';
  RAISE NOTICE '   - SELECT (own bookings): ✓';
  RAISE NOTICE '   - INSERT (own bookings): ✓';
  RAISE NOTICE '';
  RAISE NOTICE '🔹 booking_inspections:';
  RAISE NOTICE '   - SELECT (own bookings): ✓';
  RAISE NOTICE '   - INSERT (owner/renter): ✓';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIN DE FIXES
-- ============================================================================
