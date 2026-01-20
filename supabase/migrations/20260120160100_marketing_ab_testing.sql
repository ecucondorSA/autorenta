-- =============================================================================
-- Marketing A/B Testing System (SEO 2026)
-- =============================================================================
-- Sistema de A/B testing para hooks y variantes de contenido
-- =============================================================================

-- Tabla de variantes de hooks
CREATE TABLE IF NOT EXISTS public.marketing_hook_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text NOT NULL, -- promo, testimonial, educational, seasonal
  variant_name text NOT NULL, -- A, B, C, control
  hook_template text NOT NULL, -- Template con placeholders
  description text,
  is_active boolean DEFAULT true,
  weight int DEFAULT 100, -- Peso para distribución (0-100)
  -- Métricas (actualizadas por webhook o manualmente)
  impressions int DEFAULT 0,
  engagements int DEFAULT 0, -- likes + comments + shares
  saves int DEFAULT 0,
  shares int DEFAULT 0,
  link_clicks int DEFAULT 0,
  -- Calculated
  engagement_rate numeric GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN (engagements::numeric / impressions * 100) ELSE 0 END
  ) STORED,
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_hook_variants_type ON marketing_hook_variants(content_type);
CREATE INDEX IF NOT EXISTS idx_hook_variants_active ON marketing_hook_variants(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hook_variants_unique ON marketing_hook_variants(content_type, variant_name);

-- RLS
ALTER TABLE marketing_hook_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hook variants readable by authenticated"
  ON marketing_hook_variants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify hook variants"
  ON marketing_hook_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Función para seleccionar variante ponderada
CREATE OR REPLACE FUNCTION public.select_hook_variant(p_content_type text)
RETURNS TABLE (
  variant_id uuid,
  variant_name text,
  hook_template text
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_weight int;
  random_weight int;
  running_weight int := 0;
  v_row RECORD;
BEGIN
  -- Calcular peso total
  SELECT COALESCE(SUM(weight), 0) INTO total_weight
  FROM marketing_hook_variants
  WHERE content_type = p_content_type AND is_active = true;

  IF total_weight = 0 THEN
    -- Return default if no variants
    RETURN QUERY SELECT
      NULL::uuid,
      'default'::text,
      '¿Sabías que podés ahorrar hasta 40% en tu próximo alquiler?'::text;
    RETURN;
  END IF;

  -- Seleccionar número aleatorio
  random_weight := floor(random() * total_weight);

  -- Iterar y seleccionar basado en peso
  FOR v_row IN
    SELECT id, variant_name AS vname, hook_template AS template, weight
    FROM marketing_hook_variants
    WHERE content_type = p_content_type AND is_active = true
    ORDER BY weight DESC
  LOOP
    running_weight := running_weight + v_row.weight;
    IF running_weight > random_weight THEN
      RETURN QUERY SELECT v_row.id, v_row.vname, v_row.template;
      RETURN;
    END IF;
  END LOOP;

  -- Fallback
  RETURN QUERY SELECT
    NULL::uuid,
    'default'::text,
    '¿Sabías que podés ahorrar hasta 40% en tu próximo alquiler?'::text;
END;
$$;

-- Función para registrar impresión
CREATE OR REPLACE FUNCTION public.track_hook_impression(p_variant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE marketing_hook_variants
  SET impressions = impressions + 1, updated_at = now()
  WHERE id = p_variant_id;
END;
$$;

-- Función para registrar engagement
CREATE OR REPLACE FUNCTION public.track_hook_engagement(
  p_variant_id uuid,
  p_engagements int DEFAULT 0,
  p_saves int DEFAULT 0,
  p_shares int DEFAULT 0,
  p_link_clicks int DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE marketing_hook_variants
  SET
    engagements = engagements + p_engagements,
    saves = saves + p_saves,
    shares = shares + p_shares,
    link_clicks = link_clicks + p_link_clicks,
    updated_at = now()
  WHERE id = p_variant_id;
END;
$$;

-- Datos iniciales: Variantes de hooks para promo
INSERT INTO marketing_hook_variants (content_type, variant_name, hook_template, description, weight)
VALUES
  -- Promo hooks
  ('promo', 'A_question', '¿Sabías que podés alquilar un auto {{porcentaje}}% más barato?', 'Pregunta con dato específico', 25),
  ('promo', 'B_secret', 'El secreto que las rentadoras NO quieren que sepas', 'Hook de curiosidad/conspiración', 25),
  ('promo', 'C_mistakes', '{{numero}} errores que cometen todos al alquilar un auto', 'Listicle de errores', 25),
  ('promo', 'D_direct', 'Ahorrá hasta {{porcentaje}}% en tu próximo alquiler 🚗', 'CTA directo', 25),

  -- Educational hooks
  ('educational', 'A_howto', 'Cómo {{accion}} en {{tiempo}} (guía completa)', 'Tutorial paso a paso', 33),
  ('educational', 'B_tips', '{{numero}} tips para {{objetivo}} que nadie te cuenta', 'Tips exclusivos', 33),
  ('educational', 'C_avoid', 'Evitá estos errores al {{accion}}', 'Prevención de errores', 34),

  -- Testimonial hooks
  ('testimonial', 'A_story', '{{nombre}} ahorró ${{monto}} en su viaje a {{destino}}', 'Historia con datos', 50),
  ('testimonial', 'B_quote', '"{{cita_corta}}" - {{nombre}}, {{ciudad}}', 'Cita directa', 50),

  -- Seasonal hooks
  ('seasonal', 'A_urgency', '🔥 Solo por {{tiempo}}: {{oferta}}', 'Urgencia temporal', 50),
  ('seasonal', 'B_destination', '{{destino}} te espera este verano 🌴', 'Enfoque en destino', 50)
ON CONFLICT (content_type, variant_name) DO NOTHING;

-- Agregar columna hook_variant_id a la cola de marketing
ALTER TABLE marketing_content_queue
ADD COLUMN IF NOT EXISTS hook_variant_id uuid REFERENCES marketing_hook_variants(id);

-- Comentario
COMMENT ON TABLE marketing_hook_variants IS 'Variantes de hooks para A/B testing - SEO 2026';
