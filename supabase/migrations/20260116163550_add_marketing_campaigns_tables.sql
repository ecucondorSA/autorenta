-- Migration: Add Marketing Campaigns & Analytics Tables
-- Purpose: Track marketing campaigns, A/B tests, events, and analytics metrics
-- Created: 2026-01-16

-- ============================================================================
-- 1. MARKETING CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('owner_acquisition', 'renter_acquisition', 'category_spotlight', 'event_special', 'reactivation')),

  -- Detalles
  description TEXT,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('owners', 'renters', 'general')),
  platforms TEXT[] NOT NULL, -- ['facebook', 'instagram', 'tiktok']

  -- Timeline
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,

  -- Budget & Performance
  budget_usd DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed')),

  -- Metadata
  template_id TEXT,
  variables JSONB,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_marketing_campaigns_type ON public.marketing_campaigns(campaign_type);
CREATE INDEX idx_marketing_campaigns_audience ON public.marketing_campaigns(target_audience);
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_dates ON public.marketing_campaigns(start_date, end_date);

-- RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns"
  ON public.marketing_campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 2. CAMPAIGN EVENTS TABLE (Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relación
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,

  -- Evento
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression',      -- Post visto
    'click',           -- Click en CTA
    'signup',          -- Registro completado
    'first_booking',   -- Primera reserva
    'conversion',      -- Compra/objetivo completado
    'engagement'       -- Like, comentario, share
  )),

  -- Contexto
  platform TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Métricas
  metadata JSONB, -- { utm_source, utm_medium, utm_campaign, device, city, etc }
  value DECIMAL(10, 2), -- Valor monetario (revenue)

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_campaign_events_campaign_id ON public.campaign_events(campaign_id);
CREATE INDEX idx_campaign_events_type ON public.campaign_events(event_type);
CREATE INDEX idx_campaign_events_platform ON public.campaign_events(platform);
CREATE INDEX idx_campaign_events_user_id ON public.campaign_events(user_id);
CREATE INDEX idx_campaign_events_created_at ON public.campaign_events(created_at);

-- RLS
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all events"
  ON public.campaign_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 3. A/B TESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Variantes
  variant_a JSONB NOT NULL, -- { headline, cta, image_url, ...}
  variant_b JSONB NOT NULL,

  -- Configuración
  traffic_split JSONB NOT NULL DEFAULT '{"A": 50, "B": 50}'::jsonb,
  min_sample_size INTEGER DEFAULT 100,
  confidence_level DECIMAL(3, 2) DEFAULT 0.95,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),

  -- Resultados
  winner TEXT CHECK (winner IN ('A', 'B') OR winner IS NULL),
  statistical_significance DECIMAL(5, 4), -- p-value

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_ab_tests_campaign_id ON public.ab_tests(campaign_id);
CREATE INDEX idx_ab_tests_status ON public.ab_tests(status);

-- RLS
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage A/B tests"
  ON public.ab_tests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 4. A/B TEST METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ab_test_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),

  -- Métricas
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  cost_usd DECIMAL(12, 2),

  -- Calculated
  ctr DECIMAL(6, 4) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions ELSE 0 END
  ) STORED,
  cvr DECIMAL(6, 4) GENERATED ALWAYS AS (
    CASE WHEN clicks > 0 THEN conversions::DECIMAL / clicks ELSE 0 END
  ) STORED,

  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_ab_test_metrics_test_id ON public.ab_test_metrics(test_id);
CREATE INDEX idx_ab_test_metrics_variant ON public.ab_test_metrics(variant);

-- RLS
ALTER TABLE public.ab_test_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AB test metrics"
  ON public.ab_test_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 5. CAMPAIGN PERFORMANCE VIEW
-- ============================================================================
CREATE OR REPLACE VIEW public.campaign_performance AS
SELECT
  c.id,
  c.name,
  c.campaign_type,
  c.target_audience,
  c.start_date,
  c.end_date,
  c.status,
  c.budget_usd,

  -- Event counts
  COUNT(*) FILTER (WHERE ce.event_type = 'impression') as impressions,
  COUNT(*) FILTER (WHERE ce.event_type = 'click') as clicks,
  COUNT(*) FILTER (WHERE ce.event_type = 'signup') as signups,
  COUNT(*) FILTER (WHERE ce.event_type = 'first_booking') as first_bookings,
  COUNT(*) FILTER (WHERE ce.event_type = 'conversion') as conversions,

  -- Metrics
  CASE WHEN COUNT(*) FILTER (WHERE ce.event_type = 'impression') > 0
    THEN (COUNT(*) FILTER (WHERE ce.event_type = 'click')::DECIMAL /
          COUNT(*) FILTER (WHERE ce.event_type = 'impression')) * 100
    ELSE 0 END as ctr_percentage,

  CASE WHEN COUNT(*) FILTER (WHERE ce.event_type = 'signup') > 0
    THEN (COUNT(*) FILTER (WHERE ce.event_type = 'conversion')::DECIMAL /
          COUNT(*) FILTER (WHERE ce.event_type = 'signup')) * 100
    ELSE 0 END as conversion_rate_percentage,

  -- Revenue
  SUM(CASE WHEN ce.event_type = 'conversion' THEN ce.value ELSE 0 END) as total_revenue,

  -- ROI
  CASE WHEN c.budget_usd > 0
    THEN ((SUM(CASE WHEN ce.event_type = 'conversion' THEN ce.value ELSE 0 END) - c.budget_usd) / c.budget_usd) * 100
    ELSE NULL END as roi_percentage

FROM public.marketing_campaigns c
LEFT JOIN public.campaign_events ce ON c.id = ce.campaign_id
GROUP BY c.id, c.name, c.campaign_type, c.target_audience, c.start_date, c.end_date, c.status, c.budget_usd;

-- ============================================================================
-- 6. MARKETING METRICS DAILY TABLE (Para análisis histórico)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,

  metric_date DATE NOT NULL,

  -- Daily aggregates
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  revenue_usd DECIMAL(10, 2) DEFAULT 0,

  -- Platforms breakdown
  facebook_impressions BIGINT DEFAULT 0,
  instagram_impressions BIGINT DEFAULT 0,
  tiktok_impressions BIGINT DEFAULT 0,
  twitter_impressions BIGINT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(campaign_id, metric_date)
);

-- Índices
CREATE INDEX idx_marketing_metrics_daily_campaign ON public.marketing_metrics_daily(campaign_id);
CREATE INDEX idx_marketing_metrics_daily_date ON public.marketing_metrics_daily(metric_date);

-- RLS
ALTER TABLE public.marketing_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view daily metrics"
  ON public.marketing_metrics_daily
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 7. TRIGGERS para actualizar updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at
  BEFORE UPDATE ON public.ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. Índices adicionales para performance
-- ============================================================================
CREATE INDEX idx_campaign_events_campaign_event ON public.campaign_events(campaign_id, event_type);
CREATE INDEX idx_campaign_events_platform_date ON public.campaign_events(platform, created_at);

-- ============================================================================
-- 9. GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT SELECT, INSERT ON public.campaign_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ab_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ab_test_metrics TO authenticated;
GRANT SELECT ON public.campaign_performance TO authenticated;
GRANT SELECT ON public.marketing_metrics_daily TO authenticated;
