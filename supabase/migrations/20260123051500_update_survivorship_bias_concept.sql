-- =============================================================================
-- Update: Sesgo de Supervivencia Retrospectivo - Texto Pulido + Metadata
-- =============================================================================
-- Actualiza el concepto con el texto optimizado y referencia a imagen split-screen
-- =============================================================================

-- 1. Agregar columnas de metadata si no existen
ALTER TABLE public.marketing_authority_concepts
ADD COLUMN IF NOT EXISTS full_caption_template TEXT,
ADD COLUMN IF NOT EXISTS hook_line TEXT,
ADD COLUMN IF NOT EXISTS first_comment_template TEXT,
ADD COLUMN IF NOT EXISTS image_reference TEXT,
ADD COLUMN IF NOT EXISTS extra_hashtags TEXT[];

-- 2. Actualizar el concepto "Sesgo de Supervivencia Retrospectivo" con texto pulido
UPDATE public.marketing_authority_concepts
SET
  -- Hook optimizado para Instagram (primera línea punch)
  hook_line = 'Sobrevivir no es lo mismo que haber tomado la mejor decisión.',

  -- Caption completo pulido
  full_caption_template = E'Te dicen "en mis tiempos lo hacíamos así y sobrevivieron", ignorando por completo que la ciencia y los estándares de seguridad han evolucionado drásticamente. Sentís ese peso constante de tener que defender tus decisiones de crianza frente a quienes confunden la suerte con la sabiduría. Es un dolor sordo, el de saber que estás protegiendo a los tuyos mientras el entorno te juzga por no repetir errores del pasado. Esa presión de sostener estructuras obsoletas solo por nostalgia es, sencillamente, agotadora.

Igual que con tu hijo, con tu auto también te pasa lo mismo. Te bombardean con el consejo de que un vehículo debe estar guardado, impecable y estático en el garaje para "cuidar el capital". Es el mismo patrón de consejos no solicitados: te exigen conservar algo bajo una lógica que ya no existe. Mantener un auto parado, perdiendo valor y generando gastos fijos, es el equivalente financiero a ignorar el progreso; es cargar con un peso muerto por el simple hecho de cumplir con una tradición que hoy te empobrece.

En psicología del comportamiento, esto se conoce como "Sesgo de Supervivencia Retrospectivo". Es la tendencia a creer que los métodos antiguos son mejores solo porque sobrevivimos a ellos, ignorando a todos los que quedaron en el camino. Aplicado a tu economía, pensás que "antes los autos se guardaban como tesoros", ignorando que la economía actual exige que los activos generen flujo de caja constante. Los datos son claros: un activo que no produce, es un pasivo disfrazado. En @autorentar aplicamos esta lógica técnica para transformar ese objeto de culto en una fuente de ingresos real.

Es momento de filtrar el ruido externo y dejar de tomar decisiones basadas en la nostalgia de otros. En AutoRentar te damos la plataforma para que tu vehículo trabaje para vos, bajo estándares de seguridad y profesionalismo modernos. No dejes que los sesgos ajenos dicten tu libertad financiera.',

  -- Primer comentario para engagement
  first_comment_template = '¿Cuál es el consejo más "nostálgico" pero económicamente destructivo que te han dado sobre tu auto? Te leo en los comentarios. 👇',

  -- Referencia a imagen split-screen
  image_reference = 'split-screen-garage-contrast',
  image_scene_concept = 'Split-screen cinematic shot: LEFT - Dark cluttered garage with old dusty car, toys scattered on floor, warm golden light from window, feeling of stagnation and nostalgia. RIGHT - Modern clean garage with premium car, young man receiving advice from older man gesturing, cool professional lighting, feeling of progress and decision-making. High contrast, 35mm film aesthetic, realistic textures.',

  -- Hashtags estratégicos adicionales para Argentina/Uruguay
  extra_hashtags = ARRAY['#SesgoDeSupervivencia', '#EducacionFinanciera', '#StartupsLatam', '#FlujoDeCaja', '#ActivosPasivos'],

  -- Aumentar peso por calidad del contenido
  weight = 150,

  updated_at = now()

WHERE term_name = 'Sesgo de Supervivencia Retrospectivo';

-- 3. Crear vista para posts listos para publicar
CREATE OR REPLACE VIEW public.v_authority_posts_ready AS
SELECT
  mac.id,
  mac.term_name,
  mac.hook_line,
  mac.full_caption_template AS caption,
  mac.first_comment_template AS first_comment,
  mac.image_reference,
  mac.image_scene_concept AS image_prompt,
  -- Hashtags combinados
  ARRAY['#AutoRentar', '#FinanzasPersonales', '#CrianzaRespetuosa', '#Argentina', '#Uruguay'] || COALESCE(mac.extra_hashtags, ARRAY[]::TEXT[]) AS all_hashtags,
  -- Formato listo para Instagram
  mac.hook_line || E'\n\n' || mac.full_caption_template || E'\n\n' ||
  array_to_string(ARRAY['#AutoRentar', '#FinanzasPersonales', '#CrianzaRespetuosa', '#Argentina', '#Uruguay'] || COALESCE(mac.extra_hashtags, ARRAY[]::TEXT[]), ' ') AS instagram_ready_caption,
  mac.weight,
  mac.times_used,
  mac.engagement_rate
FROM public.marketing_authority_concepts mac
WHERE mac.is_active = true
  AND mac.full_caption_template IS NOT NULL
ORDER BY mac.weight DESC, mac.engagement_rate DESC;

COMMENT ON VIEW v_authority_posts_ready IS
'Vista de posts de autoridad listos para publicar con caption formateado para Instagram';

-- 4. Log
INSERT INTO public.social_publishing_scheduler_log (
  job_name,
  execution_time,
  status,
  campaigns_processed,
  campaigns_published,
  error_message
) VALUES (
  'survivorship-bias-concept-update',
  now(),
  'success',
  1,
  0,
  'Updated Sesgo de Supervivencia Retrospectivo with polished text, hook, first comment, and split-screen image reference'
);
