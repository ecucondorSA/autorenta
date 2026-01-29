-- Migration: Email Marketing & Lead Nurturing System
-- Purpose: Automated email sequences for welcome, re-engagement, and newsletters
-- Created: 2026-01-17

-- ============================================================================
-- 1. EMAIL SEQUENCES TABLE (Definición de secuencias)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- 'welcome-owner', 'welcome-renter', 're-engagement', 'newsletter'
  description TEXT,

  -- Configuración
  sequence_type TEXT NOT NULL CHECK (sequence_type IN (
    'welcome',           -- Secuencia de bienvenida
    're_engagement',     -- Recuperar usuarios inactivos
    'newsletter',        -- Newsletter recurrente
    'transactional',     -- Emails transaccionales
    'promotional'        -- Promociones específicas
  )),

  target_audience TEXT NOT NULL CHECK (target_audience IN ('owners', 'renters', 'all')),

  -- Estado
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Configuración de envío
  send_time_utc TIME, -- Hora preferida de envío (null = inmediato)
  timezone TEXT DEFAULT 'America/Guayaquil',

  -- Métricas agregadas (actualizadas por trigger)
  total_subscribers INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_email_sequences_slug ON public.email_sequences(slug);
CREATE INDEX idx_email_sequences_type ON public.email_sequences(sequence_type);
CREATE INDEX idx_email_sequences_active ON public.email_sequences(is_active);

-- ============================================================================
-- 2. EMAIL SEQUENCE STEPS TABLE (Pasos de cada secuencia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relación
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,

  -- Orden y timing
  step_number INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0, -- Días de espera desde el paso anterior (0 = inmediato)
  delay_hours INTEGER NOT NULL DEFAULT 0, -- Horas adicionales de espera

  -- Contenido
  subject TEXT NOT NULL,
  preview_text TEXT, -- Preview text para email clients

  -- Template (Resend template o HTML)
  template_id TEXT, -- ID de template en Resend (opcional)
  html_content TEXT, -- HTML directo (si no usa template)

  -- Variables disponibles: {{first_name}}, {{email}}, {{user_type}}, {{days_inactive}}, etc.

  -- Condiciones de envío
  send_conditions JSONB DEFAULT '{}', -- Ej: {"min_days_inactive": 30, "has_booking": false}

  -- Estado
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Métricas del paso
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(sequence_id, step_number)
);

-- Índices
CREATE INDEX idx_email_sequence_steps_sequence ON public.email_sequence_steps(sequence_id);
CREATE INDEX idx_email_sequence_steps_active ON public.email_sequence_steps(is_active);

-- ============================================================================
-- 3. EMAIL SUBSCRIBERS TABLE (Suscriptores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Usuario (puede ser null para leads externos)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Datos de contacto
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,

  -- Segmentación
  user_type TEXT CHECK (user_type IN ('owner', 'renter', 'lead', 'unknown')),
  source TEXT, -- 'signup', 'landing_page', 'referral', 'import', etc.
  source_campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,

  -- Estado de suscripción
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',       -- Recibe emails
    'unsubscribed', -- Se dio de baja
    'bounced',      -- Email rebotó
    'complained',   -- Marcó como spam
    'cleaned'       -- Limpiado por inactividad
  )),

  -- Preferencias
  preferences JSONB DEFAULT '{
    "newsletter": true,
    "promotions": true,
    "transactional": true
  }',

  -- Tracking
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  last_email_opened_at TIMESTAMP WITH TIME ZONE,
  last_email_clicked_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE, -- Última actividad en la plataforma

  -- Métricas
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,

  -- Secuencias activas
  active_sequences JSONB DEFAULT '[]', -- [{"sequence_id": "...", "current_step": 1, "started_at": "..."}]

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(email)
);

