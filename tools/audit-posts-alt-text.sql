-- =============================================================================
-- AUDIT: Posts sin alt_text (SEO 2026)
-- =============================================================================
-- Ejecutar en Supabase SQL Editor para identificar posts que necesitan alt_text
-- =============================================================================

-- 1. Resumen general
SELECT
  'RESUMEN' as seccion,
  COUNT(*) as total_posts,
  COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NOT NULL) as con_alt_text,
  COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NULL) as sin_alt_text,
  ROUND(
    COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NOT NULL)::numeric /
    NULLIF(COUNT(*), 0) * 100, 1
  ) as porcentaje_con_alt_text
FROM marketing_content_queue
WHERE media_url IS NOT NULL;

-- 2. Posts publicados sin alt_text (prioridad alta - ya están en redes)
SELECT
  id,
  platform,
  content_type,
  LEFT(text_content, 50) as texto_preview,
  media_type,
  published_at,
  post_url
FROM marketing_content_queue
WHERE status = 'published'
  AND media_url IS NOT NULL
  AND (metadata->>'alt_text' IS NULL OR metadata->>'alt_text' = '')
ORDER BY published_at DESC
LIMIT 20;

-- 3. Posts pendientes sin alt_text (se pueden arreglar antes de publicar)
SELECT
  id,
  platform,
  content_type,
  LEFT(text_content, 50) as texto_preview,
  media_type,
  scheduled_for
FROM marketing_content_queue
WHERE status = 'pending'
  AND media_url IS NOT NULL
  AND (metadata->>'alt_text' IS NULL OR metadata->>'alt_text' = '')
ORDER BY scheduled_for ASC
LIMIT 20;

-- 4. Estadísticas por plataforma
SELECT
  platform,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NOT NULL) as con_alt_text,
  COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NULL) as sin_alt_text
FROM marketing_content_queue
WHERE media_url IS NOT NULL
GROUP BY platform
ORDER BY total DESC;

-- 5. Estadísticas por tipo de contenido
SELECT
  content_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NOT NULL) as con_alt_text,
  COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NULL) as sin_alt_text
FROM marketing_content_queue
WHERE media_url IS NOT NULL
GROUP BY content_type
ORDER BY total DESC;

-- =============================================================================
-- SCRIPT DE GENERACION DE ALT_TEXT (para posts existentes)
-- =============================================================================
-- Este query genera alt_text sugerido basado en el contenido existente
-- Revisar manualmente antes de aplicar

/*
UPDATE marketing_content_queue
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{alt_text}',
  to_jsonb(
    CASE
      WHEN content_type = 'promo' THEN
        'Promoción de alquiler de autos AutoRentar - ' || LEFT(text_content, 80)
      WHEN content_type = 'testimonial' THEN
        'Testimonio de usuario AutoRentar - experiencia de alquiler'
      WHEN content_type = 'educational' THEN
        'Guía AutoRentar - ' || LEFT(text_content, 80)
      WHEN content_type = 'seasonal' THEN
        'Oferta de temporada AutoRentar - alquiler de autos'
      ELSE
        'AutoRentar - alquiler de autos entre personas - ' || LEFT(text_content, 60)
    END
  )
)
WHERE media_url IS NOT NULL
  AND (metadata->>'alt_text' IS NULL OR metadata->>'alt_text' = '')
  AND status = 'pending';
*/
