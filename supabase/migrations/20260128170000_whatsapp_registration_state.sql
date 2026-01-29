-- Estado de registro para conversaciones de WhatsApp
-- Permite trackear el flujo de registro paso a paso

CREATE TABLE IF NOT EXISTS public.whatsapp_registration (
  phone TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle', -- idle, waiting_email, waiting_password, completed
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_state CHECK (state IN ('idle', 'waiting_email', 'waiting_password', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_registration_state
ON whatsapp_registration(state) WHERE state != 'idle';

COMMENT ON TABLE whatsapp_registration IS 'Estado del flujo de registro via WhatsApp';
