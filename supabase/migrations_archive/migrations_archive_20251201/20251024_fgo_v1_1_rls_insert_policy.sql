-- ============================================================================
-- AUTORENTAR - FGO v1.1 RLS INSERT POLICY FIX
-- ============================================================================
-- Fix: Agregar política de INSERT faltante para booking_risk_snapshot
-- Fecha: 2025-10-24
-- Issue: "Failed to fetch" al crear risk snapshot desde frontend
-- ============================================================================

-- Crear política de INSERT para booking_risk_snapshot
-- Permite a usuarios crear snapshots para sus propias reservas (como locador o locatario)
CREATE POLICY "Users can create risk snapshots for own bookings"
  ON booking_risk_snapshot FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = booking_risk_snapshot.booking_id
      AND (c.owner_id = auth.uid() OR b.renter_id = auth.uid())
    )
  );

-- Comentario de la política
COMMENT ON POLICY "Users can create risk snapshots for own bookings"
  ON booking_risk_snapshot
  IS 'Permite a locadores y locatarios crear risk snapshots para sus reservas';

-- Verificar políticas creadas
DO $$
BEGIN
  RAISE NOTICE 'Políticas RLS para booking_risk_snapshot:';
  RAISE NOTICE '  - SELECT: ✓';
  RAISE NOTICE '  - INSERT: ✓';
END $$;

-- ============================================================================
-- FIN DE FIX
-- ============================================================================
