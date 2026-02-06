DO $$
BEGIN
  PERFORM cron.unschedule('process-email-sequences');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
