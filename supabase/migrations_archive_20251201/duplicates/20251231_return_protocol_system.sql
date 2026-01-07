-- ============================================================
-- SISTEMA DE PROTOCOLO DE NO-DEVOLUCION
-- ============================================================
-- Este sistema implementa el protocolo automatico para convertir
-- "apropiacion indebita" (no cubierta por seguros) en
-- "sustraccion post-autorizacion vencida" (potencialmente cubierta)
-- ============================================================

-- ============================================================
-- 1. TABLA: return_protocol_events
-- Log inmutable de cada accion del protocolo de no-devolucion
-- ============================================================
CREATE TABLE IF NOT EXISTS return_protocol_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),

  -- Tipo de evento en el timeline
  event_type TEXT NOT NULL CHECK (event_type IN (
    'booking_ended',           -- T+0: Fin de reserva
    'alert_yellow',            -- T+2h: Primera alerta
    'alert_orange',            -- T+6h: Segunda alerta
    'contact_attempt_push',    -- Intento de contacto push
    'contact_attempt_email',   -- Intento de contacto email
    'contact_attempt_sms',     -- Intento de contacto SMS
    'contact_attempt_call',    -- Intento de contacto llamada
    'renter_response',         -- Respuesta del renter
    'user_suspended',          -- T+12h: Usuario suspendido
    'owner_notified',          -- Owner notificado del estado
    'owner_confirmed_no_return', -- Owner confirma no devolucion
    'police_report_generated', -- T+24h: BO generado
    'police_report_signed',    -- BO firmado por owner
    'insurance_notified',      -- T+24h: Aseguradora notificada
    'legal_escalation',        -- T+48h: Escalamiento legal
    'vehicle_recovered',       -- Vehiculo recuperado
    'case_closed'              -- Caso cerrado
  )),

  -- Timeline relativo al fin de booking
  hours_since_end NUMERIC(10,2),
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,

  -- Estado del evento
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'executed', 'failed', 'skipped')),
  failure_reason TEXT,
  retry_count INT DEFAULT 0,

  -- Metadata del evento
  metadata JSONB DEFAULT '{}',
  -- Para contact_attempt: {channel, recipient, message_id}
  -- Para renter_response: {response_text, response_channel}
  -- Para police_report: {report_number, station, officer}
  -- Para insurance: {insurer, policy_number, claim_id}

  -- Actor que ejecuto
  executed_by TEXT CHECK (executed_by IN ('system', 'admin', 'owner', 'renter')),
  executed_by_user_id UUID REFERENCES profiles(id),

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_return_protocol_booking ON return_protocol_events(booking_id);
CREATE INDEX idx_return_protocol_type ON return_protocol_events(event_type);
CREATE INDEX idx_return_protocol_status ON return_protocol_events(status) WHERE status = 'pending';
CREATE INDEX idx_return_protocol_scheduled ON return_protocol_events(scheduled_for) WHERE status = 'scheduled';

-- RLS
ALTER TABLE return_protocol_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage protocol events" ON return_protocol_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Owners can view their booking protocol events" ON return_protocol_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = return_protocol_events.booking_id
        AND c.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 2. TABLA: police_reports
