-- WhatsApp Outreach Tables
-- Created: 2026-01-27
-- Purpose: Tables for WhatsApp outreach campaigns and AI-powered responses

-- Tabla de contactos para outreach
CREATE TABLE IF NOT EXISTS public.outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  whatsapp_id TEXT, -- WhatsApp ID (phone@c.us format)
  first_name TEXT,
  full_name TEXT,
  source TEXT DEFAULT 'manual', -- 'manual', 'import', 'facebook', 'instagram', etc.
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'interested', 'not_interested', 'converted', 'blocked')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  messages_sent INT DEFAULT 0,
  last_message_sent_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de mensajes (historial de conversaciones)
CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.outreach_contacts(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'ai_response', 'response', 'media')),
  content TEXT NOT NULL,
  whatsapp_message_id TEXT, -- WAHA message ID for deduplication
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'received')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de campañas
CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_message TEXT NOT NULL,
  target_tags TEXT[] DEFAULT '{}', -- Filter contacts by tags
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  messages_sent INT DEFAULT 0,
  messages_delivered INT DEFAULT 0,
  messages_read INT DEFAULT 0,
  responses_received INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance (tables may already exist from Supabase Dashboard)
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_phone ON public.outreach_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_status ON public.outreach_contacts(status);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_source ON public.outreach_contacts(source);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_contact ON public.outreach_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_direction ON public.outreach_messages(direction);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_created ON public.outreach_messages(created_at DESC);
-- Use whatsapp_message_id (existing column) for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_messages_whatsapp_id ON public.outreach_messages(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_status ON public.outreach_campaigns(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_outreach_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_outreach_contacts_updated_at ON public.outreach_contacts;
CREATE TRIGGER update_outreach_contacts_updated_at
  BEFORE UPDATE ON public.outreach_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_outreach_updated_at();

DROP TRIGGER IF EXISTS update_outreach_campaigns_updated_at ON public.outreach_campaigns;
CREATE TRIGGER update_outreach_campaigns_updated_at
  BEFORE UPDATE ON public.outreach_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_outreach_updated_at();

-- RLS Policies (Admin only access)
ALTER TABLE public.outreach_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for Edge Functions)
CREATE POLICY "Service role full access to outreach_contacts"
  ON public.outreach_contacts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to outreach_messages"
  ON public.outreach_messages
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to outreach_campaigns"
  ON public.outreach_campaigns
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin access via profiles.role
CREATE POLICY "Admin full access to outreach_contacts"
  ON public.outreach_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to outreach_messages"
  ON public.outreach_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to outreach_campaigns"
  ON public.outreach_campaigns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.outreach_contacts IS 'Contacts for WhatsApp outreach campaigns';
COMMENT ON TABLE public.outreach_messages IS 'Message history for WhatsApp conversations with deduplication';
COMMENT ON TABLE public.outreach_campaigns IS 'Outreach campaign definitions and stats';
COMMENT ON COLUMN public.outreach_messages.whatsapp_message_id IS 'WAHA message ID for deduplication - prevents duplicate responses';
