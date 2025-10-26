-- =====================================================
-- FUNCIONES AUTOMÁTICAS DE CONTABILIZACIÓN
-- Sistema cíclico que registra transacciones automáticamente
-- =====================================================

-- ===== FUNCIÓN PRINCIPAL: Crear Asiento Contable =====
CREATE OR REPLACE FUNCTION create_journal_entry(
  p_transaction_type VARCHAR,
  p_reference_id UUID,
  p_reference_table VARCHAR,
  p_description TEXT,
  p_entries JSONB, -- Array de {account_code, debit, credit, description}
  p_fiscal_period VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_journal_entry_id UUID;
  v_entry_number VARCHAR;
  v_total_debit DECIMAL(15, 2) := 0;
  v_total_credit DECIMAL(15, 2) := 0;
  v_entry JSONB;
  v_account_id UUID;
  v_line_number INT := 1;
  v_fiscal_period VARCHAR;
BEGIN
  -- Generar número de asiento
  v_entry_number := 'AC-' || TO_CHAR(NOW(), 'YYYY-MM') || '-' || 
                    LPAD(NEXTVAL('accounting_journal_entries_id_seq')::TEXT, 6, '0');
  
  -- Periodo fiscal
  v_fiscal_period := COALESCE(p_fiscal_period, TO_CHAR(NOW(), 'YYYY-MM'));
  
  -- Calcular totales
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_total_debit := v_total_debit + COALESCE((v_entry->>'debit')::DECIMAL, 0);
    v_total_credit := v_total_credit + COALESCE((v_entry->>'credit')::DECIMAL, 0);
  END LOOP;
  
  -- Validar balance
  IF v_total_debit != v_total_credit THEN
    RAISE EXCEPTION 'Asiento desbalanceado: Débito=% Crédito=%', v_total_debit, v_total_credit;
  END IF;
  
  IF v_total_debit = 0 THEN
    RAISE EXCEPTION 'Asiento sin movimientos';
  END IF;
  
  -- Crear asiento contable
  INSERT INTO accounting_journal_entries (
    entry_number, entry_date, transaction_type, reference_id, reference_table,
    description, total_debit, total_credit, fiscal_period, status
  ) VALUES (
    v_entry_number, NOW(), p_transaction_type, p_reference_id, p_reference_table,
    p_description, v_total_debit, v_total_credit, v_fiscal_period, 'POSTED'
  ) RETURNING id INTO v_journal_entry_id;
  
  -- Crear líneas del asiento
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    -- Obtener account_id
    SELECT id INTO v_account_id 
    FROM accounting_accounts 
    WHERE code = v_entry->>'account_code' AND is_active = TRUE;
    
    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'Cuenta contable no encontrada: %', v_entry->>'account_code';
    END IF;
    
    -- Insertar línea
    INSERT INTO accounting_journal_entry_lines (
      journal_entry_id, line_number, account_id, 
      debit_amount, credit_amount, description
    ) VALUES (
      v_journal_entry_id, v_line_number, v_account_id,
      COALESCE((v_entry->>'debit')::DECIMAL, 0),
      COALESCE((v_entry->>'credit')::DECIMAL, 0),
      COALESCE(v_entry->>'description', '')
    );
    
    -- Registrar en el libro mayor
    IF (v_entry->>'debit')::DECIMAL > 0 THEN
      INSERT INTO accounting_ledger (
        account_id, debit_amount, credit_amount, transaction_type,
        reference_id, reference_table, description, fiscal_period
      ) VALUES (
        v_account_id, (v_entry->>'debit')::DECIMAL, 0, p_transaction_type,
        p_reference_id, p_reference_table, p_description, v_fiscal_period
      );
    ELSIF (v_entry->>'credit')::DECIMAL > 0 THEN
      INSERT INTO accounting_ledger (
        account_id, debit_amount, credit_amount, transaction_type,
        reference_id, reference_table, description, fiscal_period
      ) VALUES (
        v_account_id, 0, (v_entry->>'credit')::DECIMAL, p_transaction_type,
        p_reference_id, p_reference_table, p_description, v_fiscal_period
      );
    END IF;
    
    v_line_number := v_line_number + 1;
  END LOOP;
  
  RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== TRIGGER: Contabilizar Depósito en Billetera =====
CREATE OR REPLACE FUNCTION accounting_on_wallet_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_entries JSONB;
  v_amount DECIMAL(15, 2);
BEGIN
  -- Solo procesar depósitos confirmados
  IF NEW.transaction_type = 'deposit' AND NEW.status = 'completed' 
     AND (OLD IS NULL OR OLD.status != 'completed') THEN
    
    v_amount := NEW.amount;
    
    -- Asiento contable:
    -- DEBE: 1115 MercadoPago (Activo aumenta)
    -- HABER: 2805 Depósitos de Clientes - Billetera (Pasivo aumenta)
    v_entries := jsonb_build_array(
      jsonb_build_object(
        'account_code', '1115',
        'debit', v_amount,
        'credit', 0,
        'description', 'Depósito recibido en MercadoPago'
      ),
      jsonb_build_object(
        'account_code', '2805',
        'debit', 0,
        'credit', v_amount,
        'description', 'Pasivo con usuario - Saldo en billetera'
      )
    );
    
    PERFORM create_journal_entry(
      'WALLET_DEPOSIT',
      NEW.id,
      'wallet_transactions',
      'Depósito en billetera usuario - NIIF 15 Pasivo por Contrato',
      v_entries
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_accounting_wallet_deposit ON wallet_transactions;
CREATE TRIGGER trigger_accounting_wallet_deposit
AFTER INSERT OR UPDATE ON wallet_transactions
FOR EACH ROW EXECUTE FUNCTION accounting_on_wallet_deposit();

-- ===== TRIGGER: Contabilizar Creación de Reserva =====
CREATE OR REPLACE FUNCTION accounting_on_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_entries JSONB;
  v_security_deposit DECIMAL(15, 2);
  v_rental_amount DECIMAL(15, 2);
  v_commission DECIMAL(15, 2);
  v_owner_amount DECIMAL(15, 2);
BEGIN
  -- Solo al crear booking con pago
  IF NEW.payment_status = 'paid' AND (OLD IS NULL OR OLD.payment_status != 'paid') THEN
    
    v_security_deposit := COALESCE(NEW.security_deposit_amount, 0);
    v_rental_amount := NEW.total_cost - v_security_deposit;
    v_commission := v_rental_amount * 0.10; -- 10% comisión AutoRenta
    v_owner_amount := v_rental_amount - v_commission;
    
    -- 1. Registrar depósito de garantía como provisión NIIF 37
    IF v_security_deposit > 0 THEN
      INSERT INTO accounting_provisions (
        provision_type, reference_id, reference_table,
        provision_amount, status, provision_date
      ) VALUES (
        'SECURITY_DEPOSIT', NEW.id, 'bookings',
        v_security_deposit, 'ACTIVE', NOW()
      );
      
      -- Asiento: Bloquear fondos de garantía
      -- DEBE: 2805 Depósitos de Clientes (disminuye pasivo billetera)
      -- HABER: 2810 Depósitos de Garantía Bloqueados (nuevo pasivo)
      v_entries := jsonb_build_array(
        jsonb_build_object(
          'account_code', '2805',
          'debit', v_security_deposit,
          'credit', 0,
          'description', 'Bloqueo de garantía de billetera'
        ),
        jsonb_build_object(
          'account_code', '2810',
          'debit', 0,
          'credit', v_security_deposit,
          'description', 'Depósito de garantía bloqueado NIIF 37'
        )
      );
      
      PERFORM create_journal_entry(
        'SECURITY_DEPOSIT_LOCK',
        NEW.id,
        'bookings',
        'Bloqueo de depósito de garantía - Booking ' || NEW.id,
        v_entries
      );
    END IF;
    
    -- 2. Registrar pago de alquiler
    -- DEBE: 2805 Depósitos de Clientes (disminuye saldo billetera)
    -- HABER: 4135 Ingreso por Comisiones (reconocer comisión - NIIF 15 agente)
    -- HABER: 2815 Pagos a Propietarios Pendientes (pasivo con owner)
    v_entries := jsonb_build_array(
      jsonb_build_object(
        'account_code', '2805',
        'debit', v_rental_amount,
        'credit', 0,
        'description', 'Consumo de saldo billetera para pago alquiler'
      ),
      jsonb_build_object(
        'account_code', '4135',
        'debit', 0,
        'credit', v_commission,
        'description', 'Comisión 10% reconocida - NIIF 15 rol agente'
      ),
      jsonb_build_object(
        'account_code', '2815',
        'debit', 0,
        'credit', v_owner_amount,
        'description', 'Pasivo pendiente a propietario'
      )
    );
    
    PERFORM create_journal_entry(
      'BOOKING_PAYMENT',
      NEW.id,
      'bookings',
      'Pago de alquiler - Comisión reconocida según NIIF 15',
      v_entries
    );
    
    -- 3. Registrar aporte al FGO (3% del rental)
    DECLARE
      v_fgo_amount DECIMAL(15, 2);
    BEGIN
      v_fgo_amount := v_rental_amount * 0.03; -- 3% al FGO
      
      INSERT INTO accounting_provisions (
        provision_type, reference_id, reference_table,
        provision_amount, status, provision_date
      ) VALUES (
        'FGO_RESERVE', NEW.id, 'bookings',
        v_fgo_amount, 'ACTIVE', NOW()
      );
      
      -- Asiento: Provisión FGO
      -- DEBE: 5205 Gastos por Provisión FGO
      -- HABER: 2905 Provisión FGO (aumenta reserva)
      v_entries := jsonb_build_array(
        jsonb_build_object(
          'account_code', '5205',
          'debit', v_fgo_amount,
          'credit', 0,
          'description', 'Gasto provisión 3% FGO - NIIF 37'
        ),
        jsonb_build_object(
          'account_code', '2905',
          'debit', 0,
          'credit', v_fgo_amount,
          'description', 'Incremento provisión FGO'
        )
      );
      
      PERFORM create_journal_entry(
        'FGO_PROVISION',
        NEW.id,
        'bookings',
        'Provisión FGO 3% - NIIF 37 Provisiones',
        v_entries
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_accounting_booking_created ON bookings;
CREATE TRIGGER trigger_accounting_booking_created
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION accounting_on_booking_created();

-- ===== TRIGGER: Contabilizar Finalización de Reserva =====
CREATE OR REPLACE FUNCTION accounting_on_booking_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_entries JSONB;
  v_security_deposit DECIMAL(15, 2);
  v_provision_id UUID;
BEGIN
  -- Al completar booking sin siniestros
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    
    v_security_deposit := COALESCE(NEW.security_deposit_amount, 0);
    
    IF v_security_deposit > 0 THEN
      -- Liberar depósito de garantía
      UPDATE accounting_provisions
      SET status = 'RELEASED', release_date = NOW()
      WHERE reference_id = NEW.id AND provision_type = 'SECURITY_DEPOSIT'
      RETURNING id INTO v_provision_id;
      
      -- Asiento: Devolver garantía
      -- DEBE: 2810 Depósitos de Garantía Bloqueados (disminuye)
      -- HABER: 2805 Depósitos de Clientes (aumenta saldo billetera)
      v_entries := jsonb_build_array(
        jsonb_build_object(
          'account_code', '2810',
          'debit', v_security_deposit,
          'credit', 0,
          'description', 'Liberación de depósito de garantía'
        ),
        jsonb_build_object(
          'account_code', '2805',
          'debit', 0,
          'credit', v_security_deposit,
          'description', 'Devolución a billetera usuario'
        )
      );
      
      PERFORM create_journal_entry(
        'SECURITY_DEPOSIT_RELEASE',
        NEW.id,
        'bookings',
        'Liberación depósito de garantía - Sin siniestros',
        v_entries
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_accounting_booking_completed ON bookings;
CREATE TRIGGER trigger_accounting_booking_completed
AFTER UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION accounting_on_booking_completed();

-- ===== TRIGGER: Contabilizar Retiro de Billetera =====
CREATE OR REPLACE FUNCTION accounting_on_wallet_withdrawal()
RETURNS TRIGGER AS $$
DECLARE
  v_entries JSONB;
  v_amount DECIMAL(15, 2);
BEGIN
  IF NEW.transaction_type = 'withdrawal' AND NEW.status = 'completed'
     AND (OLD IS NULL OR OLD.status != 'completed') THEN
    
    v_amount := NEW.amount;
    
    -- Asiento:
    -- DEBE: 2805 Depósitos de Clientes (disminuye pasivo)
    -- HABER: 1115 MercadoPago (disminuye activo - salida de fondos)
    v_entries := jsonb_build_array(
      jsonb_build_object(
        'account_code', '2805',
        'debit', v_amount,
        'credit', 0,
        'description', 'Reducción pasivo por retiro usuario'
      ),
      jsonb_build_object(
        'account_code', '1115',
        'debit', 0,
        'credit', v_amount,
        'description', 'Salida de fondos MercadoPago'
      )
    );
    
    PERFORM create_journal_entry(
      'WALLET_WITHDRAWAL',
      NEW.id,
      'wallet_transactions',
      'Retiro de billetera usuario',
      v_entries
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_accounting_wallet_withdrawal ON wallet_transactions;
CREATE TRIGGER trigger_accounting_wallet_withdrawal
AFTER INSERT OR UPDATE ON wallet_transactions
FOR EACH ROW EXECUTE FUNCTION accounting_on_wallet_withdrawal();

COMMENT ON FUNCTION create_journal_entry IS 'Función central para crear asientos contables automáticos con partida doble';
COMMENT ON FUNCTION accounting_on_wallet_deposit IS 'Contabiliza depósitos según NIIF 15 - Pasivo por contrato';
COMMENT ON FUNCTION accounting_on_booking_created IS 'Contabiliza pago de alquiler, comisión (agente) y provisión FGO';
COMMENT ON FUNCTION accounting_on_booking_completed IS 'Libera depósito de garantía al completar alquiler sin siniestros';
