-- Sistema Girard CRM para WhatsApp Outreach
-- "Every sale is a relationship, not a transaction" - Joe Girard

-- Tabla principal de contactos (CRM)
CREATE TABLE IF NOT EXISTS public.outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos básicos
  phone TEXT NOT NULL UNIQUE,
  whatsapp_id TEXT GENERATED ALWAYS AS (phone || '@c.us') STORED,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) STORED,

  -- Ubicación
  city TEXT,
  province TEXT,
  country TEXT DEFAULT 'Argentina',
  region TEXT, -- AMBA, Interior, USA

  -- Fuente del contacto
  source TEXT DEFAULT 'rentennials', -- rentennials, tripwip, rentacar, referral, organic
  referred_by UUID REFERENCES public.outreach_contacts(id),

  -- Estado del funnel
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new',           -- Sin contactar
    'contacted',     -- Primer mensaje enviado
    'responded',     -- Respondió (cualquier respuesta)
    'interested',    -- Mostró interés
    'qualified',     -- Calificado (tiene auto, quiere alquilar)
    'registered',    -- Se registró en la app
    'active',        -- Publicó un auto
    'churned',       -- Se fue / no responde
    'not_interested' -- Dijo que no le interesa
  )),

  -- Métricas de engagement
  messages_sent INT DEFAULT 0,
  messages_received INT DEFAULT 0,
  last_message_sent_at TIMESTAMPTZ,
  last_message_received_at TIMESTAMPTZ,
  response_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN messages_sent > 0
    THEN (messages_received::DECIMAL / messages_sent * 100)
    ELSE 0 END
  ) STORED,

  -- Datos personales (Sistema Girard)
  birthday DATE,
  anniversary DATE, -- Fecha importante personal
  occupation TEXT,
  company TEXT,
  interests TEXT[], -- Ej: ['viajes', 'autos clásicos', 'familia']
  family_notes TEXT, -- "Tiene 2 hijos, esposa María"

  -- Datos de negocio
  has_car BOOLEAN,
  car_brand TEXT,
  car_model TEXT,
  car_year INT,
  current_platform TEXT, -- rentennials, tripwip, etc
  pain_points TEXT[], -- Problemas que mencionó
  objections TEXT[], -- Objeciones que puso

  -- Notas libres (como la libreta de Joe)
  notes TEXT,

  -- Sistema de seguimiento
  next_followup_at TIMESTAMPTZ,
  followup_reason TEXT,

  -- Referidos
  referrals_given INT DEFAULT 0,
  referrals_converted INT DEFAULT 0,

  -- Scores
  engagement_score INT DEFAULT 0, -- 0-100
  potential_score INT DEFAULT 0,  -- 0-100 (qué tan buen cliente sería)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  first_contact_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ
);

-- Historial de mensajes
CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.outreach_contacts(id) ON DELETE CASCADE,

  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN (
    'text', 'image', 'audio', 'video', 'document', 'template'
  )),

  -- Contenido
  content TEXT NOT NULL,
  template_used TEXT, -- Nombre del template si aplica

  -- Metadata
  whatsapp_message_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN (
    'pending', 'sent', 'delivered', 'read', 'failed'
  )),

  -- Análisis (para inbound)
  detected_intent TEXT, -- interested, question, objection, not_interested
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  keywords TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- Campañas de seguimiento (Sistema de tarjetas de Joe)
CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN (
    'initial_outreach',  -- Primer contacto
    'followup',          -- Seguimiento
    'value',             -- Contenido de valor (tips, noticias)
    'relationship',      -- Mantenimiento de relación
    'birthday',          -- Cumpleaños
    'holiday',           -- Fiestas (Navidad, Año Nuevo)
    'referral_ask',      -- Pedir referidos
    'reactivation'       -- Reactivar contactos fríos
  )),

  -- Targeting
  target_status TEXT[], -- A qué status aplica
  target_region TEXT[], -- AMBA, Interior, USA
  min_days_since_contact INT, -- Mínimo días desde último contacto
  max_days_since_contact INT,

  -- Mensaje
  message_template TEXT NOT NULL,

  -- Schedule
  is_active BOOLEAN DEFAULT true,
  send_time_start TIME DEFAULT '09:00',
  send_time_end TIME DEFAULT '21:00',
  max_per_day INT DEFAULT 50,

  -- Métricas
  total_sent INT DEFAULT 0,
  total_responses INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fechas especiales (para no olvidar como Joe)
CREATE TABLE IF NOT EXISTS public.outreach_special_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.outreach_contacts(id) ON DELETE CASCADE,

  date_type TEXT NOT NULL CHECK (date_type IN (
    'birthday', 'anniversary', 'first_rental', 'custom'
  )),
  date_value DATE NOT NULL,
  description TEXT,

  -- ¿Ya enviamos mensaje este año?
  last_message_year INT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Referidos tracking
CREATE TABLE IF NOT EXISTS public.outreach_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  referrer_id UUID NOT NULL REFERENCES public.outreach_contacts(id),
  referred_id UUID NOT NULL REFERENCES public.outreach_contacts(id),

  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'contacted', 'converted', 'rejected'
  )),

  -- Reward tracking
  reward_type TEXT,
  reward_given BOOLEAN DEFAULT false,
  reward_given_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.outreach_contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_region ON public.outreach_contacts(region);