-- Índices
CREATE INDEX idx_email_subscribers_email ON public.email_subscribers(email);
CREATE INDEX idx_email_subscribers_user_id ON public.email_subscribers(user_id);
CREATE INDEX idx_email_subscribers_status ON public.email_subscribers(status);
CREATE INDEX idx_email_subscribers_user_type ON public.email_subscribers(user_type);
CREATE INDEX idx_email_subscribers_last_activity ON public.email_subscribers(last_activity_at);

-- ============================================================================
-- 4. EMAIL SENDS TABLE (Log de emails enviados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE SET NULL,
  step_id UUID REFERENCES public.email_sequence_steps(id) ON DELETE SET NULL,

  -- Destino
  to_email TEXT NOT NULL,

  -- Contenido enviado
  subject TEXT NOT NULL,

  -- Proveedor (Resend)
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT, -- ID del mensaje en Resend

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- En cola
    'sent',       -- Enviado a Resend
    'delivered',  -- Entregado al destinatario
    'opened',     -- Abierto
    'clicked',    -- Click en algún link
    'bounced',    -- Rebotó
    'complained', -- Marcado como spam
    'failed'      -- Error de envío
  )),

  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Variables usadas, user agent, IP, etc.
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_email_sends_subscriber ON public.email_sends(subscriber_id);
CREATE INDEX idx_email_sends_sequence ON public.email_sends(sequence_id);
CREATE INDEX idx_email_sends_status ON public.email_sends(status);
CREATE INDEX idx_email_sends_sent_at ON public.email_sends(sent_at);
CREATE INDEX idx_email_sends_provider_id ON public.email_sends(provider_message_id);

-- ============================================================================
-- 5. EMAIL EVENTS TABLE (Eventos de tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relación
  send_id UUID NOT NULL REFERENCES public.email_sends(id) ON DELETE CASCADE,

  -- Evento
  event_type TEXT NOT NULL CHECK (event_type IN (
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'complained',
    'unsubscribed'
  )),

  -- Detalles
  link_url TEXT, -- URL clickeada (para eventos 'clicked')
  user_agent TEXT,
  ip_address INET,

  -- Metadata del webhook
  raw_payload JSONB,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_email_events_send ON public.email_events(send_id);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_created ON public.email_events(created_at);

-- ============================================================================
-- 6. NEWSLETTER EDITIONS TABLE (Ediciones de newsletter)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.newsletter_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  title TEXT NOT NULL,
  edition_number INTEGER NOT NULL,

  -- Contenido
  subject TEXT NOT NULL,
  preview_text TEXT,
  html_content TEXT NOT NULL,

  -- Segmentación
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('owners', 'renters', 'all')),

  -- Estado
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent')),

  -- Programación
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Métricas
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_newsletter_editions_status ON public.newsletter_editions(status);
CREATE INDEX idx_newsletter_editions_scheduled ON public.newsletter_editions(scheduled_at);

-- ============================================================================
-- 7. VIEWS ÚTILES
-- ============================================================================

-- Vista: Suscriptores inactivos para re-engagement
CREATE OR REPLACE VIEW public.v_inactive_subscribers AS
SELECT
  s.*,
  EXTRACT(DAY FROM (now() - COALESCE(s.last_activity_at, s.created_at))) as days_inactive,
  p.full_name as profile_name,
  p.role as profile_role
FROM public.email_subscribers s
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE s.status = 'active'
  AND s.last_activity_at < now() - INTERVAL '30 days'
ORDER BY s.last_activity_at ASC;

-- Vista: Performance de secuencias
CREATE OR REPLACE VIEW public.v_sequence_performance AS
SELECT
  seq.id,
  seq.name,
  seq.slug,
  seq.sequence_type,
  seq.target_audience,
  seq.is_active,
  seq.total_subscribers,
  seq.total_sent,
  seq.total_opened,
  seq.total_clicked,
  CASE WHEN seq.total_sent > 0
    THEN ROUND((seq.total_opened::DECIMAL / seq.total_sent) * 100, 2)
    ELSE 0
  END as open_rate,
  CASE WHEN seq.total_opened > 0
    THEN ROUND((seq.total_clicked::DECIMAL / seq.total_opened) * 100, 2)
    ELSE 0
  END as click_rate,
  (SELECT COUNT(*) FROM public.email_sequence_steps WHERE sequence_id = seq.id AND is_active = true) as active_steps