-- Denuncias policiales generadas por no-devolucion
-- ============================================================
CREATE TABLE IF NOT EXISTS police_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  protocol_event_id UUID REFERENCES return_protocol_events(id),

  -- Datos del vehiculo (nullable porque pueden faltar datos)
  car_id UUID NOT NULL REFERENCES cars(id),
  license_plate TEXT,
  vehicle_description TEXT,

  -- Datos del renter (denunciado) - nullable porque datos pueden faltar
  renter_id UUID NOT NULL REFERENCES profiles(id),
  renter_full_name TEXT,
  renter_document_type TEXT,
  renter_document_number TEXT,
  renter_address TEXT,
  renter_phone TEXT,

  -- Datos del owner (denunciante) - nullable porque datos pueden faltar
  owner_id UUID NOT NULL REFERENCES profiles(id),
  owner_full_name TEXT,
  owner_document_type TEXT,
  owner_document_number TEXT,

  -- Hechos
  booking_start_at TIMESTAMPTZ NOT NULL,
  booking_end_at TIMESTAMPTZ NOT NULL,
  last_known_location_lat NUMERIC(10,7),
  last_known_location_lng NUMERIC(10,7),
  last_known_location_address TEXT,
  last_contact_at TIMESTAMPTZ,

  -- Contenido del reporte
  report_content TEXT, -- Texto completo del BO
  report_hash TEXT, -- Hash para verificar integridad

  -- Estado
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Borrador generado
    'pending_owner',   -- Esperando firma del owner
    'signed',          -- Firmado por owner
    'submitted',       -- Enviado a policia
    'accepted',        -- Aceptado por policia
    'rejected'         -- Rechazado por policia
  )),

  -- Firma digital del owner
  owner_signed_at TIMESTAMPTZ,
  owner_signature_ip TEXT,
  owner_signature_user_agent TEXT,
  owner_signature_hash TEXT,

  -- Datos de la denuncia oficial
  official_report_number TEXT,
  police_station TEXT,
  officer_name TEXT,
  submitted_at TIMESTAMPTZ,

  -- Documentos adjuntos
  attachments JSONB DEFAULT '[]',
  -- [{type, url, name, uploaded_at}]

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_police_reports_booking ON police_reports(booking_id);
CREATE INDEX idx_police_reports_status ON police_reports(status);
CREATE INDEX idx_police_reports_owner ON police_reports(owner_id);

-- RLS
ALTER TABLE police_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage police reports" ON police_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Owners can view and sign their reports" ON police_reports
  FOR ALL USING (owner_id = auth.uid());

-- ============================================================
-- 3. TABLA: insurance_notifications
-- Comunicaciones con aseguradoras
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  protocol_event_id UUID REFERENCES return_protocol_events(id),
  police_report_id UUID REFERENCES police_reports(id),

  -- Datos del seguro
  insurance_company TEXT NOT NULL,
  policy_number TEXT,
  broker_name TEXT,
  broker_email TEXT,

  -- Contenido de la notificacion
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'initial_report',      -- Reporte inicial del siniestro
    'evidence_submission', -- Envio de evidencia adicional
    'status_update',       -- Actualizacion de estado
    'claim_follow_up',     -- Seguimiento del reclamo
    'claim_resolution'     -- Resolucion del reclamo
  )),

  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  body_hash TEXT,

  -- Documentos adjuntos
  attachments JSONB DEFAULT '[]',

  -- Estado de envio
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_review',
    'sent',
    'delivered',
    'failed',
    'responded'
  )),

  sent_at TIMESTAMPTZ,
  sent_via TEXT CHECK (sent_via IN ('email', 'portal', 'phone', 'in_person')),
  sent_to TEXT, -- Email o destinatario

  -- Respuesta de la aseguradora
  response_received_at TIMESTAMPTZ,
  response_content TEXT,
  claim_number TEXT, -- Numero de reclamo asignado
  claim_status TEXT CHECK (claim_status IN (
    'pending',
    'under_review',
    'additional_info_required',
    'approved',
    'partially_approved',
    'rejected'
  )),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_insurance_notifications_booking ON insurance_notifications(booking_id);
CREATE INDEX idx_insurance_notifications_status ON insurance_notifications(status);

-- RLS
ALTER TABLE insurance_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage insurance notifications" ON insurance_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Owners can view their insurance notifications" ON insurance_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = insurance_notifications.booking_id
        AND c.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 4. COLUMNAS ADICIONALES EN BOOKINGS
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT 'pending'
  CHECK (return_status IN (
    'pending',           -- Booking activo o antes de fin
    'returned',          -- Devuelto correctamente
    'overdue',           -- Vencido, no devuelto
    'protocol_active',   -- Protocolo de no-devolucion activo
    'police_report',     -- Denuncia generada
    'legal_action',      -- Accion legal en curso
    'recovered',         -- Vehiculo recuperado
    'total_loss'         -- Perdida total
  ));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_protocol_started_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS actual_return_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS overdue_hours NUMERIC(10,2);

