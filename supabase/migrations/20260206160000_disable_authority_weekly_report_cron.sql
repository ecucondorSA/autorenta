DO $$
BEGIN
  PERFORM cron.unschedule('authority-weekly-report');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
