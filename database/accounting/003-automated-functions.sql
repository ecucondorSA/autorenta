-- =====================================================
-- FUNCIONES AUTOMÁTICAS DE CONTABILIZACIÓN
-- Sistema de registro automático para eventos de la plataforma
-- =====================================================

-- =====================================================
-- FUNCIÓN AUXILIAR: Generar número de asiento automático
-- =====================================================

CREATE OR REPLACE FUNCTION generate_entry_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Obtener último número del año
  SELECT COALESCE(MAX(
    CASE 
      WHEN entry_number ~ '^AST-[0-9]{4}-[0-9]+$' 
      THEN CAST(SPLIT_PART(entry_number, '-', 3) AS INTEGER)
      ELSE 0
    END
  ), 0) INTO last_number
  FROM accounting_journal_entries
  WHERE entry_number LIKE 'AST-' || current_year || '-%';
  
  new_number := 'AST-' || current_year || '-' || LPAD((last_number + 1)::TEXT, 6, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Crear asiento contable con validación de partida doble
-- =====================================================

CREATE OR REPLACE FUNCTION create_accounting_entry(
  p_description TEXT,
  p_entry_date DATE,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_lines JSONB, -- Array de {account_code, debit, credit, description}
  p_auto_post BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_line JSONB;
  v_account_id UUID;
  v_total_debits NUMERIC := 0;
  v_total_credits NUMERIC := 0;
BEGIN
  -- Generar número de asiento
  v_entry_number := generate_entry_number();
  
  -- Crear encabezado del asiento
  INSERT INTO accounting_journal_entries (
    entry_number,
    entry_date,
    description,
    reference_type,
    reference_id,
    status,
    created_by
  ) VALUES (
    v_entry_number,
    COALESCE(p_entry_date, CURRENT_DATE),
    p_description,
    p_reference_type,
    p_reference_id,
    CASE WHEN p_auto_post THEN 'posted' ELSE 'draft' END,
    auth.uid()
  )
  RETURNING id INTO v_entry_id;
  
  -- Crear líneas del asiento
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    -- Obtener ID de cuenta
    SELECT id INTO v_account_id
    FROM accounting_accounts
    WHERE code = v_line->>'account_code' AND is_active = TRUE;
    
    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'Cuenta % no encontrada o inactiva', v_line->>'account_code';
    END IF;
    
    -- Insertar línea
    INSERT INTO accounting_journal_lines (
      journal_entry_id,
      account_id,
      debit_amount,
      credit_amount,
      description
    ) VALUES (
      v_entry_id,
      v_account_id,
      COALESCE((v_line->>'debit')::NUMERIC, 0),
      COALESCE((v_line->>'credit')::NUMERIC, 0),
      v_line->>'description'
    );
    
    -- Acumular totales
    v_total_debits := v_total_debits + COALESCE((v_line->>'debit')::NUMERIC, 0);
    v_total_credits := v_total_credits + COALESCE((v_line->>'credit')::NUMERIC, 0);
  END LOOP;
  
  -- Validar partida doble
  IF ABS(v_total_debits - v_total_credits) > 0.01 THEN
    RAISE EXCEPTION 'Asiento desbalanceado: Débitos=% Créditos=%', v_total_debits, v_total_credits;
  END IF;
  
  -- Marcar como contabilizado si es automático
  IF p_auto_post THEN
    UPDATE accounting_journal_entries
    SET posted_at = NOW()
    WHERE id = v_entry_id;
  END IF;
  
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUTOMATIZACIÓN 1: Depósito a Billetera (NIIF 15)
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_record_wallet_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role TEXT;
  v_wallet_account TEXT;
BEGIN
  -- Solo procesar depósitos completados
  IF NEW.type = 'deposit' AND NEW.status = 'completed' AND 
     (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Determinar rol del usuario
    SELECT role INTO v_user_role
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Seleccionar cuenta según rol
    v_wallet_account := CASE 
      WHEN v_user_role = 'locador' THEN '2.1.1.01'
      ELSE '2.1.1.02'
    END;
    
    -- Crear asiento:
    -- DEBE: Caja/Banco (activo aumenta)
    -- HABER: Depósitos de Clientes (pasivo aumenta - NIIF 15)
    PERFORM create_accounting_entry(
      p_description := 'Depósito a billetera usuario',
      p_entry_date := CURRENT_DATE,
      p_reference_type := 'wallet_transaction',
      p_reference_id := NEW.id,
      p_lines := jsonb_build_array(
        jsonb_build_object(
          'account_code', CASE NEW.provider
            WHEN 'mercadopago' THEN '1.1.1.03'
            WHEN 'stripe' THEN '1.1.1.04'
            ELSE '1.1.1.02'
          END,
          'debit', NEW.amount,
          'description', 'Ingreso de fondos'
        ),
        jsonb_build_object(
          'account_code', v_wallet_account,
          'credit', NEW.amount,
          'description', 'Pasivo con usuario - NIIF 15'
        )
      ),
      p_auto_post := TRUE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS trigger_accounting_wallet_deposit ON wallet_transactions;
CREATE TRIGGER trigger_accounting_wallet_deposit
  AFTER INSERT OR UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION accounting_record_wallet_deposit();

-- =====================================================
-- AUTOMATIZACIÓN 2: Inicio de Alquiler - Bloqueo de Garantía
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_record_booking_start()
RETURNS TRIGGER AS $$
DECLARE
  v_franchise_amount NUMERIC;
BEGIN
  -- Cuando booking pasa a 'in_progress' y tiene garantía bloqueada
  IF NEW.status = 'in_progress' AND 
     (OLD.status IS NULL OR OLD.status != 'in_progress') AND
     NEW.security_deposit_amount > 0 THEN
    
    v_franchise_amount := NEW.security_deposit_amount;
    
    -- Crear asiento:
    -- DEBE: (ninguno - solo reclasificación de pasivo)
    -- HABER: (ninguno - solo reclasificación de pasivo)
    -- Este es un movimiento interno entre cuentas de pasivo
    
    PERFORM create_accounting_entry(
      p_description := 'Bloqueo de depósito de garantía - Booking ' || NEW.id::TEXT,
      p_entry_date := CURRENT_DATE,
      p_reference_type := 'booking',
      p_reference_id := NEW.id,
      p_lines := jsonb_build_array(
        jsonb_build_object(
          'account_code', '2.1.1.02',
          'debit', v_franchise_amount,
          'description', 'Reclasificación desde billetera'
        ),
        jsonb_build_object(
          'account_code', '2.1.2.01',
          'credit', v_franchise_amount,
          'description', 'Depósito bloqueado como garantía'
        )
      ),
      p_auto_post := TRUE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS trigger_accounting_booking_start ON bookings;
CREATE TRIGGER trigger_accounting_booking_start
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION accounting_record_booking_start();

-- =====================================================
-- AUTOMATIZACIÓN 3: Finalización de Alquiler - Reconocimiento de Ingreso (NIIF 15)
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_record_booking_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_amount NUMERIC;
  v_total_amount NUMERIC;
  v_owner_amount NUMERIC;
BEGIN
  -- Cuando booking se completa
  IF NEW.status = 'completed' AND 
     (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Calcular montos
    v_total_amount := NEW.total_price;
    v_commission_amount := NEW.platform_fee; -- Comisión de AutoRenta
    v_owner_amount := v_total_amount - v_commission_amount;
    
    -- ASIENTO 1: Reconocimiento de ingreso (solo comisión - NIIF 15 agente)
    PERFORM create_accounting_entry(
      p_description := 'Ingreso por comisión - Alquiler completado',
      p_entry_date := CURRENT_DATE,
      p_reference_type := 'booking',
      p_reference_id := NEW.id,
      p_lines := jsonb_build_array(
        jsonb_build_object(
          'account_code', '2.1.3.01',
          'debit', v_commission_amount,
          'description', 'Reversión ingreso diferido'
        ),
        jsonb_build_object(
          'account_code', '4.1.1',
          'credit', v_commission_amount,
          'description', 'Ingreso comisión plataforma (NIIF 15)'
        )
      ),
      p_auto_post := TRUE
    );
    
    -- ASIENTO 2: Obligación de pago al locador
    PERFORM create_accounting_entry(
      p_description := 'Pago pendiente a locador - Alquiler completado',
      p_entry_date := CURRENT_DATE,
      p_reference_type := 'booking',
      p_reference_id := NEW.id,
      p_lines := jsonb_build_array(
        jsonb_build_object(
          'account_code', '2.1.1.02',
          'debit', v_owner_amount,
          'description', 'Reducción pasivo inquilino'
        ),
        jsonb_build_object(
          'account_code', '2.1.4.01',
          'credit', v_owner_amount,
          'description', 'Obligación pago al propietario'
        )
      ),
      p_auto_post := TRUE
    );
    
    -- ASIENTO 3: Liberación de garantía (si no hubo daños)
    IF NEW.security_deposit_amount > 0 THEN
      PERFORM create_accounting_entry(
        p_description := 'Liberación de depósito de garantía',
        p_entry_date := CURRENT_DATE,
        p_reference_type := 'booking',
        p_reference_id := NEW.id,
        p_lines := jsonb_build_array(
          jsonb_build_object(
            'account_code', '2.1.2.01',
            'debit', NEW.security_deposit_amount,
            'description', 'Liberación de garantía bloqueada'
          ),
          jsonb_build_object(
            'account_code', '2.1.1.02',
            'credit', NEW.security_deposit_amount,
            'description', 'Devolución a billetera inquilino'
          )
        ),
        p_auto_post := TRUE
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS trigger_accounting_booking_completion ON bookings;
CREATE TRIGGER trigger_accounting_booking_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION accounting_record_booking_completion();

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION create_accounting_entry IS 'Función central para crear asientos contables con validación de partida doble';
COMMENT ON FUNCTION accounting_record_wallet_deposit IS 'Registra automáticamente depósitos a billetera como pasivo (NIIF 15)';
COMMENT ON FUNCTION accounting_record_booking_start IS 'Registra bloqueo de depósitos de garantía al iniciar alquiler';
COMMENT ON FUNCTION accounting_record_booking_completion IS 'Registra reconocimiento de ingreso solo sobre comisión (NIIF 15 - agente)';
