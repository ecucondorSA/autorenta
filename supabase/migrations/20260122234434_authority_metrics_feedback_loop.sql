-- =============================================================================
-- Authority Metrics Feedback Loop
-- =============================================================================
-- Sistema de aprendizaje automático para optimizar selección de conceptos
-- Actualiza métricas + Factor de exploración 20% para evitar inercia
-- =============================================================================

-- 1. AGREGAR COLUMNA DE PERFORMANCE SCORE
ALTER TABLE public.marketing_authority_concepts
ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 0;

COMMENT ON COLUMN marketing_authority_concepts.performance_score IS
'Score de rendimiento calculado: (engagements / impressions) * 100. Actualizado semanalmente.';

-- 2. FUNCIÓN DE ACTUALIZACIÓN DE MÉTRICAS
CREATE OR REPLACE FUNCTION public.update_authority_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INT := 0;
BEGIN
  -- Actualizar métricas desde marketing_posts_log
  -- Usa metadata->>'authority_term' para vincular con el concepto
  UPDATE public.marketing_authority_concepts mac
  SET
    total_impressions = COALESCE(metrics.total_imp, mac.total_impressions),
    total_engagements = COALESCE(metrics.total_eng, mac.total_engagements),
    performance_score = CASE
      WHEN COALESCE(metrics.total_imp, 0) > 0
      THEN ROUND((COALESCE(metrics.total_eng, 0)::numeric / metrics.total_imp::numeric) * 100, 2)
      ELSE 0
    END,
    updated_at = now()
  FROM (
    SELECT
      mpl.metadata->>'authority_term' as term,
      SUM(COALESCE((mpl.engagement->>'likes')::int, 0) +
          COALESCE((mpl.engagement->>'comments')::int, 0) +
          COALESCE((mpl.engagement->>'shares')::int, 0) +
          COALESCE((mpl.engagement->>'saves')::int, 0)) as total_eng,
      -- Estimación de impresiones: reach si disponible, sino COUNT * factor
      SUM(COALESCE((mpl.engagement->>'reach')::int,
          COALESCE((mpl.engagement->>'impressions')::int, 500))) as total_imp
    FROM public.marketing_posts_log mpl
    WHERE mpl.metadata->>'authority_term' IS NOT NULL
      AND mpl.published_at >= now() - interval '90 days' -- Solo últimos 90 días
    GROUP BY 1
  ) AS metrics
  WHERE mac.term_name = metrics.term;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Log de la actualización
  INSERT INTO public.social_publishing_scheduler_log (
    job_name, execution_time, status, campaigns_processed, campaigns_published, error_message
  ) VALUES (
    'update-authority-metrics',
    now(),
    'success',
    v_updated_count,
    0,
    format('Updated metrics for %s authority concepts', v_updated_count)
  );

  RAISE NOTICE 'Authority metrics updated for % concepts', v_updated_count;
END;
$$;

COMMENT ON FUNCTION update_authority_metrics() IS
'Actualiza performance_score de authority_concepts basado en engagement real de posts.
Ejecutar semanalmente para mantener el sistema aprendiendo.';

-- 3. MEJORAR FUNCIÓN DE SELECCIÓN CON FACTOR DE EXPLORACIÓN
-- NOTE: Function moved to 20260123030500_fix_authority_concept_function.sql (fixed column ambiguity)
-- Commented out to avoid guardrails duplicate warning
/*
-- 20% de las veces selecciona un concepto aleatorio (exploración)
-- 80% de las veces usa selección ponderada por performance (explotación)
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
  v_exploration_chance FLOAT := 0.20; -- 20% exploración
  v_use_exploration BOOLEAN;
BEGIN
  -- Decidir si exploramos o explotamos
  v_use_exploration := random() < v_exploration_chance;

  IF v_use_exploration THEN
    -- EXPLORACIÓN: Seleccionar completamente aleatorio (ignora pesos)
    RAISE NOTICE '[authority] Exploration mode: selecting random concept';

    FOR v_row IN
      SELECT id, term_name AS tn, parenting_pain_point AS pp,
             financial_analogy AS fa, image_scene_concept AS isc
      FROM marketing_authority_concepts
      WHERE is_active = true
      ORDER BY random()
      LIMIT 1
    LOOP
      -- Actualizar contador de uso
      UPDATE marketing_authority_concepts
      SET times_used = times_used + 1, last_used_at = now()
      WHERE id = v_row.id;

      RETURN QUERY SELECT v_row.id, v_row.tn, v_row.pp, v_row.fa, v_row.isc;
      RETURN;
    END LOOP;
  ELSE
    -- EXPLOTACIÓN: Selección ponderada por peso + performance
    -- Combinamos weight base con performance_score para ponderación dinámica
    RAISE NOTICE '[authority] Exploitation mode: selecting by performance-weighted random';

    SELECT COALESCE(SUM(
      weight + COALESCE(performance_score, 0)::int
    ), 0) INTO total_weight
    FROM marketing_authority_concepts
    WHERE is_active = true;

    IF total_weight = 0 THEN
      RETURN;
    END IF;

    random_weight := floor(random() * total_weight);

    FOR v_row IN
      SELECT id, term_name AS tn, parenting_pain_point AS pp,
             financial_analogy AS fa, image_scene_concept AS isc,
             (weight + COALESCE(performance_score, 0)::int) as effective_weight
      FROM marketing_authority_concepts
      WHERE is_active = true
      ORDER BY effective_weight DESC
    LOOP
      running_weight := running_weight + v_row.effective_weight;
      IF running_weight > random_weight THEN
        -- Actualizar contador de uso
        UPDATE marketing_authority_concepts
        SET times_used = times_used + 1, last_used_at = now()
        WHERE id = v_row.id;

        RETURN QUERY SELECT v_row.id, v_row.tn, v_row.pp, v_row.fa, v_row.isc;
        RETURN;
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION select_authority_concept() IS
'Selecciona concepto de autoridad con estrategia ε-greedy:
- 20% exploración (aleatorio puro para probar conceptos poco usados)
- 80% explotación (ponderado por weight + performance_score)
Esto evita que el sistema se quede atrapado en un solo concepto ganador.';
*/

