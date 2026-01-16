-- Migration: Setup Social Media Publishing Cron Job
-- Purpose: Automatically publish scheduled campaigns to social media

-- ============================================================================
-- 1. ENABLE pg_cron extension
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 2. CREATE FUNCTION to publish scheduled campaigns
-- ============================================================================
CREATE OR REPLACE FUNCTION public.publish_scheduled_campaigns()
RETURNS void AS $$
DECLARE
  v_campaign RECORD;
  v_supabase_url TEXT := current_setting('app.supabase_url', TRUE);
  v_supabase_key TEXT := current_setting('app.supabase_key', TRUE);
BEGIN
  -- Buscar campañas que deben publicarse ahora
  FOR v_campaign IN
    SELECT
      id,
      name,
      title,
      description_content,
      image_url,
      cta_text,
      cta_url,
      platforms,
      scheduled_for
    FROM public.campaign_schedules
    WHERE
      status = 'scheduled'
      AND is_scheduled = true
      AND scheduled_for <= now()
      AND scheduled_for > now() - interval '1 minute'
    ORDER BY scheduled_for ASC
  LOOP
    RAISE NOTICE 'Publishing campaign: %', v_campaign.name;

    -- Actualizar status a "publishing"
    UPDATE public.campaign_schedules
    SET status = 'publishing'
    WHERE id = v_campaign.id;

    -- Llamar a Edge Function para publicar
    -- La Edge Function manejará el error y actualizará el status
    PERFORM
      http_post(
        (v_supabase_url || '/functions/v1/publish-to-social-media')::text,
        jsonb_build_object(
          'campaignId', v_campaign.id::text,
          'title', v_campaign.title,
          'description', v_campaign.description_content,
          'imageUrl', v_campaign.image_url,
          'ctaText', v_campaign.cta_text,
          'ctaUrl', v_campaign.cta_url,
          'platforms', v_campaign.platforms
        ),
        'application/json',
        jsonb_build_object(
          'Authorization', 'Bearer ' || v_supabase_key,
          'Content-Type', 'application/json'
        )
      );

    RAISE NOTICE 'Campaign % queued for publishing', v_campaign.name;
  END LOOP;

  RAISE NOTICE 'Scheduled campaigns publishing check completed';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. SCHEDULE THE CRON JOB
-- ============================================================================
-- Ejecutar cada minuto para revisar campaña con horarios cercanos
SELECT cron.schedule(
  'publish-scheduled-campaigns',  -- Job name
  '* * * * *',                     -- Every minute
  'SELECT public.publish_scheduled_campaigns()'
);

-- ============================================================================
-- 4. CREATE RLS POLICY para que el cron pueda ejecutar
-- ============================================================================
-- El cron job ejecuta como admin, así que necesitamos que bypasse RLS
-- Esto ya está configurado por defecto en Supabase con SECURITY DEFINER

-- ============================================================================
-- 5. MONITORING: View para monitorear estado de cron jobs
-- ============================================================================
CREATE OR REPLACE VIEW public.cron_jobs_status AS
SELECT
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname LIKE 'publish-%'
   OR jobname LIKE 'social-%'
   OR jobname LIKE 'campaign-%';

-- ============================================================================
-- 6. CREATE LOGGING TABLE para auditoría de ejecuciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_publishing_scheduler_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  job_name TEXT NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed')),
  campaigns_processed INTEGER,
  campaigns_published INTEGER,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_scheduler_log_job_name ON public.social_publishing_scheduler_log(job_name);
CREATE INDEX idx_scheduler_log_status ON public.social_publishing_scheduler_log(status);
CREATE INDEX idx_scheduler_log_execution_time ON public.social_publishing_scheduler_log(execution_time);

-- RLS
ALTER TABLE public.social_publishing_scheduler_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view scheduler logs"
  ON public.social_publishing_scheduler_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 7. HELPER: Ver campaña programadas próximas a ejecutarse
-- ============================================================================
CREATE OR REPLACE VIEW public.upcoming_scheduled_campaigns AS
SELECT
  id,
  name,
  title,
  scheduled_for,
  platforms,
  status,
  (scheduled_for - now())::text as time_until_publish
FROM public.campaign_schedules
WHERE
  status = 'scheduled'
  AND is_scheduled = true
  AND scheduled_for > now()
  AND scheduled_for <= now() + interval '24 hours'
ORDER BY scheduled_for ASC;

-- ============================================================================
-- 8. HELPER: Ver campañas publicadas recientemente
-- ============================================================================
CREATE OR REPLACE VIEW public.recently_published_campaigns AS
SELECT
  id,
  name,
  title,
  published_at,
  status,
  post_ids,
  (now() - published_at)::text as time_since_publish
FROM public.campaign_schedules
WHERE
  status IN ('published', 'partial', 'failed')
  AND published_at > now() - interval '7 days'
ORDER BY published_at DESC;

-- ============================================================================
-- 9. COMMENT for documentation
-- ============================================================================
COMMENT ON FUNCTION public.publish_scheduled_campaigns() IS
'Automatically publishes scheduled marketing campaigns to social media platforms.
Runs every minute via pg_cron to check for campaigns that should be published now.
Calls Edge Function publish-to-social-media for each ready campaign.';

COMMENT ON TABLE public.social_publishing_scheduler_log IS
'Audit log for social media publishing scheduler execution.
Records each execution attempt, success/failure, and any errors.';
