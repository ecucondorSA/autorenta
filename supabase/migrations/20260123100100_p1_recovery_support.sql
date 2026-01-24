-- P1: Plan de Recuperación + Sistema de Soporte 24/7 con Playbooks
-- 1. Plan de recuperación escalonado (T+0h, T+2h, T+24h, T+48h)
-- 2. Sistema de tickets de soporte
-- 3. Playbooks por tipo de incidente
-- 4. Escalamiento automático

-- =============================================================================
-- 1. Estados de recuperación
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE recovery_status AS ENUM (
    'normal',           -- Todo OK
    'grace_period',     -- Dentro del período de gracia
    'contact_attempt',  -- Intentando contactar (T+0)
    'escalated_ops',    -- Escalado a operaciones (T+2h)
    'escalated_legal',  -- Escalado a legal (T+24h)
    'recovery_active',  -- Recuperación activa (T+48h)
    'recovered',        -- Vehículo recuperado
    'claim_filed'       -- Reclamo presentado
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. Tabla de casos de recuperación
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.recovery_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Estado
  status TEXT NOT NULL DEFAULT 'grace_period',
  severity TEXT NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'

  -- Razón de inicio
  trigger_reason TEXT NOT NULL, -- 'late_return', 'geofence_violation', 'no_contact', 'suspected_theft'
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timeline
  grace_period_ends_at TIMESTAMPTZ,
  escalation_t2h_at TIMESTAMPTZ,
  escalation_t24h_at TIMESTAMPTZ,
  escalation_t48h_at TIMESTAMPTZ,

  -- Intentos de contacto
  contact_attempts JSONB DEFAULT '[]', -- [{method, at, success, notes}]
  last_contact_attempt_at TIMESTAMPTZ,
  renter_responded BOOLEAN DEFAULT FALSE,
  renter_response_at TIMESTAMPTZ,

  -- Asignación
  assigned_to UUID REFERENCES auth.users(id),
  assigned_role TEXT, -- 'support', 'operations', 'legal'
  assigned_at TIMESTAMPTZ,

  -- Ubicación última conocida
  last_known_latitude DECIMAL(10, 7),
  last_known_longitude DECIMAL(10, 7),
  last_known_at TIMESTAMPTZ,

  -- Resolución
  resolved_at TIMESTAMPTZ,
  resolution_type TEXT, -- 'returned', 'recovered', 'claimed', 'cancelled'
  resolution_notes TEXT,

  -- Evidencia
  evidence_package_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_cases_booking ON recovery_cases(booking_id);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_status ON recovery_cases(status) WHERE status NOT IN ('recovered', 'claim_filed');
CREATE INDEX IF NOT EXISTS idx_recovery_cases_assigned ON recovery_cases(assigned_to) WHERE resolved_at IS NULL;

ALTER TABLE recovery_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view all recovery cases" ON recovery_cases;
CREATE POLICY "Staff can view all recovery cases"
  ON recovery_cases FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON c.id = b.car_id
      WHERE b.id = recovery_cases.booking_id
      AND c.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- 3. Sistema de Tickets de Soporte
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,

  -- Relaciones
  user_id UUID NOT NULL REFERENCES auth.users(id),
  booking_id UUID REFERENCES public.bookings(id),
  recovery_case_id UUID REFERENCES public.recovery_cases(id),

  -- Contenido
  category TEXT NOT NULL, -- 'incident', 'late_return', 'damage', 'battery', 'payment', 'general'
  subcategory TEXT,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

  -- Estado
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'waiting_user', 'waiting_internal', 'resolved', 'closed'

  -- Asignación
  assigned_to UUID REFERENCES auth.users(id),
  assigned_team TEXT, -- 'support', 'operations', 'finance', 'legal'
  sla_deadline_at TIMESTAMPTZ,

  -- Resolución
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,
  satisfaction_rating INTEGER, -- 1-5

  -- Metadata
  source TEXT DEFAULT 'app', -- 'app', 'web', 'phone', 'email', 'system'
  tags TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generar número de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(CAST(nextval('support_ticket_seq') AS TEXT), 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

DROP TRIGGER IF EXISTS trg_generate_ticket_number ON support_tickets;
CREATE TRIGGER trg_generate_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_booking ON support_tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to) WHERE status NOT IN ('resolved', 'closed');

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (user_id = auth.uid() OR assigned_to = auth.uid());

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Mensajes del ticket
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_role TEXT NOT NULL DEFAULT 'user', -- 'user', 'support', 'system'
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT FALSE, -- Notas internas no visibles al usuario
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages ON support_ticket_messages(ticket_id, created_at);

-- =============================================================================
-- 4. Playbooks de Soporte
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.support_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'incident', 'late_return', 'battery', 'damage', 'theft'
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playbook_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES public.support_playbooks(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  action_type TEXT NOT NULL, -- 'manual', 'notification', 'escalate', 'wait', 'check'
  action_config JSONB DEFAULT '{}',
  wait_duration_minutes INTEGER, -- Para steps tipo 'wait'
  escalate_to TEXT, -- Para steps tipo 'escalate'
  required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbook_steps ON playbook_steps(playbook_id, step_order);

-- Ejecución de playbooks
CREATE TABLE IF NOT EXISTS public.playbook_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES public.support_playbooks(id),
  ticket_id UUID REFERENCES public.support_tickets(id),
  recovery_case_id UUID REFERENCES public.recovery_cases(id),
  booking_id UUID REFERENCES public.bookings(id),

  -- Estado
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'paused', 'completed', 'failed', 'cancelled'
  current_step INTEGER DEFAULT 1,

  -- Historial de steps
  steps_completed JSONB DEFAULT '[]', -- [{step_id, completed_at, notes, completed_by}]

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. Insertar Playbooks predefinidos
-- =============================================================================

INSERT INTO support_playbooks (id, name, category, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Retorno Tardío', 'late_return', 'Protocolo para manejar retornos tardíos'),
  ('22222222-2222-2222-2222-222222222222', 'Accidente/Incidente', 'incident', 'Protocolo para accidentes o incidentes'),
  ('33333333-3333-3333-3333-333333333333', 'Batería Baja EV', 'battery', 'Protocolo para batería baja en vehículos eléctricos'),
  ('44444444-4444-4444-4444-444444444444', 'Daño Reportado', 'damage', 'Protocolo para daños reportados'),
  ('55555555-5555-5555-5555-555555555555', 'Sospecha de Robo', 'theft', 'Protocolo para sospecha de robo')
ON CONFLICT (name) DO NOTHING;

-- Playbook: Retorno Tardío
INSERT INTO playbook_steps (playbook_id, step_order, title, description, action_type, action_config, wait_duration_minutes, escalate_to) VALUES
  ('11111111-1111-1111-1111-111111111111', 1, 'Período de gracia', 'Esperar 30 minutos antes de contactar', 'wait', '{}', 30, NULL),
  ('11111111-1111-1111-1111-111111111111', 2, 'Notificación push', 'Enviar recordatorio al renter', 'notification', '{"template": "late_return_reminder", "channels": ["push", "sms"]}', NULL, NULL),
  ('11111111-1111-1111-1111-111111111111', 3, 'Esperar respuesta', 'Esperar 30 min para respuesta', 'wait', '{}', 30, NULL),
  ('11111111-1111-1111-1111-111111111111', 4, 'Llamada telefónica', 'Intentar contacto telefónico', 'manual', '{"instruction": "Llamar al renter al número registrado. Documentar resultado."}', NULL, NULL),
  ('11111111-1111-1111-1111-111111111111', 5, 'Notificar owner', 'Informar al owner del retraso', 'notification', '{"template": "late_return_owner", "channels": ["push", "email"]}', NULL, NULL),
  ('11111111-1111-1111-1111-111111111111', 6, 'Esperar T+2h', 'Esperar hasta 2 horas desde fin previsto', 'wait', '{}', 60, NULL),
  ('11111111-1111-1111-1111-111111111111', 7, 'Escalar a Operaciones', 'Escalar caso a equipo de operaciones', 'escalate', '{}', NULL, 'operations'),
  ('11111111-1111-1111-1111-111111111111', 8, 'Bloquear pagos pendientes', 'Retener cualquier pago o depósito', 'manual', '{"instruction": "Verificar depósito retenido. Aplicar cargo por mora si corresponde."}', NULL, NULL),
  ('11111111-1111-1111-1111-111111111111', 9, 'Esperar T+24h', 'Esperar 24 horas', 'wait', '{}', 1320, NULL),
  ('11111111-1111-1111-1111-111111111111', 10, 'Escalar a Legal', 'Escalar a departamento legal', 'escalate', '{}', NULL, 'legal'),
  ('11111111-1111-1111-1111-111111111111', 11, 'Preparar denuncia', 'Preparar documentación para denuncia', 'manual', '{"instruction": "Recopilar: contrato, KYC, historial GPS, evidencia fotográfica."}', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Playbook: Batería Baja EV
INSERT INTO playbook_steps (playbook_id, step_order, title, description, action_type, action_config) VALUES
  ('33333333-3333-3333-3333-333333333333', 1, 'Alerta al renter', 'Notificar nivel crítico de batería', 'notification', '{"template": "ev_battery_low", "channels": ["push"]}'),
  ('33333333-3333-3333-3333-333333333333', 2, 'Enviar mapa de cargadores', 'Compartir ubicaciones cercanas de carga', 'notification', '{"template": "ev_charger_locations", "channels": ["push"]}'),
  ('33333333-3333-3333-3333-333333333333', 3, 'Esperar 30 min', 'Dar tiempo para cargar', 'wait', '{"minutes": 30}'),
  ('33333333-3333-3333-3333-333333333333', 4, 'Verificar estado', 'Revisar si batería subió', 'check', '{"condition": "battery_soc > 20"}'),
  ('33333333-3333-3333-3333-333333333333', 5, 'Contactar renter', 'Llamar para asistir', 'manual', '{"instruction": "Si batería sigue crítica, ofrecer asistencia de carga."}'),
  ('33333333-3333-3333-3333-333333333333', 6, 'Documentar descarga profunda', 'Registrar evento para posible cargo', 'manual', '{"instruction": "Si SOC < 5%, documentar para cargo por daño a batería."}')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 6. Función para iniciar caso de recuperación
-- =============================================================================

CREATE OR REPLACE FUNCTION public.start_recovery_case(
  p_booking_id UUID,
  p_trigger_reason TEXT,
  p_severity TEXT DEFAULT 'medium'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_case_id UUID;
  v_booking RECORD;
  v_last_location RECORD;
  v_playbook_id UUID;
BEGIN
  -- Verificar que no existe caso activo
  IF EXISTS (
    SELECT 1 FROM recovery_cases
    WHERE booking_id = p_booking_id
    AND status NOT IN ('recovered', 'claim_filed')
  ) THEN
    SELECT id INTO v_case_id FROM recovery_cases WHERE booking_id = p_booking_id AND status NOT IN ('recovered', 'claim_filed');
    RETURN v_case_id;
  END IF;

  -- Obtener booking
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  -- Obtener última ubicación
  SELECT latitude, longitude, recorded_at INTO v_last_location
  FROM vehicle_location_history
  WHERE booking_id = p_booking_id
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Crear caso
  INSERT INTO recovery_cases (
    booking_id, status, severity, trigger_reason,
    grace_period_ends_at,
    escalation_t2h_at,
    escalation_t24h_at,
    escalation_t48h_at,
    last_known_latitude, last_known_longitude, last_known_at
  ) VALUES (
    p_booking_id,
    'grace_period',
    p_severity,
    p_trigger_reason,
    NOW() + INTERVAL '30 minutes',
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '24 hours',
    NOW() + INTERVAL '48 hours',
    v_last_location.latitude,
    v_last_location.longitude,
    v_last_location.recorded_at
  )
  RETURNING id INTO v_case_id;

  -- Crear ticket automático
  INSERT INTO support_tickets (
    user_id, booking_id, recovery_case_id,
    category, subject, description, priority, source
  ) VALUES (
    v_booking.renter_id,
    p_booking_id,
    v_case_id,
    p_trigger_reason,
    'Caso de recuperación: ' || p_trigger_reason,
    'Caso iniciado automáticamente por el sistema',
    CASE p_severity WHEN 'critical' THEN 'urgent' WHEN 'high' THEN 'high' ELSE 'medium' END,
    'system'
  );

  -- Iniciar playbook correspondiente
  SELECT id INTO v_playbook_id FROM support_playbooks WHERE category = p_trigger_reason AND is_active = TRUE LIMIT 1;

  IF v_playbook_id IS NOT NULL THEN
    INSERT INTO playbook_executions (playbook_id, recovery_case_id, booking_id)
    VALUES (v_playbook_id, v_case_id, p_booking_id);
  END IF;

  RETURN v_case_id;
END;
$$;

-- =============================================================================
-- 7. Función para avanzar en playbook
-- =============================================================================

CREATE OR REPLACE FUNCTION public.advance_playbook_step(
  p_execution_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_skip BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_execution RECORD;
  v_current_step RECORD;
  v_next_step RECORD;
  v_total_steps INTEGER;
BEGIN
  SELECT * INTO v_execution FROM playbook_executions WHERE id = p_execution_id;

  IF v_execution IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Execution not found');
  END IF;

  -- Obtener step actual
  SELECT * INTO v_current_step
  FROM playbook_steps
  WHERE playbook_id = v_execution.playbook_id AND step_order = v_execution.current_step;

  -- Registrar completación
  UPDATE playbook_executions SET
    steps_completed = steps_completed || jsonb_build_array(jsonb_build_object(
      'step_id', v_current_step.id,
      'step_order', v_current_step.step_order,
      'completed_at', NOW(),
      'completed_by', auth.uid(),
      'notes', p_notes,
      'skipped', p_skip
    )),
    current_step = v_execution.current_step + 1,
    updated_at = NOW()
  WHERE id = p_execution_id;

  -- Verificar si es el último step
  SELECT COUNT(*) INTO v_total_steps FROM playbook_steps WHERE playbook_id = v_execution.playbook_id;

  IF v_execution.current_step >= v_total_steps THEN
    UPDATE playbook_executions SET
      status = 'completed',
      completed_at = NOW()
    WHERE id = p_execution_id;

    RETURN jsonb_build_object('success', true, 'completed', true);
  END IF;

  -- Obtener siguiente step
  SELECT * INTO v_next_step
  FROM playbook_steps
  WHERE playbook_id = v_execution.playbook_id AND step_order = v_execution.current_step + 1;

  RETURN jsonb_build_object(
    'success', true,
    'completed', false,
    'next_step', jsonb_build_object(
      'order', v_next_step.step_order,
      'title', v_next_step.title,
      'action_type', v_next_step.action_type
    )
  );
END;
$$;

-- =============================================================================
-- 8. Cron job para procesar escalamientos automáticos
-- =============================================================================

CREATE OR REPLACE FUNCTION public.process_recovery_escalations()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_case RECORD;
BEGIN
  FOR v_case IN
    SELECT * FROM recovery_cases
    WHERE status NOT IN ('recovered', 'claim_filed')
  LOOP
    -- Escalar según tiempo
    IF v_case.status = 'grace_period' AND NOW() > v_case.grace_period_ends_at THEN
      UPDATE recovery_cases SET status = 'contact_attempt', updated_at = NOW() WHERE id = v_case.id;

      -- Notificar
      PERFORM create_tracking_alert(
        v_case.booking_id,
        'late_return',
        'warning',
        'Período de gracia terminado',
        'Se iniciará contacto con el conductor'
      );

    ELSIF v_case.status = 'contact_attempt' AND NOW() > v_case.escalation_t2h_at THEN
      UPDATE recovery_cases SET
        status = 'escalated_ops',
        assigned_role = 'operations',
        updated_at = NOW()
      WHERE id = v_case.id;

    ELSIF v_case.status = 'escalated_ops' AND NOW() > v_case.escalation_t24h_at THEN
      UPDATE recovery_cases SET
        status = 'escalated_legal',
        assigned_role = 'legal',
        severity = 'critical',
        updated_at = NOW()
      WHERE id = v_case.id;

    ELSIF v_case.status = 'escalated_legal' AND NOW() > v_case.escalation_t48h_at THEN
      UPDATE recovery_cases SET
        status = 'recovery_active',
        severity = 'critical',
        updated_at = NOW()
      WHERE id = v_case.id;
    END IF;
  END LOOP;
END;
$$;
