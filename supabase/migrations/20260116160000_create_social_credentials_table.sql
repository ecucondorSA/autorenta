-- Migration: Create Social Media Credentials Table
-- Purpose: Store encrypted access tokens for social media platforms
-- Security: Only admins can access via RLS

-- ============================================================================
-- 1. SOCIAL MEDIA CREDENTIALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_media_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Platform
  platform TEXT NOT NULL UNIQUE CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'tiktok')),

  -- Credenciales (ENCRIPTADAS por Supabase)
  access_token TEXT NOT NULL, -- Guardar en Supabase Secrets, referencia aquí
  page_id TEXT NOT NULL,
  account_id TEXT,

  -- Estado
  is_active BOOLEAN DEFAULT true,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices (idempotent)
CREATE INDEX IF NOT EXISTS idx_social_credentials_platform ON public.social_media_credentials(platform);
CREATE INDEX IF NOT EXISTS idx_social_credentials_is_active ON public.social_media_credentials(is_active);

-- RLS: Solo admins pueden acceder
ALTER TABLE public.social_media_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage social credentials" ON public.social_media_credentials;
CREATE POLICY "Admins can manage social credentials"
  ON public.social_media_credentials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 2. CAMPAIGN SCHEDULES TABLE (Para campañas programadas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  name TEXT NOT NULL,
  description TEXT,

  -- Contenido
  title TEXT NOT NULL,
  description_content TEXT NOT NULL,
  image_url TEXT, -- URL de imagen a publicar
  cta_text TEXT DEFAULT 'Conocer más',
  cta_url TEXT NOT NULL,

  -- Plataformas
  platforms TEXT[] NOT NULL DEFAULT ARRAY['facebook', 'instagram', 'linkedin', 'tiktok'],

  -- Schedule
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  is_scheduled BOOLEAN DEFAULT true,

  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')),
  published_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Tracking
  post_ids JSONB, -- { facebook: "123", instagram: "456", ... }

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices (idempotent)
CREATE INDEX IF NOT EXISTS idx_campaign_schedules_status ON public.campaign_schedules(status);
CREATE INDEX IF NOT EXISTS idx_campaign_schedules_scheduled_for ON public.campaign_schedules(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaign_schedules_created_by ON public.campaign_schedules(created_by);

-- RLS
ALTER TABLE public.campaign_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage campaign schedules" ON public.campaign_schedules;
CREATE POLICY "Admins can manage campaign schedules"
  ON public.campaign_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 3. SOCIAL PUBLISHING LOG (Para auditoría)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_publishing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  campaign_id UUID REFERENCES public.campaign_schedules(id) ON DELETE CASCADE,

  -- Platform & Result
  platform TEXT NOT NULL,
  post_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,

  -- URLs generadas
  post_url TEXT,

  -- Timestamps
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices (idempotent)
CREATE INDEX IF NOT EXISTS idx_publishing_log_campaign ON public.social_publishing_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_publishing_log_platform ON public.social_publishing_log(platform);
CREATE INDEX IF NOT EXISTS idx_publishing_log_status ON public.social_publishing_log(status);

-- RLS
ALTER TABLE public.social_publishing_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view publishing logs" ON public.social_publishing_log;
CREATE POLICY "Admins can view publishing logs"
  ON public.social_publishing_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