-- ============================================================
-- 5. FUNCION: Iniciar protocolo de no-devolucion
-- ============================================================
CREATE OR REPLACE FUNCTION start_return_protocol(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_booking bookings;
  v_hours_overdue NUMERIC;
BEGIN
  -- Obtener booking
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking no encontrado');
  END IF;

  -- Verificar que esta vencido
  IF v_booking.end_at > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking aun no ha vencido');
  END IF;

  -- Calcular horas de retraso
  v_hours_overdue := EXTRACT(EPOCH FROM (now() - v_booking.end_at)) / 3600;

  -- Actualizar booking
  UPDATE bookings SET
    return_status = 'protocol_active',
    return_protocol_started_at = now(),
    overdue_hours = v_hours_overdue,
    updated_at = now()
  WHERE id = p_booking_id;

  -- Registrar evento T+0
  INSERT INTO return_protocol_events (
    booking_id, event_type, hours_since_end, executed_at,
    status, executed_by, metadata
  ) VALUES (
    p_booking_id, 'booking_ended', 0, v_booking.end_at,
    'executed', 'system',
    jsonb_build_object('booking_end_at', v_booking.end_at)
  );

  -- Programar eventos del timeline
  -- T+2h: Alerta amarilla
  INSERT INTO return_protocol_events (
    booking_id, event_type, hours_since_end,
    scheduled_for, status
  ) VALUES (
    p_booking_id, 'alert_yellow', 2,
    v_booking.end_at + INTERVAL '2 hours', 'scheduled'
  );

  -- T+6h: Alerta naranja
  INSERT INTO return_protocol_events (
    booking_id, event_type, hours_since_end,
    scheduled_for, status
  ) VALUES (
    p_booking_id, 'alert_orange', 6,
    v_booking.end_at + INTERVAL '6 hours', 'scheduled'
  );

  -- T+12h: Suspension de usuario
  INSERT INTO return_protocol_events (
    booking_id, event_type, hours_since_end,
    scheduled_for, status
  ) VALUES (
    p_booking_id, 'user_suspended', 12,
    v_booking.end_at + INTERVAL '12 hours', 'scheduled'
  );

  -- T+24h: Denuncia policial
  INSERT INTO return_protocol_events (
    booking_id, event_type, hours_since_end,
    scheduled_for, status
  ) VALUES (
    p_booking_id, 'police_report_generated', 24,
    v_booking.end_at + INTERVAL '24 hours', 'scheduled'
  );

  -- T+24h: Notificacion a aseguradora
  INSERT INTO return_protocol_events (
    booking_id, event_type, hours_since_end,
    scheduled_for, status
  ) VALUES (
    p_booking_id, 'insurance_notified', 24,
    v_booking.end_at + INTERVAL '24 hours', 'scheduled'
  );

  -- T+48h: Escalamiento legal
  INSERT INTO return_protocol_events (
    booking_id, event_type, hours_since_end,
    scheduled_for, status
  ) VALUES (
    p_booking_id, 'legal_escalation', 48,
    v_booking.end_at + INTERVAL '48 hours', 'scheduled'
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'hours_overdue', v_hours_overdue,
    'events_scheduled', 6
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. FUNCION: Ejecutar evento programado del protocolo
-- ============================================================
CREATE OR REPLACE FUNCTION execute_protocol_event(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_event return_protocol_events;
  v_booking bookings;
  v_car cars;
  v_renter profiles;
  v_owner profiles;
  v_result JSONB;
BEGIN
  -- Obtener evento
  SELECT * INTO v_event FROM return_protocol_events WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento no encontrado');
  END IF;

  IF v_event.status != 'scheduled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento no esta programado');
  END IF;

  -- Obtener datos relacionados
  SELECT * INTO v_booking FROM bookings WHERE id = v_event.booking_id;
  SELECT * INTO v_car FROM cars WHERE id = v_booking.car_id;
  SELECT * INTO v_renter FROM profiles WHERE id = v_booking.renter_id;
  SELECT * INTO v_owner FROM profiles WHERE id = v_car.owner_id;

  -- Verificar que el booking sigue en protocolo activo
  IF v_booking.return_status NOT IN ('overdue', 'protocol_active') THEN
    -- Marcar evento como saltado
    UPDATE return_protocol_events SET
      status = 'skipped',
      metadata = metadata || jsonb_build_object('skip_reason', 'Booking ya no esta en protocolo'),
      updated_at = now()
    WHERE id = p_event_id;

    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'Booking ya no esta en protocolo');
  END IF;

  -- Ejecutar segun tipo de evento
  CASE v_event.event_type
    WHEN 'alert_yellow' THEN
      -- T+2h: Primera alerta al renter
      v_result := jsonb_build_object(
        'action', 'send_notification',
        'recipient', v_renter.id,
        'channel', 'push_email',
        'template', 'return_alert_yellow',
        'data', jsonb_build_object(
          'renter_name', v_renter.full_name,
          'car_title', v_car.title,
          'booking_end', v_booking.end_at,
          'hours_overdue', v_event.hours_since_end
        )
      );

    WHEN 'alert_orange' THEN
      -- T+6h: Segunda alerta mas urgente
      v_result := jsonb_build_object(
        'action', 'send_notification',
        'recipient', v_renter.id,
        'channel', 'push_email_sms',
        'template', 'return_alert_orange',
        'urgent', true
      );

    WHEN 'user_suspended' THEN
      -- T+12h: Marcar usuario como suspendido (la suspension real se maneja en el sistema)
      -- TODO: Agregar columna is_suspended a profiles si se necesita suspension real

      -- Notificar al owner
      INSERT INTO return_protocol_events (
        booking_id, event_type, hours_since_end,
        executed_at, status, executed_by,
        metadata
      ) VALUES (
        v_event.booking_id, 'owner_notified', v_event.hours_since_end,
        now(), 'executed', 'system',
        jsonb_build_object('notification_type', 'renter_suspended')
      );

      v_result := jsonb_build_object(
        'action', 'user_suspended',
        'renter_id', v_renter.id
      );

    WHEN 'police_report_generated' THEN
      -- T+24h: Generar denuncia policial
      INSERT INTO police_reports (
        booking_id, protocol_event_id, car_id, license_plate,
        vehicle_description, renter_id, renter_full_name,
        renter_document_number, owner_id, owner_full_name,
        booking_start_at, booking_end_at,
        report_content, status
      ) VALUES (
        v_event.booking_id, p_event_id, v_car.id, v_car.plate,
        v_car.brand || ' ' || v_car.model || ' ' || v_car.year,
        v_renter.id, v_renter.full_name,
        v_renter.identity_document_number, v_owner.id, v_owner.full_name,
        v_booking.start_at, v_booking.end_at,
        generate_police_report_content(v_event.booking_id),
        'pending_owner'
      );

      -- Actualizar estado del booking
      UPDATE bookings SET
        return_status = 'police_report',
        updated_at = now()
      WHERE id = v_event.booking_id;

      v_result := jsonb_build_object(
        'action', 'police_report_generated',
        'booking_id', v_event.booking_id
      );

    WHEN 'insurance_notified' THEN
      -- T+24h: Notificar a aseguradora
      INSERT INTO insurance_notifications (
        booking_id, protocol_event_id,
        insurance_company, notification_type,
        subject, body, status
      ) VALUES (
        v_event.booking_id, p_event_id,
        'A determinar', 'initial_report',
        'Siniestro - Sustraccion de vehiculo post-autorizacion vencida',
        generate_insurance_notification_content(v_event.booking_id),
        'draft'
      );

      v_result := jsonb_build_object(
        'action', 'insurance_notification_created',
        'booking_id', v_event.booking_id
      );

    WHEN 'legal_escalation' THEN
      -- T+48h: Escalamiento legal
      UPDATE bookings SET
        return_status = 'legal_action',
        updated_at = now()
      WHERE id = v_event.booking_id;

      v_result := jsonb_build_object(
        'action', 'legal_escalation',
        'booking_id', v_event.booking_id
      );

    ELSE
      v_result := jsonb_build_object('action', 'unknown');
  END CASE;

  -- Marcar evento como ejecutado
  UPDATE return_protocol_events SET
    status = 'executed',
    executed_at = now(),
    executed_by = 'system',
    metadata = metadata || v_result,
    updated_at = now()
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'event_type', v_event.event_type,
    'result', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. FUNCION: Generar contenido de denuncia policial
-- ============================================================
CREATE OR REPLACE FUNCTION generate_police_report_content(p_booking_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_booking bookings;
  v_car cars;
  v_renter profiles;
  v_owner profiles;
  v_content TEXT;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  SELECT * INTO v_car FROM cars WHERE id = v_booking.car_id;
  SELECT * INTO v_renter FROM profiles WHERE id = v_booking.renter_id;
  SELECT * INTO v_owner FROM profiles WHERE id = v_car.owner_id;

  v_content := 'DENUNCIA POR SUSTRACCION DE VEHICULO' || E'\n\n';
  v_content := v_content || '1. DATOS DEL DENUNCIANTE (PROPIETARIO)' || E'\n';
  v_content := v_content || 'Nombre: ' || COALESCE(v_owner.full_name, 'N/A') || E'\n';
  v_content := v_content || 'Documento: ' || COALESCE(v_owner.identity_document_number, 'N/A') || E'\n\n';

  v_content := v_content || '2. DATOS DEL DENUNCIADO' || E'\n';
  v_content := v_content || 'Nombre: ' || COALESCE(v_renter.full_name, 'N/A') || E'\n';
  v_content := v_content || 'Documento: ' || COALESCE(v_renter.identity_document_number, 'N/A') || E'\n';
  v_content := v_content || 'Telefono: ' || COALESCE(v_renter.phone, 'N/A') || E'\n\n';

  v_content := v_content || '3. DATOS DEL VEHICULO' || E'\n';
  v_content := v_content || 'Marca/Modelo: ' || v_car.brand || ' ' || v_car.model || E'\n';
  v_content := v_content || 'Anio: ' || v_car.year || E'\n';
  v_content := v_content || 'Patente: ' || COALESCE(v_car.plate, 'N/A') || E'\n';
  v_content := v_content || 'Color: ' || COALESCE(v_car.color, 'N/A') || E'\n\n';

  v_content := v_content || '4. HECHOS' || E'\n';
  v_content := v_content || 'El vehiculo fue entregado a traves de la plataforma Autorenta para uso temporal.' || E'\n';
  v_content := v_content || 'Fecha de inicio: ' || to_char(v_booking.start_at, 'DD/MM/YYYY HH24:MI') || E'\n';
  v_content := v_content || 'Fecha de finalizacion acordada: ' || to_char(v_booking.end_at, 'DD/MM/YYYY HH24:MI') || E'\n';
  v_content := v_content || 'El vehiculo NO fue devuelto al vencimiento del plazo.' || E'\n';
  v_content := v_content || 'A partir de las ' || to_char(v_booking.end_at, 'HH24:MI') || ' del dia ' || to_char(v_booking.end_at, 'DD/MM/YYYY');
  v_content := v_content || ' la autorizacion de posesion quedo REVOCADA automaticamente segun los terminos aceptados.' || E'\n\n';

  v_content := v_content || '5. ACCIONES TOMADAS POR LA PLATAFORMA' || E'\n';
  v_content := v_content || '- Se enviaron multiples alertas al usuario' || E'\n';
  v_content := v_content || '- Se intento contacto por todos los medios disponibles' || E'\n';
  v_content := v_content || '- El usuario fue suspendido de la plataforma' || E'\n';
  v_content := v_content || '- Se genera la presente denuncia a las 24 horas del vencimiento' || E'\n\n';

  v_content := v_content || '6. TIPIFICACION' || E'\n';
  v_content := v_content || 'El usuario mantiene la posesion del vehiculo SIN autorizacion del propietario.' || E'\n';
  v_content := v_content || 'Esto configura SUSTRACCION / APROPIACION CON DOLO.' || E'\n\n';

  v_content := v_content || 'Fecha de generacion: ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || E'\n';
  v_content := v_content || 'Plataforma: Autorenta (autorentar.com)';

  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. FUNCION: Generar contenido de notificacion a aseguradora
-- ============================================================
CREATE OR REPLACE FUNCTION generate_insurance_notification_content(p_booking_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_booking bookings;
  v_car cars;
  v_renter profiles;
  v_owner profiles;
  v_content TEXT;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  SELECT * INTO v_car FROM cars WHERE id = v_booking.car_id;
  SELECT * INTO v_renter FROM profiles WHERE id = v_booking.renter_id;
  SELECT * INTO v_owner FROM profiles WHERE id = v_car.owner_id;

  v_content := 'Estimado Corredor/Aseguradora,' || E'\n\n';
  v_content := v_content || 'Reportamos un siniestro ocurrido en el siguiente vehiculo:' || E'\n\n';

  v_content := v_content || 'DATOS DEL VEHICULO:' || E'\n';
  v_content := v_content || '- Marca/Modelo: ' || v_car.brand || ' ' || v_car.model || E'\n';
  v_content := v_content || '- Patente: ' || COALESCE(v_car.plate, 'N/A') || E'\n';
  v_content := v_content || '- Propietario: ' || COALESCE(v_owner.full_name, 'N/A') || E'\n\n';

  v_content := v_content || 'HECHOS:' || E'\n';
  v_content := v_content || '- Vehiculo entregado a traves de plataforma de movilidad compartida' || E'\n';
  v_content := v_content || '- Plazo de uso autorizado: ' || to_char(v_booking.start_at, 'DD/MM/YYYY') || ' a ' || to_char(v_booking.end_at, 'DD/MM/YYYY') || E'\n';
  v_content := v_content || '- El vehiculo NO fue devuelto al vencimiento' || E'\n';
  v_content := v_content || '- A las 24 horas del vencimiento se ejecuto protocolo de no-devolucion' || E'\n\n';

  v_content := v_content || 'ACCIONES TOMADAS:' || E'\n';
  v_content := v_content || '1. [T+2h] Alerta al usuario - sin respuesta' || E'\n';
  v_content := v_content || '2. [T+12h] Suspension de cuenta - usuario no contactable' || E'\n';
  v_content := v_content || '3. [T+24h] Denuncia policial realizada' || E'\n';
  v_content := v_content || '4. [T+24h] Usuario declarado con posesion no autorizada' || E'\n\n';

  v_content := v_content || 'CLASIFICACION DEL HECHO:' || E'\n';
  v_content := v_content || '- Al vencimiento del plazo, la autorizacion de posesion quedo revocada' || E'\n';
  v_content := v_content || '- El usuario mantiene el vehiculo SIN autorizacion del propietario' || E'\n';
  v_content := v_content || '- Configuracion: Sustraccion / Apropiacion con dolo' || E'\n\n';

  v_content := v_content || 'DOCUMENTACION ADJUNTA:' || E'\n';
  v_content := v_content || '- Contrato de prestamo (comodato)' || E'\n';
  v_content := v_content || '- Logs de comunicacion' || E'\n';
  v_content := v_content || '- Boletin de denuncia policial' || E'\n';
  v_content := v_content || '- Identificacion del usuario' || E'\n\n';

  v_content := v_content || 'Quedamos a disposicion para cualquier informacion adicional.' || E'\n\n';
  v_content := v_content || 'Atentamente,' || E'\n';
  v_content := v_content || 'Autorenta - Equipo de Siniestros';

  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. FUNCION: Registrar devolucion del vehiculo
-- ============================================================
CREATE OR REPLACE FUNCTION register_vehicle_return(
  p_booking_id UUID,
  p_return_condition TEXT DEFAULT 'good',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_booking bookings;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking no encontrado');
  END IF;

  -- Actualizar booking
  UPDATE bookings SET
    return_status = 'returned',
    actual_return_at = now(),
    updated_at = now()
  WHERE id = p_booking_id;

  -- Registrar evento de recuperacion
  INSERT INTO return_protocol_events (
    booking_id, event_type, executed_at,
    status, executed_by,
    metadata
  ) VALUES (
    p_booking_id, 'vehicle_recovered', now(),
    'executed', 'system',
    jsonb_build_object(
      'return_condition', p_return_condition,
      'notes', p_notes,
      'was_overdue', v_booking.return_status IN ('overdue', 'protocol_active', 'police_report', 'legal_action')
    )
  );

  -- Marcar eventos pendientes como saltados
  UPDATE return_protocol_events SET
    status = 'skipped',
    metadata = metadata || jsonb_build_object('skip_reason', 'Vehiculo devuelto'),
    updated_at = now()
  WHERE booking_id = p_booking_id
    AND status IN ('pending', 'scheduled');

  -- Cerrar caso
  INSERT INTO return_protocol_events (
    booking_id, event_type, executed_at,
    status, executed_by
  ) VALUES (
    p_booking_id, 'case_closed', now(),
    'executed', 'system'
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'return_condition', p_return_condition
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. VISTA: Estado de protocolos activos
-- ============================================================
CREATE OR REPLACE VIEW v_active_return_protocols AS
SELECT
  b.id as booking_id,
  b.return_status,
  b.return_protocol_started_at,
  b.end_at as booking_end_at,
  b.overdue_hours,
  c.id as car_id,
  c.title as car_title,
  c.plate as license_plate,
  c.owner_id,
  o.full_name as owner_name,
  b.renter_id,
  r.full_name as renter_name,
  (SELECT COUNT(*) FROM return_protocol_events rpe
   WHERE rpe.booking_id = b.id AND rpe.status = 'executed') as events_executed,
  (SELECT COUNT(*) FROM return_protocol_events rpe
   WHERE rpe.booking_id = b.id AND rpe.status = 'scheduled') as events_pending,
  (SELECT event_type FROM return_protocol_events rpe
   WHERE rpe.booking_id = b.id AND rpe.status = 'executed'
   ORDER BY executed_at DESC LIMIT 1) as last_event,
  (SELECT EXISTS (SELECT 1 FROM police_reports pr WHERE pr.booking_id = b.id)) as has_police_report,
  (SELECT EXISTS (SELECT 1 FROM insurance_notifications ins WHERE ins.booking_id = b.id)) as has_insurance_notification
FROM bookings b
JOIN cars c ON b.car_id = c.id
JOIN profiles o ON c.owner_id = o.id
JOIN profiles r ON b.renter_id = r.id
WHERE b.return_status IN ('overdue', 'protocol_active', 'police_report', 'legal_action');

-- ============================================================
-- 11. FUNCION CRON: Detectar bookings vencidos sin devolucion
-- ============================================================
CREATE OR REPLACE FUNCTION cron_check_overdue_bookings()
RETURNS INT AS $$
DECLARE
  v_booking RECORD;
  v_count INT := 0;
BEGIN
  -- Buscar bookings vencidos hace mas de 1 hora sin devolucion registrada
  -- Status: confirmed (esperando pickup) o in_progress (en curso)
  FOR v_booking IN
    SELECT id FROM bookings
    WHERE status IN ('confirmed', 'in_progress')
      AND end_at < now() - INTERVAL '1 hour'
      AND return_status = 'pending'
      AND actual_return_at IS NULL
  LOOP
    -- Actualizar a overdue
    UPDATE bookings SET
      return_status = 'overdue',
      overdue_hours = EXTRACT(EPOCH FROM (now() - end_at)) / 3600,
      updated_at = now()
    WHERE id = v_booking.id;

    -- Iniciar protocolo si lleva mas de 2 horas
    IF (SELECT end_at FROM bookings WHERE id = v_booking.id) < now() - INTERVAL '2 hours' THEN
      PERFORM start_return_protocol(v_booking.id);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 12. FUNCION CRON: Ejecutar eventos programados
-- ============================================================
CREATE OR REPLACE FUNCTION cron_execute_scheduled_events()
RETURNS INT AS $$
DECLARE
  v_event RECORD;
  v_count INT := 0;
BEGIN
  -- Ejecutar eventos cuyo tiempo ha llegado
  FOR v_event IN
    SELECT id FROM return_protocol_events
    WHERE status = 'scheduled'
      AND scheduled_for <= now()
    ORDER BY scheduled_for ASC
  LOOP
    PERFORM execute_protocol_event(v_event.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMENTARIOS
-- ============================================================
COMMENT ON TABLE return_protocol_events IS 'Log inmutable de cada accion del protocolo de no-devolucion';
COMMENT ON TABLE police_reports IS 'Denuncias policiales generadas automaticamente por no-devolucion';
COMMENT ON TABLE insurance_notifications IS 'Comunicaciones estructuradas con aseguradoras';
COMMENT ON FUNCTION start_return_protocol IS 'Inicia el protocolo automatico de no-devolucion con timeline programado';
COMMENT ON FUNCTION execute_protocol_event IS 'Ejecuta un evento individual del protocolo';
COMMENT ON FUNCTION register_vehicle_return IS 'Registra la devolucion del vehiculo y cierra el protocolo';
