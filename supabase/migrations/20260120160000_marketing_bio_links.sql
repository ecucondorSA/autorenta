-- =============================================================================
-- Marketing Bio Links (SEO 2026)
-- =============================================================================
-- Sistema de links dinámicos tipo Linktree para Instagram/TikTok bio
-- =============================================================================

-- Tabla de links en bio
CREATE TABLE IF NOT EXISTS public.marketing_bio_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'twitter', 'facebook', 'all')),
  title text NOT NULL,
  url text NOT NULL,
  description text,
  icon text, -- emoji or icon name
  display_order int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  click_count int DEFAULT 0,
  -- SEO tracking
  utm_source text,
  utm_medium text,
  utm_campaign text,
  -- Scheduling
  starts_at timestamptz,
  ends_at timestamptz,
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bio_links_platform ON marketing_bio_links(platform);
CREATE INDEX IF NOT EXISTS idx_bio_links_active ON marketing_bio_links(is_active, display_order);

-- RLS
ALTER TABLE marketing_bio_links ENABLE ROW LEVEL SECURITY;

-- Política: Lectura pública (para el endpoint público de links)
CREATE POLICY "Bio links are publicly readable"
  ON marketing_bio_links FOR SELECT
  USING (is_active = true);

-- Política: Solo admins pueden modificar
CREATE POLICY "Only admins can modify bio links"
  ON marketing_bio_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Función para registrar clicks
CREATE OR REPLACE FUNCTION public.track_bio_link_click(link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE marketing_bio_links
  SET click_count = click_count + 1, updated_at = now()
  WHERE id = link_id;
END;
$$;

-- Datos iniciales para AutoRentar
INSERT INTO marketing_bio_links (platform, title, url, description, icon, display_order, utm_source, utm_medium, utm_campaign)
VALUES
  ('all', 'Descargar App Android', 'https://play.google.com/store/apps/details?id=app.autorentar', 'Bajá la app y empezá a alquilar', '📲', 1, 'instagram', 'bio', 'app_download'),
  ('all', 'Ver Autos Disponibles', 'https://autorentar.com/marketplace', 'Explorá autos cerca tuyo', '🚗', 2, 'instagram', 'bio', 'marketplace'),
  ('all', 'Publicá tu Auto', 'https://autorentar.com/cars/new', 'Ganá dinero con tu auto', '💰', 3, 'instagram', 'bio', 'publish_car'),
  ('instagram', 'Último Post', 'https://autorentar.com/promo', 'Ver promoción actual', '🔥', 4, 'instagram', 'bio', 'promo')
ON CONFLICT DO NOTHING;

-- Comentario
COMMENT ON TABLE marketing_bio_links IS 'Links dinámicos para bio de Instagram/TikTok - SEO 2026';
