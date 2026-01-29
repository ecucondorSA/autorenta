-- Migration: Marketing settings fallback + missing-config logging
-- Purpose: Use app.settings.* as fallback for cron secrets and log missing config
-- Created: 2026-01-23

-- 1) generate_daily_content_batch(): add fallback + log missing config
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
  -- Obtener configuracion (con fallback a app.settings.*)
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_supabase_key := current_setting('app.supabase_key', true);

    IF v_supabase_url IS NULL THEN
      v_supabase_url := current_setting('app.settings.supabase_url', true);
    END IF;

    IF v_supabase_key IS NULL THEN
      v_supabase_key := current_setting('app.settings.service_role_key', true);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
    v_supabase_key := NULL;
  END;

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
      'Missing app.supabase_url/app.supabase_key (or app.settings.supabase_url/app.settings.service_role_key).'
    );

    RAISE WARNING 'Supabase URL or Key not set. Cannot generate content.';
    RETURN;
  END IF;

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

-- 2) trigger_marketing_scheduler(): add fallback + log missing config
CREATE OR REPLACE FUNCTION public.trigger_marketing_scheduler()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_supabase_url TEXT;
  v_supabase_key TEXT;
BEGIN
  -- Get secrets safely (with fallback to app.settings.*)
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_supabase_key := current_setting('app.supabase_key', true);

    IF v_supabase_url IS NULL THEN
      v_supabase_url := current_setting('app.settings.supabase_url', true);
    END IF;

    IF v_supabase_key IS NULL THEN
      v_supabase_key := current_setting('app.settings.service_role_key', true);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
    v_supabase_key := NULL;
  END;

  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    INSERT INTO public.social_publishing_scheduler_log (
      job_name,
      execution_time,
      status,
      campaigns_processed,
      campaigns_published,
      error_message
    ) VALUES (
      'trigger-marketing-scheduler',
      now(),
      'failed',
      0,
      0,
      'Missing app.supabase_url/app.supabase_key (or app.settings.supabase_url/app.settings.service_role_key).'
    );

    RAISE WARNING 'Supabase URL or Key not set. Cannot trigger scheduler.';
    RETURN;
  END IF;

  RAISE NOTICE 'Triggering marketing scheduler...';

  -- Call marketing-scheduler Edge Function
  PERFORM
    http_post(
      (v_supabase_url || '/functions/v1/marketing-scheduler')::text,
      jsonb_build_object(
        'max_posts', 10,
        'dry_run', false
      ),
      'application/json',
      jsonb_build_object(
        'Authorization', 'Bearer ' || v_supabase_key,
        'Content-Type', 'application/json'
      )
    );
END;
$$;

-- 3) process_marketing_retries(): add fallback + log missing config
CREATE OR REPLACE FUNCTION public.process_marketing_retries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_retry_count INTEGER;
  v_supabase_url TEXT;
  v_supabase_key TEXT;
BEGIN
  -- Count posts ready for retry
  SELECT COUNT(*)
  INTO v_retry_count
  FROM public.marketing_content_queue
  WHERE status = 'pending'
    AND next_retry_at IS NOT NULL
    AND next_retry_at <= now()
    AND attempts > 0
    AND attempts < 5;

  IF v_retry_count = 0 THEN
    RETURN;
  END IF;

  RAISE NOTICE 'Found % posts ready for retry', v_retry_count;

  -- Get Supabase URL and key (with fallback to app.settings.*)
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_supabase_key := current_setting('app.supabase_key', true);

    IF v_supabase_url IS NULL THEN
      v_supabase_url := current_setting('app.settings.supabase_url', true);
    END IF;

    IF v_supabase_key IS NULL THEN
      v_supabase_key := current_setting('app.settings.service_role_key', true);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
    v_supabase_key := NULL;
  END;

  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    INSERT INTO public.social_publishing_scheduler_log (
      job_name,
      execution_time,
      status,
      campaigns_processed,
      campaigns_published,
      error_message
    ) VALUES (
      'marketing-retry-processor',
      now(),
      'failed',
      v_retry_count,
      0,
      'Missing app.supabase_url/app.supabase_key (or app.settings.supabase_url/app.settings.service_role_key).'
    );

    RAISE WARNING 'Supabase URL or Key not set. Cannot process retries.';
    RETURN;
  END IF;

  -- Trigger the marketing scheduler to process these
  PERFORM http_post(
    (v_supabase_url || '/functions/v1/marketing-scheduler')::text,
    jsonb_build_object('max_posts', 5, 'retry_mode', true),
    'application/json',
    jsonb_build_object(
      'Authorization', 'Bearer ' || v_supabase_key,
      'Content-Type', 'application/json'
    )
  );

  -- Log the retry attempt
  INSERT INTO public.social_publishing_scheduler_log (
    job_name,
    execution_time,
    status,
    campaigns_processed,
    campaigns_published,
    error_message
  ) VALUES (
    'marketing-retry-processor',
    now(),
    'info',
    v_retry_count,
    0,
    format('Triggered retry for %s pending posts', v_retry_count)
  );
END;
$$;
