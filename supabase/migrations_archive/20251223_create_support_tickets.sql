-- Migration: Create Support Tickets System
-- Description: Tables for customer support ticket tracking

-- Support ticket categories enum
DO $$ BEGIN
  CREATE TYPE ticket_category AS ENUM (
    'booking_issue',        -- Problemas con reservas
    'payment_issue',        -- Problemas con pagos
    'vehicle_issue',        -- Problemas con vehiculos
    'account_issue',        -- Problemas con cuenta
    'verification_issue',   -- Problemas de verificacion
    'technical_issue',      -- Problemas tecnicos
    'suggestion',           -- Sugerencias
    'other'                 -- Otros
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Urgency levels enum
DO $$ BEGIN
  CREATE TYPE ticket_urgency AS ENUM (
    'low',      -- Baja - Puede esperar
    'medium',   -- Media - Necesita atencion pronto
    'high',     -- Alta - Urgente
    'critical'  -- Critica - Impacto inmediato en operaciones
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ticket status enum
DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM (
    'open',         -- Abierto, pendiente de revision
    'in_progress',  -- En proceso de resolucion
    'waiting_user', -- Esperando respuesta del usuario
    'resolved',     -- Resuelto
    'closed'        -- Cerrado
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Ticket classification
  category ticket_category NOT NULL,
  urgency ticket_urgency NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',

  -- Content
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,

  -- Related entities (optional)
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  car_id UUID REFERENCES cars(id) ON DELETE SET NULL,

  -- Attachments (stored in Supabase Storage)
  attachment_urls TEXT[] DEFAULT '{}',

  -- Resolution tracking
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create tickets
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (limited - only for adding info)
DROP POLICY IF EXISTS "Users can update own tickets" ON support_tickets;
CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_timestamp();

-- Grant access
GRANT ALL ON support_tickets TO authenticated;
GRANT ALL ON support_tickets TO service_role;
