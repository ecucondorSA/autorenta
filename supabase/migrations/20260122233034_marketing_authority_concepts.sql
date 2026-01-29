-- =============================================================================
-- Marketing Authority Concepts (Scroll-Stopping Psychology)
-- =============================================================================
-- Sistema de conceptos de autoridad psicológica para contenido de alto impacto
-- Conecta dolores de crianza con analogías financieras de activos parados
-- =============================================================================

-- 1. CREAR TABLA DE CONCEPTOS DE AUTORIDAD
CREATE TABLE IF NOT EXISTS public.marketing_authority_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Concepto
  term_name TEXT NOT NULL,                    -- Nombre del sesgo/concepto psicológico
  parenting_pain_point TEXT NOT NULL,         -- Analogía de crianza (conexión emocional)
  financial_analogy TEXT NOT NULL,            -- Analogía financiera (mensaje AutoRentar)
  image_scene_concept TEXT NOT NULL,          -- Prompt para imagen emocional

  -- Control
  is_active BOOLEAN DEFAULT true,
  weight INT DEFAULT 100,                     -- Peso para selección ponderada

  -- Métricas
  times_used INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Engagement (actualizado por webhooks)
  total_impressions INT DEFAULT 0,
  total_engagements INT DEFAULT 0,
  engagement_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN total_impressions > 0
    THEN (total_engagements::numeric / total_impressions * 100)
    ELSE 0 END
  ) STORED,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_authority_concepts_active
  ON marketing_authority_concepts(is_active);
CREATE INDEX IF NOT EXISTS idx_authority_concepts_weight
  ON marketing_authority_concepts(weight DESC);

-- RLS
ALTER TABLE marketing_authority_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authority concepts readable by authenticated"
  ON marketing_authority_concepts FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Only service role can modify authority concepts"
  ON marketing_authority_concepts FOR ALL
  TO service_role USING (true);

-- 2. INSERTAR LOS 12 CONCEPTOS DE AUTORIDAD
INSERT INTO public.marketing_authority_concepts (term_name, parenting_pain_point, financial_analogy, image_scene_concept)
VALUES
(
  'Aversión al Riesgo Hiperbólica',
  'Te dicen "no lo alces que se acostumbra", ignorando que el bebé necesita seguridad para ser independiente después.',
  'Te dices "no lo uso para que no se gaste", ignorando que un activo parado pierde valor por depreciación y costos fijos.',
  'A candid 35mm film shot of a tired mother holding a crying baby while an older woman points a finger at her. Moody domestic lighting.'
),
(
  'Positividad Tóxica Financiera',
  'Te dicen "agradece que tienes un hijo sano" cuando estás al borde del burnout, invalidando tu estrés real.',
  'Te dices "agradece que tienes auto" mientras te ahogas pagando el seguro y la patente sin usarlo.',
  'A father looking overwhelmed at a kitchen table with baby bottles and unpaid bills, forced smile, looking directly at camera. Cinematic lighting.'
),
(
  'Sesgo de Supervivencia Retrospectivo',
  'Te dicen "en mis tiempos lo hacíamos así y sobrevivieron", ignorando que la ciencia y la seguridad han evolucionado.',
  'Piensas "antes los autos se guardaban como tesoros", ignorando que la economía actual exige que los activos generen flujo de caja.',
  'An older man giving confident advice to a younger, confused man in a modern garage. High contrast, sharp focus, realistic textures.'
),
(
  'Falsa Dicotomía Operativa',
  'Te presionan con "o eres una madre presente o eres una profesional exitosa", ignorando que puedes integrar ambos roles.',
  'Te bloqueas pensando "o vendo el auto o me lo quedo para pasear", ignorando que AutoRentar te permite conservarlo mientras se paga solo.',
  'A woman looking at two doors or paths, one with a baby carriage, one with a briefcase. Surreal, editorial photography style.'
),
(
  'Sesgo de Preservación Ineficiente',
  'Te sugieren "no dejes que gatee en el jardín para que no se ensucie", limitando su desarrollo por un miedo superficial.',
  'Decides "mejor lo dejo bajo la lona", ignorando que los componentes se degradan por falta de uso y la inflación devora tu capital.',
  'A high-end car covered in dust and a gray tarp in a dark, humid garage. iPhone 15 Pro Max quality, HDR, feeling of abandonment.'
),
(
  'Proyección de Ansiedad Exógena',
  'Te dicen "no lo pongas en guardería, se va a enfermar", proyectando sus propios miedos sobre tu necesidad de trabajar.',
  'Te advierten "no lo rentes en apps, el mercado es inestable", proyectando su falta de conocimiento técnico sobre tu oportunidad.',
  'A close-up of a person looking anxious while multiple hands point at them from the shadows. Dramatic, low-key lighting.'
),
(
  'Heurística de Disponibilidad',
  'Te aterra una enfermedad rara porque la viste en las noticias, ignorando que el riesgo real es mucho menor.',
  'Te aterra un robo porque viste un video viral, ignorando las estadísticas de seguridad y monitoreo que ofrece AutoRentar.',
  'A person staring at a glowing smartphone screen in a dark room, looking scared. Reflections of news headlines on their face.'
),
(
  'Comparación Heterogénea Táctica',
  'Te dicen "el hijo de tu prima ya habla", ignorando que cada niño tiene un desarrollo biológico y un contexto único.',
  'Te comparas con startups de otros rubros que escalaron en meses, ignorando que tu stack y modelo P2P requieren una solidez técnica distinta.',
  'Two toddlers playing side by side, one is walking, the other is sitting, a parent in the background looking worried at a phone.'
),
(
  'Paradoja de la Elección',
  'Recibes 12 consejos diferentes sobre cómo dormir a tu bebé, terminando en parálisis y agotamiento extremo.',
  'Escuchas 10 formas de "ahorrar" con tu auto, pero ninguna soluciona el problema de fondo: el gasto fijo mensual.',
  'A man in a garage surrounded by different people whispering in his ear, he looks dizzy and overwhelmed. Motion blur effect.'
),
(
  'Tecnofobia de Status Quo',
  'Te dicen que "la tecnología aleja a los padres de los hijos", ignorando que las herramientas digitales pueden optimizar tu tiempo.',
  'Te dicen que "meter tecnología al auto es peligroso", ignorando que el rastreo GPS y la validación digital son más seguros que el trato físico.',
  'A hand holding a high-tech car key fob with a holographic display vs. an old rusty key. High-end editorial style.'
),
(
  'Paternalismo Consultivo',
  'Te sugieren "mejor quédate en casa y no emprendas ahora", subestimando tu capacidad de gestionar familia y negocio.',
  'Te aconsejan "no te arriesgues con plataformas nuevas", tratando de "protegerte" de una rentabilidad que ellos no comprenden.',
  'A young entrepreneur looking determined while an older hand rests on their shoulder as if to stop them. Golden hour lighting.'
),
(
  'Presión de Escalabilidad Lineal',
  'Apenas tienes el primero y ya te preguntan "¿para cuándo el segundo?", ignorando tus tiempos y salud mental.',
  'Apenas registras el primer auto y ya te preguntan "¿cuándo tienes una flota?", ignorando la importancia del Product-Market Fit.',
  'A person looking at a flight of stairs that disappears into the clouds, looking tired but ambitious. Cinematic, wide angle shot.'
)
ON CONFLICT DO NOTHING;

