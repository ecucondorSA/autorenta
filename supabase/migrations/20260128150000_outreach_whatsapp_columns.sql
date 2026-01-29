-- Agregar columnas necesarias para el bot de WhatsApp

-- Columnas para seguimiento automático
ALTER TABLE outreach_contacts
ADD COLUMN IF NOT EXISTS followup_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS requires_human boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_outreach_at timestamptz;

-- Índice para búsqueda de follow-ups pendientes
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_followup_pending
ON outreach_contacts(last_outreach_at, last_response_at, followup_sent)
WHERE status NOT IN ('closed', 'converted') AND requires_human = false;

-- Índice para deduplicación de mensajes
CREATE INDEX IF NOT EXISTS idx_outreach_messages_whatsapp_id
ON outreach_messages(whatsapp_message_id)
WHERE whatsapp_message_id IS NOT NULL;
