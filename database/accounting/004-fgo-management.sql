-- =====================================================
-- GESTIÓN DEL FONDO DE GARANTÍA OPERATIVA (FGO)
-- Basado en NIIF 37 (Provisiones, Pasivos Contingentes y Activos Contingentes)
-- =====================================================

-- =====================================================
-- FUNCIÓN: Registrar contribución al FGO
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_record_fgo_contribution(
  p_booking_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_provision_id UUID;
BEGIN
  -- Crear provisión en tabla de provisiones
  INSERT INTO accounting_provisions (
    name,
    type,
    account_id,
    estimated_amount,
    actual_amount,
    status,
    reference_type,
    reference_id,
    recognition_date,
    description
  )
  SELECT
    'Provisión FGO - Booking ' || p_booking_id::TEXT,
    'fgo_reserve',
    id,
    p_amount,
    p_amount,
    'active',
    'booking',
    p_booking_id,
    CURRENT_DATE,
    COALESCE(p_description, 'Contribución al Fondo de Garantía Operativa')
  FROM accounting_accounts
  WHERE code = '2.1.5.01'
  RETURNING id INTO v_provision_id;
  
  -- Crear asiento contable:
  -- DEBE: Gasto por Provisión FGO
  -- HABER: Provisión FGO (Pasivo - NIIF 37)
  v_entry_id := create_accounting_entry(
    p_description := 'Provisión FGO - ' || COALESCE(p_description, 'Booking ' || p_booking_id::TEXT),
    p_entry_date := CURRENT_DATE,
    p_reference_type := 'fgo_contribution',
    p_reference_id := p_booking_id,
    p_lines := jsonb_build_array(
      jsonb_build_object(
        'account_code', '5.1.2',
        'debit', p_amount,
        'description', 'Gasto por constitución provisión'
      ),
      jsonb_build_object(
        'account_code', '2.1.5.01',
        'credit', p_amount,
        'description', 'Provisión para siniestros futuros (NIIF 37)'
      )
    ),
    p_auto_post := TRUE
  );
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Consumir provisión FGO por siniestro
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_record_fgo_claim(
  p_booking_id UUID,
  p_claim_amount NUMERIC,
  p_description TEXT
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_provision_id UUID;
  v_available_amount NUMERIC;
BEGIN
  -- Buscar provisión activa para este booking
  SELECT id, actual_amount INTO v_provision_id, v_available_amount
  FROM accounting_provisions
  WHERE reference_type = 'booking'
    AND reference_id = p_booking_id
    AND type = 'fgo_reserve'
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_provision_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró provisión FGO activa para booking %', p_booking_id;
  END IF;
  
  IF p_claim_amount > v_available_amount THEN
    RAISE EXCEPTION 'Monto del siniestro (%) excede provisión disponible (%)', 
      p_claim_amount, v_available_amount;
  END IF;
  
  -- Actualizar provisión
  UPDATE accounting_provisions
  SET 
    actual_amount = actual_amount - p_claim_amount,
    status = CASE 
      WHEN actual_amount - p_claim_amount <= 0 THEN 'consumed'
      ELSE 'active'
    END,
    consumption_date = CASE 
      WHEN actual_amount - p_claim_amount <= 0 THEN CURRENT_DATE
      ELSE consumption_date
    END,
    updated_at = NOW()
  WHERE id = v_provision_id;
  
  -- Crear asiento contable:
  -- DEBE: Provisión FGO (reducir pasivo)
  -- HABER: Caja/Banco (salida de efectivo por pago de siniestro)
  v_entry_id := create_accounting_entry(
    p_description := 'Pago siniestro con FGO - ' || p_description,
    p_entry_date := CURRENT_DATE,
    p_reference_type := 'fgo_contribution',
    p_reference_id := p_booking_id,
    p_lines := jsonb_build_array(
      jsonb_build_object(
        'account_code', '2.1.5.01',
        'debit', p_claim_amount,
        'description', 'Consumo provisión FGO'
      ),
      jsonb_build_object(
        'account_code', '1.1.1.02',
        'credit', p_claim_amount,
        'description', 'Pago efectivo siniestro'
      )
    ),
    p_auto_post := TRUE
  );
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Liberar provisión FGO no utilizada
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_release_fgo_provision(
  p_booking_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_provision_id UUID;
  v_remaining_amount NUMERIC;
BEGIN
  -- Buscar provisión activa
  SELECT id, actual_amount INTO v_provision_id, v_remaining_amount
  FROM accounting_provisions
  WHERE reference_type = 'booking'
    AND reference_id = p_booking_id
    AND type = 'fgo_reserve'
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_provision_id IS NULL OR v_remaining_amount <= 0 THEN
    RETURN NULL; -- No hay nada que liberar
  END IF;
  
  -- Marcar provisión como liberada
  UPDATE accounting_provisions
  SET 
    status = 'released',
    consumption_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = v_provision_id;
  
  -- Crear asiento de reversión:
  -- DEBE: Provisión FGO (reducir pasivo)
  -- HABER: Ingreso por reversión de provisión (o puede ir a reserva)
  v_entry_id := create_accounting_entry(
    p_description := 'Liberación provisión FGO no utilizada',
    p_entry_date := CURRENT_DATE,
    p_reference_type := 'fgo_contribution',
    p_reference_id := p_booking_id,
    p_lines := jsonb_build_array(
      jsonb_build_object(
        'account_code', '2.1.5.01',
        'debit', v_remaining_amount,
        'description', 'Reversión provisión no utilizada'
      ),
      jsonb_build_object(
        'account_code', '3.4',
        'credit', v_remaining_amount,
        'description', 'Traspaso a Reserva FGO acumulada'
      )
    ),
    p_auto_post := TRUE
  );
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Crear provisión FGO automáticamente al completar booking
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_create_fgo_provision()
RETURNS TRIGGER AS $$
DECLARE
  v_fgo_amount NUMERIC;
BEGIN
  -- Cuando booking se completa, crear provisión FGO
  IF NEW.status = 'completed' AND 
     (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Calcular aporte FGO (ejemplo: 5% del total)
    -- Este valor debería venir de una configuración
    v_fgo_amount := NEW.total_price * 0.05;
    
    -- Crear provisión
    PERFORM accounting_record_fgo_contribution(
      p_booking_id := NEW.id,
      p_amount := v_fgo_amount,
      p_description := 'Provisión automática 5% del alquiler'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_fgo_provision ON bookings;
CREATE TRIGGER trigger_fgo_provision
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_fgo_provision();

-- =====================================================
-- VISTA: Estado del FGO
-- =====================================================

CREATE OR REPLACE VIEW accounting_fgo_summary AS
SELECT
  'total_provisioned' as metric,
  SUM(estimated_amount) as amount,
  COUNT(*) as count
FROM accounting_provisions
WHERE type = 'fgo_reserve'
  AND status IN ('active', 'consumed')

UNION ALL

SELECT
  'total_available' as metric,
  SUM(actual_amount) as amount,
  COUNT(*) as count
FROM accounting_provisions
WHERE type = 'fgo_reserve'
  AND status = 'active'

UNION ALL

SELECT
  'total_consumed' as metric,
  SUM(estimated_amount - actual_amount) as amount,
  COUNT(*) as count
FROM accounting_provisions
WHERE type = 'fgo_reserve'
  AND status IN ('active', 'consumed');

-- =====================================================
-- VISTA: Detalle de provisiones FGO por booking
-- =====================================================

CREATE OR REPLACE VIEW accounting_fgo_by_booking AS
SELECT
  p.id as provision_id,
  p.reference_id as booking_id,
  b.car_id,
  b.total_price as booking_amount,
  p.estimated_amount as fgo_provisioned,
  p.actual_amount as fgo_available,
  p.estimated_amount - p.actual_amount as fgo_consumed,
  p.status as provision_status,
  p.recognition_date,
  p.consumption_date
FROM accounting_provisions p
LEFT JOIN bookings b ON b.id = p.reference_id
WHERE p.type = 'fgo_reserve'
ORDER BY p.created_at DESC;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION accounting_record_fgo_contribution IS 'Registra contribución al FGO creando provisión según NIIF 37';
COMMENT ON FUNCTION accounting_record_fgo_claim IS 'Registra pago de siniestro consumiendo provisión FGO';
COMMENT ON FUNCTION accounting_release_fgo_provision IS 'Libera provisión FGO no utilizada trasladándola a reserva acumulada';
COMMENT ON VIEW accounting_fgo_summary IS 'Resumen del estado del Fondo de Garantía Operativa';
COMMENT ON VIEW accounting_fgo_by_booking IS 'Detalle de provisiones FGO por cada booking';