CREATE INDEX IF NOT EXISTS idx_contacts_next_followup ON public.outreach_contacts(next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.outreach_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON public.outreach_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.outreach_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_special_dates_upcoming ON public.outreach_special_dates(date_value);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contacts_updated_at
  BEFORE UPDATE ON public.outreach_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para calcular engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(contact_id UUID)
RETURNS INT AS $$
DECLARE
  score INT := 0;
  contact RECORD;
BEGIN
  SELECT * INTO contact FROM public.outreach_contacts WHERE id = contact_id;

  -- Base por respuestas
  score := score + LEAST(contact.messages_received * 10, 30);

  -- Bonus por interés
  IF contact.status = 'interested' THEN score := score + 20; END IF;
  IF contact.status = 'qualified' THEN score := score + 30; END IF;
  IF contact.status = 'registered' THEN score := score + 40; END IF;

  -- Bonus por referidos
  score := score + LEAST(contact.referrals_given * 5, 20);

  -- Penalización por inactividad
  IF contact.last_message_received_at < now() - INTERVAL '30 days' THEN
    score := score - 20;
  END IF;

  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql;

-- Vista de contactos para seguimiento hoy
CREATE OR REPLACE VIEW public.v_contacts_followup_today AS
SELECT
  c.*,
  COALESCE(
    (SELECT content FROM public.outreach_messages
     WHERE contact_id = c.id AND direction = 'inbound'
     ORDER BY created_at DESC LIMIT 1),
    'Sin respuesta'
  ) as last_inbound_message
FROM public.outreach_contacts c
WHERE c.next_followup_at::DATE <= CURRENT_DATE
  AND c.status NOT IN ('not_interested', 'churned', 'active')
ORDER BY c.next_followup_at;

-- Vista de cumpleaños próximos (7 días)
CREATE OR REPLACE VIEW public.v_upcoming_birthdays AS
SELECT
  c.*,
  sd.date_value as birthday,
  sd.date_value + INTERVAL '1 year' * (
    EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM sd.date_value)
    + CASE WHEN sd.date_value > CURRENT_DATE THEN 0 ELSE 1 END
  ) as next_birthday
FROM public.outreach_contacts c
JOIN public.outreach_special_dates sd ON c.id = sd.contact_id
WHERE sd.date_type = 'birthday'
  AND (sd.last_message_year IS NULL OR sd.last_message_year < EXTRACT(YEAR FROM CURRENT_DATE))
ORDER BY next_birthday;

-- Insertar campañas predefinidas (Sistema Girard)
INSERT INTO public.outreach_campaigns (name, campaign_type, target_status, message_template, min_days_since_contact) VALUES
(
  'Seguimiento 3 días',
  'followup',
  ARRAY['contacted'],
  'Hola {first_name}! Te escribí hace unos días sobre autorentar. ¿Pudiste verlo? Cualquier duda estoy acá. Saludos!',
  3
),
(
  'Seguimiento 7 días - Valor',
  'value',
  ARRAY['contacted', 'responded'],
  'Hola {first_name}! Quería compartirte un dato: los propietarios que alquilan su auto en AMBA generan en promedio $150.000-300.000/mes extra. ¿Te gustaría saber cómo? Eduardo',
  7
),
(
  'Seguimiento 14 días - Último intento',
  'followup',
  ARRAY['contacted'],
  'Hola {first_name}, último mensaje, no quiero molestarte. Si en algún momento te interesa poner tu auto a trabajar, acá estoy. Éxitos!',
  14
),
(
  'Pedir referidos',
  'referral_ask',
  ARRAY['interested', 'qualified', 'registered'],
  'Hola {first_name}! Pregunta rápida: ¿conocés a alguien más que tenga auto y le pueda interesar generar ingresos extra alquilándolo? Si me pasás su contacto te lo agradezco mucho!',
  21
),
(
  'Mantenimiento mensual',
  'relationship',
  ARRAY['interested', 'qualified'],
  'Hola {first_name}! Pasaba a saludar. ¿Cómo va todo? Cualquier novedad con el tema del auto avisame. Abrazo!',
  30
),
(
  'Cumpleaños',
  'birthday',
  NULL,
  '¡Feliz cumpleaños {first_name}! 🎂 Que tengas un gran día. Abrazo grande! Eduardo de autorentar',
  NULL
),
(
  'Fin de año',
  'holiday',
  NULL,
  'Hola {first_name}! Desde autorentar te deseamos muy felices fiestas y un gran 2026. ¡Gracias por estar! Abrazo',
  NULL
),
(
  'Reactivación 60 días',
  'reactivation',
  ARRAY['contacted', 'responded'],
  'Hola {first_name}! Hace tiempo no hablamos. Quería contarte que autorentar creció mucho y hay buena demanda en {region}. ¿Seguís con ganas de poner tu auto a trabajar?',
  60
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.outreach_contacts IS 'CRM de contactos estilo Joe Girard - cada contacto es una relación';
COMMENT ON TABLE public.outreach_messages IS 'Historial completo de conversaciones';
COMMENT ON TABLE public.outreach_campaigns IS 'Campañas automáticas de seguimiento';
COMMENT ON TABLE public.outreach_special_dates IS 'Fechas importantes para no olvidar (cumpleaños, etc)';