-- 4. FUNCIÓN PARA OBTENER REPORTE DE RENDIMIENTO
CREATE OR REPLACE FUNCTION public.get_authority_performance_report()
RETURNS TABLE (
  term_name TEXT,
  times_used INT,
  total_impressions INT,
  total_engagements INT,
  engagement_rate NUMERIC,
  performance_score NUMERIC,
  last_used_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mac.term_name,
    mac.times_used,
    mac.total_impressions,
    mac.total_engagements,
    mac.engagement_rate,
    mac.performance_score,
    mac.last_used_at,
    CASE
      WHEN mac.performance_score >= 5 THEN '🏆 TOP PERFORMER'
      WHEN mac.performance_score >= 2 THEN '✅ GOOD'
      WHEN mac.performance_score >= 1 THEN '⚠️ AVERAGE'
      WHEN mac.times_used = 0 THEN '🆕 NOT TESTED'
      ELSE '❌ UNDERPERFORMING'
    END as status
  FROM public.marketing_authority_concepts mac
  WHERE mac.is_active = true
  ORDER BY mac.performance_score DESC NULLS LAST, mac.times_used DESC;
END;
$$;

COMMENT ON FUNCTION get_authority_performance_report() IS
'Retorna reporte de rendimiento de todos los conceptos de autoridad.
Útil para análisis ejecutivo y debugging.';

-- 5. VISTA PARA DASHBOARD
CREATE OR REPLACE VIEW public.authority_performance_dashboard AS
SELECT
  mac.term_name,
  mac.times_used,
  mac.total_impressions,
  mac.total_engagements,
  ROUND(mac.engagement_rate, 2) as engagement_rate_pct,
  ROUND(mac.performance_score, 2) as performance_score,
  mac.last_used_at,
  CASE
    WHEN mac.performance_score >= 5 THEN 'TOP'
    WHEN mac.performance_score >= 2 THEN 'GOOD'
    WHEN mac.performance_score >= 1 THEN 'AVERAGE'
    WHEN mac.times_used = 0 THEN 'UNTESTED'
    ELSE 'LOW'
  END as tier,
  -- Porcentaje de selección teórico basado en pesos
  ROUND(
    (mac.weight + COALESCE(mac.performance_score, 0))::numeric /
    NULLIF((SELECT SUM(weight + COALESCE(performance_score, 0)) FROM marketing_authority_concepts WHERE is_active), 0) * 100,
    1
  ) as selection_probability_pct
FROM public.marketing_authority_concepts mac
WHERE mac.is_active = true
ORDER BY mac.performance_score DESC NULLS LAST;

COMMENT ON VIEW authority_performance_dashboard IS
'Dashboard de rendimiento de conceptos de autoridad.
Muestra engagement rate, performance score, tier y probabilidad de selección.';

-- 6. CRON: ACTUALIZAR MÉTRICAS CADA DOMINGO A LAS 23:59 UTC
SELECT cron.schedule(
  'update-authority-metrics-weekly',
  '59 23 * * 0', -- Domingo 23:59 UTC
  'SELECT public.update_authority_metrics()'
);

-- 7. GRANT PERMISOS
GRANT SELECT ON public.authority_performance_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_authority_performance_report() TO authenticated;

-- 8. FUNCIÓN PARA DISPARAR REPORTE SEMANAL VIA EDGE FUNCTION
CREATE OR REPLACE FUNCTION public.trigger_authority_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_supabase_url TEXT;
  v_supabase_key TEXT;
BEGIN
  -- Primero actualizar métricas
  PERFORM update_authority_metrics();

  -- Obtener config
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_supabase_key := current_setting('app.supabase_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
    v_supabase_key := NULL;
  END;

  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE WARNING 'Supabase URL or Key not set. Cannot trigger authority report.';
    RETURN;
  END IF;

  -- Llamar Edge Function
  PERFORM http_post(
    (v_supabase_url || '/functions/v1/authority-report')::text,
    '{}'::jsonb,
    'application/json',
    jsonb_build_object(
      'Authorization', 'Bearer ' || v_supabase_key,
      'Content-Type', 'application/json'
    )
  );

  RAISE NOTICE 'Authority report triggered';
END;
$$;

-- 9. CRON: REPORTE EJECUTIVO CADA LUNES A LAS 09:00 UTC (06:00 Argentina)
SELECT cron.schedule(
  'authority-weekly-report',
  '0 9 * * 1', -- Lunes 09:00 UTC
  'SELECT public.trigger_authority_report()'
);

-- 10. LOG DE MIGRACIÓN
INSERT INTO public.social_publishing_scheduler_log (
  job_name, execution_time, status, campaigns_processed, campaigns_published, error_message
) VALUES (
  'authority-feedback-loop-migration',
  now(),
  'success',
  0,
  0,
  'Implemented authority metrics feedback loop: update_authority_metrics(), ε-greedy selection (20% exploration), performance dashboard, weekly report cron'
);