-- 3. FUNCIÓN PARA SELECCIONAR CONCEPTO ALEATORIO PONDERADO
-- NOTE: Function moved to 20260123030500_fix_authority_concept_function.sql (with ε-greedy strategy)
-- Commented out to avoid guardrails duplicate warning
/*
CREATE OR REPLACE FUNCTION public.select_authority_concept()
RETURNS TABLE (
  concept_id UUID,
  term_name TEXT,
  parenting_pain_point TEXT,
  financial_analogy TEXT,
  image_scene_concept TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_weight INT;
  random_weight INT;
  running_weight INT := 0;
  v_row RECORD;
BEGIN
  -- Calcular peso total de conceptos activos
  SELECT COALESCE(SUM(weight), 0) INTO total_weight
  FROM marketing_authority_concepts
  WHERE is_active = true;

  IF total_weight = 0 THEN
    RETURN;
  END IF;

  -- Seleccionar número aleatorio
  random_weight := floor(random() * total_weight);

  -- Iterar y seleccionar basado en peso
  FOR v_row IN
    SELECT id, term_name AS tn, parenting_pain_point AS pp,
           financial_analogy AS fa, image_scene_concept AS isc, weight
    FROM marketing_authority_concepts
    WHERE is_active = true
    ORDER BY weight DESC
  LOOP
    running_weight := running_weight + v_row.weight;
    IF running_weight > random_weight THEN
      -- Actualizar contador de uso
      UPDATE marketing_authority_concepts
      SET times_used = times_used + 1, last_used_at = now()
      WHERE id = v_row.id;

      RETURN QUERY SELECT v_row.id, v_row.tn, v_row.pp, v_row.fa, v_row.isc;
      RETURN;
    END IF;
  END LOOP;
END;
$$;
*/

-- 4. AGREGAR COLUMNA DE REFERENCIA A MARKETING_CONTENT_QUEUE
ALTER TABLE marketing_content_queue
ADD COLUMN IF NOT EXISTS authority_concept_id UUID REFERENCES marketing_authority_concepts(id);

-- 5. COMENTARIOS
COMMENT ON TABLE marketing_authority_concepts IS
'Conceptos de autoridad psicológica para contenido de alto impacto.
Conecta dolores de crianza con analogías financieras de activos parados.
Diseñado para scroll-stopping en Instagram con carga emocional.';

-- COMMENT ON FUNCTION select_authority_concept() - moved to 20260123030500
-- 'Selecciona un concepto de autoridad aleatorio usando pesos.
-- Retorna term_name, parenting_pain_point, financial_analogy, image_scene_concept.';

-- 6. LOG DE MIGRACIÓN
INSERT INTO public.social_publishing_scheduler_log (
  job_name,
  execution_time,
  status,
  campaigns_processed,
  campaigns_published,
  error_message
) VALUES (
  'authority-concepts-migration',
  now(),
  'success',
  12,
  0,
  'Created marketing_authority_concepts table with 12 psychological scroll-stopping concepts'
);
