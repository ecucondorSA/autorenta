-- Marketing Automation: Granja de Contenido Guerrilla
-- Created: 2026-01-27
-- Purpose: Tables for AI-powered content generation and automated social media posting

-- Tabla de personas/perfiles para posting en redes sociales
CREATE TABLE IF NOT EXISTS public.marketing_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  profile_metadata JSONB NOT NULL DEFAULT '{}', -- age, job, car, tone, emoji_frequency
  facebook_account_id TEXT,
  instagram_account_id TEXT,
  twitter_account_id TEXT,
  cookies_encrypted TEXT, -- Encrypted cookies para autenticación
  proxy_assigned TEXT, -- IP del proxy asignado a esta persona
  last_post_at TIMESTAMPTZ,
  last_comment_at TIMESTAMPTZ,
  posts_today INT DEFAULT 0,
  comments_today INT DEFAULT 0,
  is_shadowbanned BOOLEAN DEFAULT false,
  shadowban_detected_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de contenido generado por IA
CREATE TABLE IF NOT EXISTS public.marketing_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES public.marketing_personas(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin')),
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'reply', 'story')),
  generated_content TEXT NOT NULL,
  ai_model TEXT, -- 'groq/llama-3', 'openai/gpt-4', etc.
  context JSONB NOT NULL DEFAULT '{}', -- pain_point, keywords, target_post_id, target_post_url
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'posted', 'failed', 'rejected', 'flagged')),
  posted_at TIMESTAMPTZ,
  post_url TEXT, -- URL del post/comentario publicado
  engagement JSONB DEFAULT '{}', -- { likes: 0, comments: 0, shares: 0 }
  screenshot_url TEXT, -- Screenshot de evidencia
  error_message TEXT, -- Si falla, log del error
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de monitoreo de keywords y grupos objetivo
CREATE TABLE IF NOT EXISTS public.marketing_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'reddit')),
  keywords TEXT[] NOT NULL, -- ['alquiler auto', 'BYD', 'estafa alquiler']
  target_groups TEXT[], -- URLs de grupos de Facebook, subreddits, etc.
  target_hashtags TEXT[], -- Hashtags de Instagram/Twitter
  rss_feed_url TEXT, -- Si usa RSS para monitoreo
  last_check_at TIMESTAMPTZ,
  posts_found_today INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  check_frequency_minutes INT DEFAULT 30, -- Cada cuántos minutos revisar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de engagement tracking
CREATE TABLE IF NOT EXISTS public.marketing_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.marketing_content(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('like', 'comment', 'share', 'click', 'view')),
  metric_value INT DEFAULT 1,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Tabla de alertas y anomalías
CREATE TABLE IF NOT EXISTS public.marketing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('shadowban', 'rate_limit', 'account_locked', 'content_flagged', 'proxy_failed')),
  persona_id UUID REFERENCES public.marketing_personas(id) ON DELETE SET NULL,
  content_id UUID REFERENCES public.marketing_content(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_marketing_content_persona ON public.marketing_content(persona_id);
CREATE INDEX IF NOT EXISTS idx_marketing_content_status ON public.marketing_content(status);
CREATE INDEX IF NOT EXISTS idx_marketing_content_platform ON public.marketing_content(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_content_posted_at ON public.marketing_content(posted_at);
CREATE INDEX IF NOT EXISTS idx_marketing_engagement_content ON public.marketing_engagement(content_id);
CREATE INDEX IF NOT EXISTS idx_marketing_alerts_unresolved ON public.marketing_alerts(resolved) WHERE resolved = false;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_marketing_personas_updated_at ON public.marketing_personas;
CREATE TRIGGER update_marketing_personas_updated_at
  BEFORE UPDATE ON public.marketing_personas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_updated_at();

DROP TRIGGER IF EXISTS update_marketing_content_updated_at ON public.marketing_content;
CREATE TRIGGER update_marketing_content_updated_at
  BEFORE UPDATE ON public.marketing_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_updated_at();

DROP TRIGGER IF EXISTS update_marketing_monitors_updated_at ON public.marketing_monitors;
CREATE TRIGGER update_marketing_monitors_updated_at
  BEFORE UPDATE ON public.marketing_monitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_updated_at();

-- RLS Policies (Solo admins tienen acceso)
ALTER TABLE public.marketing_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admins pueden acceder
CREATE POLICY "Admin full access to marketing_personas"
  ON public.marketing_personas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to marketing_content"
  ON public.marketing_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to marketing_monitors"
  ON public.marketing_monitors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to marketing_engagement"
  ON public.marketing_engagement
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to marketing_alerts"
  ON public.marketing_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Helper function: Reset daily counters (llamar con cron diario)
CREATE OR REPLACE FUNCTION public.reset_marketing_daily_counters()
RETURNS void AS $$
BEGIN
  UPDATE public.marketing_personas
  SET posts_today = 0, comments_today = 0;
  
  UPDATE public.marketing_monitors
  SET posts_found_today = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Verificar si una persona puede postear hoy
CREATE OR REPLACE FUNCTION public.can_persona_post(p_persona_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_posts_today INT;
  v_is_shadowbanned BOOLEAN;
  v_last_post TIMESTAMPTZ;
BEGIN
  SELECT posts_today, is_shadowbanned, last_post_at
  INTO v_posts_today, v_is_shadowbanned, v_last_post
  FROM public.marketing_personas
  WHERE id = p_persona_id;
  
  -- No puede postear si está shadowbanned
  IF v_is_shadowbanned THEN
    RETURN false;
  END IF;
  
  -- Máximo 3 posts por día
  IF v_posts_today >= 3 THEN
    RETURN false;
  END IF;
  
  -- Mínimo 4 horas entre posts
  IF v_last_post IS NOT NULL AND v_last_post > NOW() - INTERVAL '4 hours' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.marketing_personas IS 'Perfiles/personas para automatización de contenido en redes sociales';
COMMENT ON TABLE public.marketing_content IS 'Contenido generado por IA para posting automatizado';
COMMENT ON TABLE public.marketing_monitors IS 'Configuración de monitoreo de keywords y grupos objetivo';
COMMENT ON TABLE public.marketing_engagement IS 'Tracking de engagement (likes, comments, shares) de contenido publicado';
COMMENT ON TABLE public.marketing_alerts IS 'Alertas y anomalías detectadas (shadowbans, rate limits, etc)';