FROM public.email_sequences seq;

-- ============================================================================
-- 8. FUNCIONES RPC
-- ============================================================================

-- Función: Agregar suscriptor a secuencia
CREATE OR REPLACE FUNCTION public.add_subscriber_to_sequence(
  p_subscriber_id UUID,
  p_sequence_slug TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sequence_id UUID;
  v_current_sequences JSONB;
  v_new_entry JSONB;
BEGIN
  -- Obtener sequence_id
  SELECT id INTO v_sequence_id
  FROM public.email_sequences
  WHERE slug = p_sequence_slug AND is_active = true;

  IF v_sequence_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sequence not found or inactive');
  END IF;

  -- Obtener secuencias activas del suscriptor
  SELECT active_sequences INTO v_current_sequences
  FROM public.email_subscribers
  WHERE id = p_subscriber_id;

  -- Verificar si ya está en la secuencia
  IF v_current_sequences @> jsonb_build_array(jsonb_build_object('sequence_id', v_sequence_id::TEXT)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in sequence');
  END IF;

  -- Crear nueva entrada
  v_new_entry := jsonb_build_object(
    'sequence_id', v_sequence_id::TEXT,
    'current_step', 1,
    'started_at', now()::TEXT
  );

  -- Actualizar suscriptor
  UPDATE public.email_subscribers
  SET
    active_sequences = COALESCE(active_sequences, '[]'::JSONB) || v_new_entry,
    updated_at = now()
  WHERE id = p_subscriber_id;

  -- Incrementar contador de secuencia
  UPDATE public.email_sequences
  SET total_subscribers = total_subscribers + 1
  WHERE id = v_sequence_id;

  RETURN jsonb_build_object('success', true, 'sequence_id', v_sequence_id);
END;
$$;

-- Función: Obtener siguiente email a enviar para un suscriptor
CREATE OR REPLACE FUNCTION public.get_next_email_for_subscriber(
  p_subscriber_id UUID
) RETURNS TABLE (
  sequence_id UUID,
  step_id UUID,
  step_number INTEGER,
  subject TEXT,
  template_id TEXT,
  html_content TEXT,
  delay_met BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscriber RECORD;
  v_sequence JSONB;
  v_seq_id UUID;
  v_current_step INTEGER;
  v_started_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obtener datos del suscriptor
  SELECT * INTO v_subscriber
  FROM public.email_subscribers
  WHERE id = p_subscriber_id AND status = 'active';

  IF v_subscriber IS NULL THEN
    RETURN;
  END IF;

  -- Iterar sobre secuencias activas
  FOR v_sequence IN SELECT * FROM jsonb_array_elements(v_subscriber.active_sequences)
  LOOP
    v_seq_id := (v_sequence->>'sequence_id')::UUID;
    v_current_step := (v_sequence->>'current_step')::INTEGER;
    v_started_at := (v_sequence->>'started_at')::TIMESTAMP WITH TIME ZONE;

    -- Obtener el paso actual
    RETURN QUERY
    SELECT
      v_seq_id,
      s.id,
      s.step_number,
      s.subject,
      s.template_id,
      s.html_content,
      -- Verificar si el delay ya se cumplió
      (now() >= v_started_at + (s.delay_days || ' days')::INTERVAL + (s.delay_hours || ' hours')::INTERVAL) as delay_met
    FROM public.email_sequence_steps s
    WHERE s.sequence_id = v_seq_id
      AND s.step_number = v_current_step
      AND s.is_active = true;
  END LOOP;
END;
$$;

-- Función: Registrar envío de email
CREATE OR REPLACE FUNCTION public.record_email_send(
  p_subscriber_id UUID,
  p_sequence_id UUID,
  p_step_id UUID,
  p_to_email TEXT,
  p_subject TEXT,
  p_provider_message_id TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_send_id UUID;
BEGIN
  -- Insertar registro de envío
  INSERT INTO public.email_sends (
    subscriber_id, sequence_id, step_id, to_email, subject,
    provider_message_id, status, sent_at
  ) VALUES (
    p_subscriber_id, p_sequence_id, p_step_id, p_to_email, p_subject,
    p_provider_message_id, 'sent', now()
  )
  RETURNING id INTO v_send_id;

  -- Actualizar métricas del suscriptor
  UPDATE public.email_subscribers
  SET
    emails_sent = emails_sent + 1,
    last_email_sent_at = now(),
    updated_at = now()
  WHERE id = p_subscriber_id;

  -- Actualizar métricas de la secuencia
  IF p_sequence_id IS NOT NULL THEN
    UPDATE public.email_sequences
    SET total_sent = total_sent + 1
    WHERE id = p_sequence_id;
  END IF;

  -- Actualizar métricas del paso
  IF p_step_id IS NOT NULL THEN
    UPDATE public.email_sequence_steps
    SET total_sent = total_sent + 1
    WHERE id = p_step_id;
  END IF;

  RETURN v_send_id;
END;
$$;

-- Función: Procesar evento de email (webhook)
CREATE OR REPLACE FUNCTION public.process_email_event(
  p_provider_message_id TEXT,
  p_event_type TEXT,
  p_link_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_raw_payload JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_send RECORD;
BEGIN
  -- Buscar el envío
  SELECT * INTO v_send
  FROM public.email_sends
  WHERE provider_message_id = p_provider_message_id;

  IF v_send IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Send not found');
  END IF;

  -- Insertar evento
  INSERT INTO public.email_events (
    send_id, event_type, link_url, user_agent, ip_address, raw_payload
  ) VALUES (
    v_send.id, p_event_type, p_link_url, p_user_agent, p_ip_address, p_raw_payload
  );

  -- Actualizar estado del envío
  UPDATE public.email_sends
  SET
    status = p_event_type,
    delivered_at = CASE WHEN p_event_type = 'delivered' THEN now() ELSE delivered_at END,
    opened_at = CASE WHEN p_event_type = 'opened' AND opened_at IS NULL THEN now() ELSE opened_at END,
    clicked_at = CASE WHEN p_event_type = 'clicked' AND clicked_at IS NULL THEN now() ELSE clicked_at END,
    bounced_at = CASE WHEN p_event_type = 'bounced' THEN now() ELSE bounced_at END
  WHERE id = v_send.id;

  -- Actualizar métricas del suscriptor
  UPDATE public.email_subscribers
  SET
    emails_opened = CASE WHEN p_event_type = 'opened' THEN emails_opened + 1 ELSE emails_opened END,
    emails_clicked = CASE WHEN p_event_type = 'clicked' THEN emails_clicked + 1 ELSE emails_clicked END,
    last_email_opened_at = CASE WHEN p_event_type = 'opened' THEN now() ELSE last_email_opened_at END,
    last_email_clicked_at = CASE WHEN p_event_type = 'clicked' THEN now() ELSE last_email_clicked_at END,
    status = CASE WHEN p_event_type IN ('bounced', 'complained') THEN p_event_type ELSE status END,
    updated_at = now()
  WHERE id = v_send.subscriber_id;

  -- Actualizar métricas de secuencia y paso
  IF v_send.sequence_id IS NOT NULL THEN
    UPDATE public.email_sequences
    SET
      total_opened = CASE WHEN p_event_type = 'opened' THEN total_opened + 1 ELSE total_opened END,
      total_clicked = CASE WHEN p_event_type = 'clicked' THEN total_clicked + 1 ELSE total_clicked END
    WHERE id = v_send.sequence_id;
  END IF;

  IF v_send.step_id IS NOT NULL THEN
    UPDATE public.email_sequence_steps
    SET
      total_opened = CASE WHEN p_event_type = 'opened' THEN total_opened + 1 ELSE total_opened END,
      total_clicked = CASE WHEN p_event_type = 'clicked' THEN total_clicked + 1 ELSE total_clicked END
    WHERE id = v_send.step_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'send_id', v_send.id);
END;
$$;

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_editions ENABLE ROW LEVEL SECURITY;

-- Admins pueden gestionar todo
CREATE POLICY "Admins can manage email_sequences"
  ON public.email_sequences FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage email_sequence_steps"
  ON public.email_sequence_steps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage email_subscribers"
  ON public.email_subscribers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage email_sends"
  ON public.email_sends FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage email_events"
  ON public.email_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage newsletter_editions"
  ON public.newsletter_editions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service role tiene acceso completo (para Edge Functions)
CREATE POLICY "Service role full access email_sequences"
  ON public.email_sequences FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access email_sequence_steps"
  ON public.email_sequence_steps FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access email_subscribers"
  ON public.email_subscribers FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access email_sends"
  ON public.email_sends FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access email_events"
  ON public.email_events FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access newsletter_editions"
  ON public.newsletter_editions FOR ALL TO service_role USING (true);

-- ============================================================================
-- 10. TRIGGERS
-- ============================================================================

-- Trigger: Auto-crear suscriptor cuando se registra usuario
CREATE OR REPLACE FUNCTION public.auto_create_email_subscriber()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_subscribers (
    user_id,
    email,
    first_name,
    user_type,
    source,
    last_activity_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'unknown'),
    'signup',
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = NEW.id,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: Este trigger se activa en auth.users, requiere configuración especial en Supabase

-- Trigger: Actualizar updated_at
CREATE TRIGGER update_email_sequences_updated_at
  BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_sequence_steps_updated_at
  BEFORE UPDATE ON public.email_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_subscribers_updated_at
  BEFORE UPDATE ON public.email_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_editions_updated_at
  BEFORE UPDATE ON public.newsletter_editions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 11. DATOS INICIALES (Secuencias predefinidas)
-- ============================================================================

-- Secuencia de bienvenida para propietarios
INSERT INTO public.email_sequences (name, slug, description, sequence_type, target_audience)
VALUES (
  'Bienvenida Propietarios',
  'welcome-owner',
  'Secuencia de 5 emails para nuevos propietarios que registran su auto',
  'welcome',
  'owners'
) ON CONFLICT (slug) DO NOTHING;

-- Secuencia de bienvenida para arrendatarios
INSERT INTO public.email_sequences (name, slug, description, sequence_type, target_audience)
VALUES (
  'Bienvenida Arrendatarios',
  'welcome-renter',
  'Secuencia de 5 emails para nuevos arrendatarios',
  'welcome',
  'renters'
) ON CONFLICT (slug) DO NOTHING;

-- Secuencia de re-engagement
INSERT INTO public.email_sequences (name, slug, description, sequence_type, target_audience)
VALUES (
  'Re-engagement',
  're-engagement',
  'Recuperar usuarios inactivos por más de 30 días',
  're_engagement',
  'all'
) ON CONFLICT (slug) DO NOTHING;

-- Newsletter semanal
INSERT INTO public.email_sequences (name, slug, description, sequence_type, target_audience, send_time_utc)
VALUES (
  'Newsletter Semanal',
  'newsletter-weekly',
  'Newsletter semanal con tips, novedades y promociones',
  'newsletter',
  'all',
  '14:00:00' -- 9 AM Ecuador
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 12. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sequences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sequence_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_subscribers TO authenticated;
GRANT SELECT, INSERT ON public.email_sends TO authenticated;
GRANT SELECT, INSERT ON public.email_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_editions TO authenticated;

GRANT SELECT ON public.v_inactive_subscribers TO authenticated;
GRANT SELECT ON public.v_sequence_performance TO authenticated;

GRANT EXECUTE ON FUNCTION public.add_subscriber_to_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_email_for_subscriber TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_email_send TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_email_event TO authenticated;
