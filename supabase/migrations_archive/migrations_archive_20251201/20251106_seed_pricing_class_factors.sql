-- ============================================================================
-- MIGRATION: Seed Pricing Class Factors
-- Date: 2025-11-06
-- Purpose: Insert initial multiplier factors for all driver classes (0-10)
-- ============================================================================

BEGIN;

-- Insert pricing factors for all 11 classes
INSERT INTO public.pricing_class_factors (class, fee_multiplier, guarantee_multiplier, description, is_active) VALUES
  (0, 0.85, 0.75, 'Excelente conductor - Máximo descuento. Historial impecable, score telemático >90.', TRUE),
  (1, 0.88, 0.80, 'Muy buen conductor - Gran descuento. Excelente historial, pocos o ningún siniestro.', TRUE),
  (2, 0.90, 0.85, 'Buen conductor - Buen descuento. Historial limpio, score consistente.', TRUE),
  (3, 0.92, 0.90, 'Conductor promedio+ - Descuento moderado. Buen historial general.', TRUE),
  (4, 0.95, 0.95, 'Conductor promedio - Descuento menor. Historial estándar.', TRUE),
  (5, 1.00, 1.00, 'Conductor base (sin historial) - Tarifa estándar. Nuevos usuarios comienzan aquí.', TRUE),
  (6, 1.05, 1.10, 'Conductor con riesgo - Recargo bajo. Algún siniestro con culpa.', TRUE),
  (7, 1.10, 1.20, 'Conductor de alto riesgo - Recargo moderado. Múltiples siniestros o score bajo.', TRUE),
  (8, 1.15, 1.40, 'Conductor de muy alto riesgo - Recargo alto. Historial problemático.', TRUE),
  (9, 1.18, 1.60, 'Conductor de riesgo extremo - Recargo muy alto. Múltiples siniestros graves.', TRUE),
  (10, 1.20, 1.80, 'Máximo recargo - Riesgo máximo. Historial crítico, requiere revisión especial.', TRUE)
ON CONFLICT (class) DO UPDATE SET
  fee_multiplier = EXCLUDED.fee_multiplier,
  guarantee_multiplier = EXCLUDED.guarantee_multiplier,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================================
-- Verify insertion
-- ============================================================================

-- Check that all 11 classes were inserted
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.pricing_class_factors;

  IF v_count != 11 THEN
    RAISE EXCEPTION 'Expected 11 pricing class factors, found %', v_count;
  END IF;

  RAISE NOTICE 'Successfully inserted % pricing class factors', v_count;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- Fee Multipliers (applied to base rental fee):
-- - Class 0-4: Discounts (0.85-0.95) - Reward good drivers
-- - Class 5: Standard rate (1.00) - Neutral, no history
-- - Class 6-10: Surcharges (1.05-1.20) - Charge risky drivers more
--
-- Guarantee Multipliers (applied to security deposit):
-- - Class 0-4: Lower deposits (0.75-0.95) - Trust good drivers
-- - Class 5: Standard deposit (1.00)
-- - Class 6-10: Higher deposits (1.10-1.80) - Protect against risky drivers
--
-- Example calculations:
-- - Base fee: $100/day, Class 0: $85/day (15% discount)
-- - Base fee: $100/day, Class 10: $120/day (20% surcharge)
-- - Base deposit: $500, Class 0: $375 (25% less)
-- - Base deposit: $500, Class 10: $900 (80% more)
--
-- These factors can be adjusted via admin panel or direct SQL UPDATE.
-- Changes take effect immediately for new bookings.
--
-- ============================================================================

COMMIT;
