-- =============================================================================
-- Marketing SEO Dashboard Functions (SEO 2026)
-- =============================================================================
-- Funciones para analytics y dashboard de métricas de marketing
-- =============================================================================

-- Vista materializada para métricas diarias
CREATE MATERIALIZED VIEW IF NOT EXISTS public.marketing_daily_metrics AS
SELECT
  DATE(scheduled_for) as post_date,
  platform,
  content_type,
  COUNT(*) as total_posts,
  COUNT(*) FILTER (WHERE status = 'published') as published,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NOT NULL AND metadata->>'alt_text' != '') as with_alt_text,
  COUNT(*) FILTER (WHERE media_type = 'reels') as reels_count,
  AVG(ARRAY_LENGTH(hashtags, 1)) as avg_hashtags
FROM marketing_content_queue
GROUP BY DATE(scheduled_for), platform, content_type;

-- Índice para la vista
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_daily_metrics
ON marketing_daily_metrics(post_date, platform, content_type);

-- Función para refrescar métricas
CREATE OR REPLACE FUNCTION public.refresh_marketing_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY marketing_daily_metrics;
END;
$$;

-- Función principal de dashboard
CREATE OR REPLACE FUNCTION public.get_marketing_dashboard(
  p_days_back int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  start_date timestamptz;
BEGIN
  start_date := NOW() - (p_days_back || ' days')::interval;

  SELECT jsonb_build_object(
    'summary', (
      SELECT jsonb_build_object(
        'total_posts', COUNT(*),
        'published', COUNT(*) FILTER (WHERE status = 'published'),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'with_alt_text', COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NOT NULL AND metadata->>'alt_text' != ''),
        'reels_count', COUNT(*) FILTER (WHERE media_type = 'reels'),
        'seo_score', ROUND(
          (COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NOT NULL AND metadata->>'alt_text' != '')::numeric /
          NULLIF(COUNT(*), 0) * 100), 1
        )
      )
      FROM marketing_content_queue
      WHERE scheduled_for >= start_date
    ),
    'by_platform', (
      SELECT jsonb_agg(row_to_json(p))
      FROM (
        SELECT
          platform,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'published') as published,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM marketing_content_queue
        WHERE scheduled_for >= start_date
        GROUP BY platform
        ORDER BY total DESC
      ) p
    ),
    'by_content_type', (
      SELECT jsonb_agg(row_to_json(c))
      FROM (
        SELECT
          content_type,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'published') as published
        FROM marketing_content_queue
        WHERE scheduled_for >= start_date
        GROUP BY content_type
        ORDER BY total DESC
      ) c
    ),
    'daily_trend', (
      SELECT jsonb_agg(row_to_json(d))
      FROM (
        SELECT
          DATE(scheduled_for) as date,
          COUNT(*) as posts,
          COUNT(*) FILTER (WHERE status = 'published') as published
        FROM marketing_content_queue
        WHERE scheduled_for >= start_date
        GROUP BY DATE(scheduled_for)
        ORDER BY date DESC
        LIMIT 30
      ) d
    ),
    'ab_testing', (
      SELECT jsonb_agg(row_to_json(ab))
      FROM (
        SELECT
          variant_name,
          content_type,
          impressions,
          engagements,
          engagement_rate,
          saves,
          shares
        FROM marketing_hook_variants
        WHERE is_active = true
        ORDER BY engagement_rate DESC
        LIMIT 10
      ) ab
    ),
    'top_performing', (
      SELECT jsonb_agg(row_to_json(tp))
      FROM (
        SELECT
          id,
          platform,
          LEFT(text_content, 80) as preview,
          post_url,
          published_at
        FROM marketing_content_queue
        WHERE status = 'published' AND post_url IS NOT NULL
        ORDER BY published_at DESC
        LIMIT 5
      ) tp
    ),
    'recent_failures', (
      SELECT jsonb_agg(row_to_json(f))
      FROM (
        SELECT
          id,
          platform,
          LEFT(text_content, 50) as preview,
          error_message,
          scheduled_for
        FROM marketing_content_queue
        WHERE status = 'failed'
        ORDER BY scheduled_for DESC
        LIMIT 5
      ) f
    ),
    'bio_links', (
      SELECT jsonb_agg(row_to_json(bl))
      FROM (
        SELECT
          title,
          click_count,
          platform
        FROM marketing_bio_links
        WHERE is_active = true
        ORDER BY click_count DESC
        LIMIT 5
      ) bl
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Función para obtener métricas de A/B testing específicas
CREATE OR REPLACE FUNCTION public.get_ab_testing_report(
  p_content_type text DEFAULT NULL
)
RETURNS TABLE(
  variant_name text,
  content_type text,
  hook_template text,
  impressions int,
  engagements int,
  engagement_rate numeric,
  saves int,
  shares int,
  link_clicks int,
  winner_score numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    hv.variant_name,
    hv.content_type,
    hv.hook_template,
    hv.impressions,
    hv.engagements,
    hv.engagement_rate,
    hv.saves,
    hv.shares,
    hv.link_clicks,
    -- Score ponderado: engagement_rate * 0.3 + saves_rate * 0.3 + shares_rate * 0.2 + clicks_rate * 0.2
    ROUND(
      hv.engagement_rate * 0.3 +
      (CASE WHEN hv.impressions > 0 THEN hv.saves::numeric / hv.impressions * 100 ELSE 0 END) * 0.3 +
      (CASE WHEN hv.impressions > 0 THEN hv.shares::numeric / hv.impressions * 100 ELSE 0 END) * 0.2 +
      (CASE WHEN hv.impressions > 0 THEN hv.link_clicks::numeric / hv.impressions * 100 ELSE 0 END) * 0.2,
      2
    ) as winner_score
  FROM marketing_hook_variants hv
  WHERE hv.is_active = true
    AND (p_content_type IS NULL OR hv.content_type = p_content_type)
  ORDER BY winner_score DESC;
END;
$$;

-- Función para obtener SEO health score
CREATE OR REPLACE FUNCTION public.get_seo_health_score()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  alt_text_score numeric;
  hashtag_score numeric;
  reels_score numeric;
  bio_links_score numeric;
  overall_score numeric;
BEGIN
  -- Alt text score (posts con alt text / total posts con media)
  SELECT ROUND(
    COUNT(*) FILTER (WHERE metadata->>'alt_text' IS NOT NULL AND metadata->>'alt_text' != '')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE media_url IS NOT NULL), 0) * 100, 1
  ) INTO alt_text_score
  FROM marketing_content_queue
  WHERE scheduled_for >= NOW() - INTERVAL '30 days';

  -- Hashtag score (posts con 3-5 hashtags / total)
  SELECT ROUND(
    COUNT(*) FILTER (WHERE ARRAY_LENGTH(hashtags, 1) BETWEEN 3 AND 5)::numeric /
    NULLIF(COUNT(*), 0) * 100, 1
  ) INTO hashtag_score
  FROM marketing_content_queue
  WHERE scheduled_for >= NOW() - INTERVAL '30 days';

  -- Reels score (videos publicados como reels / total videos instagram)
  SELECT ROUND(
    COUNT(*) FILTER (WHERE media_type = 'reels')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE platform = 'instagram' AND media_type IN ('video', 'reels')), 0) * 100, 1
  ) INTO reels_score
  FROM marketing_content_queue
  WHERE scheduled_for >= NOW() - INTERVAL '30 days';

  -- Bio links score (links activos con clicks)
  SELECT ROUND(
    COUNT(*) FILTER (WHERE click_count > 0)::numeric /
    NULLIF(COUNT(*), 0) * 100, 1
  ) INTO bio_links_score
  FROM marketing_bio_links
  WHERE is_active = true;

  -- Overall score
  overall_score := ROUND(
    COALESCE(alt_text_score, 0) * 0.3 +
    COALESCE(hashtag_score, 0) * 0.2 +
    COALESCE(reels_score, 0) * 0.3 +
    COALESCE(bio_links_score, 0) * 0.2,
    1
  );

  result := jsonb_build_object(
    'overall_score', overall_score,
    'breakdown', jsonb_build_object(
      'alt_text', jsonb_build_object('score', COALESCE(alt_text_score, 0), 'weight', 30, 'tip', 'Agregar alt text a todas las imágenes'),
      'hashtags', jsonb_build_object('score', COALESCE(hashtag_score, 0), 'weight', 20, 'tip', 'Usar 3-5 hashtags por post'),
      'reels', jsonb_build_object('score', COALESCE(reels_score, 0), 'weight', 30, 'tip', 'Publicar videos como Reels en Instagram'),
      'bio_links', jsonb_build_object('score', COALESCE(bio_links_score, 0), 'weight', 20, 'tip', 'Mantener links en bio actualizados')
    ),
    'grade', CASE
      WHEN overall_score >= 90 THEN 'A+'
      WHEN overall_score >= 80 THEN 'A'
      WHEN overall_score >= 70 THEN 'B'
      WHEN overall_score >= 60 THEN 'C'
      WHEN overall_score >= 50 THEN 'D'
      ELSE 'F'
    END
  );

  RETURN result;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION get_marketing_dashboard IS 'Dashboard principal de métricas de marketing - SEO 2026';
COMMENT ON FUNCTION get_ab_testing_report IS 'Reporte de A/B testing de hooks con winner score';
COMMENT ON FUNCTION get_seo_health_score IS 'Health score de SEO social con breakdown por categoría';
