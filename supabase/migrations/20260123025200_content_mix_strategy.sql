-- =============================================================================
-- Content Mix Strategy - Intelligent Content Type Selection
-- =============================================================================
-- Implementa distribución 40/40/20 basada en día de la semana:
-- - 40% Autoridad (Lunes y Jueves): Contenido de scroll-stopping psicológico
-- - 40% Estilo de Vida (Sábado y Domingo): Contenido aspiracional y viajes
-- - 20% Tips/Comunidad (Martes, Miércoles, Viernes): Valor técnico y engagement
-- =============================================================================

-- 1. ACTUALIZAR generate_daily_content_batch() CON CONTENT MIX
CREATE OR REPLACE FUNCTION public.generate_daily_content_batch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_platforms text[] := ARRAY['instagram', 'facebook'];
  v_platform text;
  v_content_type text;
  v_day_of_week int;
  v_supabase_url TEXT;
  v_supabase_key TEXT;

  -- Content pools por categoría
  v_authority_types text[] := ARRAY['authority'];
  v_lifestyle_types text[] := ARRAY['seasonal', 'car_spotlight'];
  v_engagement_types text[] := ARRAY['tip', 'promo', 'community', 'testimonial'];
BEGIN
  -- Obtener configuración
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_supabase_key := current_setting('app.supabase_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
    v_supabase_key := NULL;
  END;

  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE WARNING 'Supabase URL or Key not set. Cannot generate content.';
    RETURN;
  END IF;

  -- Obtener día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
  v_day_of_week := EXTRACT(DOW FROM now());

  -- ==========================================================================
  -- CONTENT MIX STRATEGY (40/40/20)
  -- ==========================================================================
  -- Lunes (1) y Jueves (4): AUTORIDAD - Scroll-stopping psychology
  -- Sábado (6) y Domingo (0): LIFESTYLE - Viajes y aspiracional
  -- Martes (2), Miércoles (3), Viernes (5): ENGAGEMENT - Tips y comunidad
  -- ==========================================================================

  IF v_day_of_week IN (1, 4) THEN
    -- AUTORIDAD: Contenido de impacto psicológico
    v_content_type := 'authority';
    RAISE NOTICE '[content-mix] Day % → AUTHORITY mode (scroll-stopping psychology)', v_day_of_week;

  ELSIF v_day_of_week IN (0, 6) THEN
    -- LIFESTYLE: Contenido aspiracional (fines de semana = más engagement casual)
    v_content_type := v_lifestyle_types[floor(random() * array_length(v_lifestyle_types, 1) + 1)];
    RAISE NOTICE '[content-mix] Day % → LIFESTYLE mode (aspirational content): %', v_day_of_week, v_content_type;

  ELSE
    -- ENGAGEMENT: Tips, promos, comunidad (días laborales normales)
    v_content_type := v_engagement_types[floor(random() * array_length(v_engagement_types, 1) + 1)];
    RAISE NOTICE '[content-mix] Day % → ENGAGEMENT mode (tips/community): %', v_day_of_week, v_content_type;
  END IF;

  -- Generar contenido para cada plataforma activa
  FOREACH v_platform IN ARRAY v_platforms LOOP
    RAISE NOTICE 'Generating content for % (Type: %)', v_platform, v_content_type;

    -- Call generate-marketing-content Edge Function
    PERFORM
      http_post(
        (v_supabase_url || '/functions/v1/generate-marketing-content')::text,
        jsonb_build_object(
          'platform', v_platform,
          'content_type', v_content_type,
          'batch_mode', true,
          'save_to_db', true,
          'language', 'es',
          'generate_image', true
        ),
        'application/json',
        jsonb_build_object(
          'Authorization', 'Bearer ' || v_supabase_key,
          'Content-Type', 'application/json'
        )
      );
  END LOOP;

  RAISE NOTICE 'Daily content generation completed. Content type: %', v_content_type;
END;
$$;

COMMENT ON FUNCTION public.generate_daily_content_batch() IS
'Generates daily marketing content with intelligent Content Mix strategy:
- Monday & Thursday (40%): Authority posts (psychological scroll-stoppers)
- Saturday & Sunday (40%): Lifestyle posts (aspirational travel/car content)
- Tue/Wed/Fri (20%): Engagement posts (tips, promos, community)

This distribution maximizes both reach (lifestyle) and conversion (authority).
Only generates for Instagram and Facebook (TikTok/Twitter suspended).';

-- 2. VISTA DE CALENDARIO DE CONTENIDO
CREATE OR REPLACE VIEW public.content_mix_calendar AS
WITH days AS (
  SELECT generate_series(0, 6) as day_num
)
SELECT
  day_num,
  CASE day_num
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Lunes'
    WHEN 2 THEN 'Martes'
    WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves'
    WHEN 5 THEN 'Viernes'
    WHEN 6 THEN 'Sábado'
  END as day_name,
  CASE
    WHEN day_num IN (1, 4) THEN 'authority'
    WHEN day_num IN (0, 6) THEN 'lifestyle'
    ELSE 'engagement'
  END as content_category,
  CASE
    WHEN day_num IN (1, 4) THEN 'Scroll-stopping psychology'
    WHEN day_num IN (0, 6) THEN 'Aspirational travel/car'
    ELSE 'Tips, promos, community'
  END as description,
  CASE
    WHEN day_num IN (1, 4) THEN '🧠'
    WHEN day_num IN (0, 6) THEN '✈️'
    ELSE '💡'
  END as emoji
FROM days
ORDER BY
  CASE day_num
    WHEN 0 THEN 7  -- Domingo al final
    ELSE day_num
  END;

COMMENT ON VIEW public.content_mix_calendar IS
'Calendario visual del Content Mix Strategy semanal.
Muestra qué tipo de contenido se genera cada día.';

-- 3. FUNCIÓN PARA OBTENER PRÓXIMOS TIPOS DE CONTENIDO
CREATE OR REPLACE FUNCTION public.get_next_content_schedule(days_ahead INT DEFAULT 7)
RETURNS TABLE (
  scheduled_date DATE,
  day_name TEXT,
  content_category TEXT,
  content_types TEXT[],
  emoji TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH future_days AS (
    SELECT
      (CURRENT_DATE + d)::date as sched_date,
      EXTRACT(DOW FROM CURRENT_DATE + d)::int as dow
    FROM generate_series(0, days_ahead - 1) as d
  )
  SELECT
    fd.sched_date,
    CASE fd.dow
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Lunes'
      WHEN 2 THEN 'Martes'
      WHEN 3 THEN 'Miércoles'
      WHEN 4 THEN 'Jueves'
      WHEN 5 THEN 'Viernes'
      WHEN 6 THEN 'Sábado'
    END::text,
    CASE
      WHEN fd.dow IN (1, 4) THEN 'authority'
      WHEN fd.dow IN (0, 6) THEN 'lifestyle'
      ELSE 'engagement'
    END::text,
    CASE
      WHEN fd.dow IN (1, 4) THEN ARRAY['authority']
      WHEN fd.dow IN (0, 6) THEN ARRAY['seasonal', 'car_spotlight']
      ELSE ARRAY['tip', 'promo', 'community', 'testimonial']
    END::text[],
    CASE
      WHEN fd.dow IN (1, 4) THEN '🧠'
      WHEN fd.dow IN (0, 6) THEN '✈️'
      ELSE '💡'
    END::text
  FROM future_days fd
  ORDER BY fd.sched_date;
END;
$$;

COMMENT ON FUNCTION get_next_content_schedule(INT) IS
'Retorna el calendario de contenido programado para los próximos N días.
Útil para visualizar y planificar el Content Mix.';

-- 4. LOG DE MIGRACIÓN
INSERT INTO public.social_publishing_scheduler_log (
  job_name, execution_time, status, campaigns_processed, campaigns_published, error_message
) VALUES (
  'content-mix-strategy-migration',
  now(),
  'success',
  0,
  0,
  'Implemented Content Mix 40/40/20: Authority (Mon/Thu), Lifestyle (Sat/Sun), Engagement (Tue/Wed/Fri)'
);
