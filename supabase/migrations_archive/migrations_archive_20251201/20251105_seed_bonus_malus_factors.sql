-- ============================================================================
-- AUTORENTA - SEED DATA PARA SISTEMA BONUS-MALUS
-- ============================================================================
-- Created: 2025-11-05
-- Purpose: Datos iniciales de factores de ajuste por clase de conductor
-- ============================================================================
--
-- FACTORES POR CLASE:
-- - fee_multiplier: Ajuste del fee de plataforma
-- - guarantee_multiplier: Ajuste de la garantía requerida
--
-- EJEMPLO:
-- - Clase 0: fee×0.85, guarantee×0.75 (15% menos fee, 25% menos garantía)
-- - Clase 5: fee×1.00, guarantee×1.00 (base, sin ajustes)
-- - Clase 10: fee×1.20, guarantee×1.80 (20% más fee, 80% más garantía)
-- ============================================================================

BEGIN;

-- ============================================================================
-- INSERT PRICING CLASS FACTORS
-- ============================================================================

-- Limpiar datos existentes (solo en desarrollo)
-- TRUNCATE TABLE pricing_class_factors CASCADE;

-- Insertar factores por clase (0-10)
INSERT INTO pricing_class_factors (class, fee_multiplier, guarantee_multiplier, description, is_active)
VALUES
  -- Clases excelentes (0-2) - Descuentos significativos
  (0, 0.85, 0.75, 'Excelente conductor - Máximo descuento', TRUE),
  (1, 0.88, 0.80, 'Muy buen conductor - Descuento alto', TRUE),
  (2, 0.90, 0.85, 'Buen conductor - Descuento moderado', TRUE),

  -- Clases buenas (3-4) - Descuentos leves
  (3, 0.92, 0.90, 'Conductor promedio+ - Descuento leve', TRUE),
  (4, 0.95, 0.95, 'Conductor promedio - Descuento mínimo', TRUE),

  -- Clase base (5) - Sin ajustes
  (5, 1.00, 1.00, 'Conductor base - Sin historial', TRUE),

  -- Clases de riesgo (6-7) - Recargos moderados
  (6, 1.05, 1.10, 'Conductor con riesgo - Recargo leve', TRUE),
  (7, 1.10, 1.20, 'Conductor de alto riesgo - Recargo moderado', TRUE),

  -- Clases de riesgo alto (8-10) - Recargos altos
  (8, 1.15, 1.40, 'Conductor de muy alto riesgo - Recargo alto', TRUE),
  (9, 1.18, 1.60, 'Conductor de riesgo extremo - Recargo muy alto', TRUE),
  (10, 1.20, 1.80, 'Riesgo máximo - Recargo máximo', TRUE)

ON CONFLICT (class) DO UPDATE
SET
  fee_multiplier = EXCLUDED.fee_multiplier,
  guarantee_multiplier = EXCLUDED.guarantee_multiplier,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================================
-- VERIFICATION & ANALYTICS
-- ============================================================================

-- Verificar que se insertaron todas las clases
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM pricing_class_factors WHERE is_active = TRUE;

  IF v_count = 11 THEN
    RAISE NOTICE '✅ Seed data insertado correctamente: 11 clases (0-10)';
  ELSE
    RAISE WARNING '⚠️  Solo se insertaron % clases (esperado: 11)', v_count;
  END IF;
END $$;

-- Mostrar resumen de factores
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '  FACTORES DE AJUSTE POR CLASE DE CONDUCTOR';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Clase │ Fee      │ Garantía │ Descripción';
  RAISE NOTICE '──────┼──────────┼──────────┼─────────────────────────────';

  FOR rec IN
    SELECT
      class,
      fee_multiplier,
      guarantee_multiplier,
      description
    FROM pricing_class_factors
    ORDER BY class ASC
  LOOP
    RAISE NOTICE '%     │ %    │ %    │ %',
      LPAD(rec.class::TEXT, 5, ' '),
      LPAD((rec.fee_multiplier * 100)::TEXT || '%', 8, ' '),
      LPAD((rec.guarantee_multiplier * 100)::TEXT || '%', 8, ' '),
      rec.description;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- EJEMPLOS DE CÁLCULO
-- ============================================================================

-- Crear vista helper para calcular precios ajustados
CREATE OR REPLACE VIEW v_pricing_examples AS
SELECT
  class,
  description,
  fee_multiplier,
  guarantee_multiplier,

  -- Ejemplos con valores base
  ROUND((15.00 * fee_multiplier), 2) AS "fee_example_usd",
  ROUND((500.00 * guarantee_multiplier), 2) AS "guarantee_example_usd",

  -- Ahorro/Recargo en porcentaje
  ROUND((fee_multiplier - 1.00) * 100, 1) AS "fee_adjustment_%",
  ROUND((guarantee_multiplier - 1.00) * 100, 1) AS "guarantee_adjustment_%"

FROM pricing_class_factors
WHERE is_active = TRUE
ORDER BY class ASC;

COMMENT ON VIEW v_pricing_examples IS
  'Vista con ejemplos de cálculo de fee ($15) y garantía ($500) ajustados por clase';

-- Mostrar ejemplos
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '  EJEMPLOS DE CÁLCULO (Base: Fee $15 USD, Garantía $500 USD)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Clase │ Fee Final │ Garantía Final │ Ahorro/Recargo';
  RAISE NOTICE '──────┼───────────┼────────────────┼────────────────────────';

  FOR rec IN
    SELECT * FROM v_pricing_examples ORDER BY class ASC
  LOOP
    RAISE NOTICE '%     │ $%    │ $%         │ Fee: %%, Garantía: %%',
      LPAD(rec.class::TEXT, 5, ' '),
      LPAD(rec."fee_example_usd"::TEXT, 8, ' '),
      LPAD(rec."guarantee_example_usd"::TEXT, 13, ' '),
      CASE
        WHEN rec."fee_adjustment_%" > 0 THEN '+' || rec."fee_adjustment_%"::TEXT
        ELSE rec."fee_adjustment_%"::TEXT
      END,
      CASE
        WHEN rec."guarantee_adjustment_%" > 0 THEN '+' || rec."guarantee_adjustment_%"::TEXT
        ELSE rec."guarantee_adjustment_%"::TEXT
      END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Interpretación:';
  RAISE NOTICE '   - Valores negativos = Descuento (clases 0-4)';
  RAISE NOTICE '   - Valor 0 = Sin ajuste (clase 5 - base)';
  RAISE NOTICE '   - Valores positivos = Recargo (clases 6-10)';
  RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
