-- Migration: Update cron jobs to read secrets from app_config table
-- Purpose: Replace current_setting() with app_config table lookup
-- Created: 2026-01-23

-- Update generate_daily_content_batch() to read from app_config
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

  -- Content pools por categoria
  v_authority_types text[] := ARRAY['authority'];
  v_lifestyle_types text[] := ARRAY['seasonal', 'car_spotlight'];
  v_engagement_types text[] := ARRAY['tip', 'promo', 'community', 'testimonial'];
BEGIN
  -- =========================================================================
  -- READ SECRETS FROM app_config TABLE (JSONB values, extract as text)
  -- =========================================================================
  SELECT value::text INTO v_supabase_url
  FROM public.app_config
  WHERE key = 'SUPABASE_URL'
  LIMIT 1;
  
  SELECT value::text INTO v_supabase_key
  FROM public.app_config
  WHERE key = 'SUPABASE_SERVICE_KEY'
  LIMIT 1;
  
  -- Remove JSON quotes if present
  v_supabase_url := TRIM(BOTH '"' FROM v_supabase_url);
  v_supabase_key := TRIM(BOTH '"' FROM v_supabase_key);

  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    INSERT INTO public.social_publishing_scheduler_log (
      job_name,
      execution_time,
      status,
      campaigns_processed,
      campaigns_published,
      error_message
    ) VALUES (
      'generate-daily-content-batch',
      now(),
      'failed',
      0,
      0,
      'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in app_config table.'
    );

    RAISE WARNING 'Supabase URL or Key not found in app_config. Cannot generate content.';
    RETURN;
  END IF;

  -- Log successful config read
  RAISE NOTICE '[cron] Read config from app_config: URL=%, KEY=***', v_supabase_url;

  -- Obtener dia de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sabado)
  v_day_of_week := EXTRACT(DOW FROM now());

  -- ==========================================================================
  -- CONTENT MIX STRATEGY (40/40/20)
  -- ==========================================================================
  -- Lunes (1) y Jueves (4): AUTORIDAD - Scroll-stopping psychology
  -- Sabado (6) y Domingo (0): LIFESTYLE - Viajes y aspiracional
  -- Martes (2), Miercoles (3), Viernes (5): ENGAGEMENT - Tips y comunidad
  -- ==========================================================================

  IF v_day_of_week IN (1, 4) THEN
    -- AUTORIDAD: Contenido de impacto psicologico
    v_content_type := 'authority';
    RAISE NOTICE '[content-mix] Day % -> AUTHORITY mode (scroll-stopping psychology)', v_day_of_week;

  ELSIF v_day_of_week IN (0, 6) THEN
    -- LIFESTYLE: Contenido aspiracional (fines de semana = mas engagement casual)
    v_content_type := v_lifestyle_types[floor(random() * array_length(v_lifestyle_types, 1) + 1)];
    RAISE NOTICE '[content-mix] Day % -> LIFESTYLE mode (aspirational content): %', v_day_of_week, v_content_type;

  ELSE
    -- ENGAGEMENT: Tips, promos, comunidad (dias laborales normales)
    v_content_type := v_engagement_types[floor(random() * array_length(v_engagement_types, 1) + 1)];
    RAISE NOTICE '[content-mix] Day % -> ENGAGEMENT mode (tips/community): %', v_day_of_week, v_content_type;
  END IF;

  BEGIN
    -- Generar contenido para cada plataforma activa
    FOREACH v_platform IN ARRAY v_platforms LOOP
      RAISE NOTICE 'Generating content for % (Type: %)', v_platform, v_content_type;

      -- Call generate-marketing-content Edge Function
      PERFORM
        net.http_post(
          url := (v_supabase_url || '/functions/v1/generate-marketing-content'),
          body := jsonb_build_object(
            'platform', v_platform,
            'content_type', v_content_type,
            'batch_mode', true,
            'save_to_db', true,
            'language', 'es',
            'generate_image', true
          ),
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_supabase_key,
            'Content-Type', 'application/json'
          )
        );
    END LOOP;

    -- Log success
    INSERT INTO public.social_publishing_scheduler_log (
      job_name,
      execution_time,
      status,
      campaigns_processed,
      campaigns_published,
      error_message
    ) VALUES (
      'generate-daily-content-batch',
      now(),
      'success',
      array_length(v_platforms, 1),
      0,
      format('Content type: %s, Platforms: %s', v_content_type, array_to_string(v_platforms, ', '))
    );

    RAISE NOTICE 'Daily content generation completed. Content type: %', v_content_type;

  EXCEPTION WHEN OTHERS THEN
    -- Log failure
    INSERT INTO public.social_publishing_scheduler_log (
      job_name,
      execution_time,
      status,
      campaigns_processed,
      campaigns_published,
      error_message
    ) VALUES (
      'generate-daily-content-batch',
      now(),
      'failed',
      0,
      0,
      'Error: ' || SQLERRM
    );
    RAISE WARNING 'Error during content generation: %', SQLERRM;
    -- Re-raise to ensure external callers know it failed
    RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION public.generate_daily_content_batch() IS 
'Generates daily marketing content by calling the generate-marketing-content Edge Function. Reads secrets from app_config table (2026-01-23 update).';
