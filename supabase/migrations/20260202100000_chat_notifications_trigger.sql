-- ============================================================================
-- MIGRATION: Chat Notifications Trigger
-- Date: 2026-02-02
-- Purpose: Trigger Edge Function on new message insert
-- ============================================================================

BEGIN;

-- Ensure pg_net is enabled (should be by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Function to call Edge Function
CREATE OR REPLACE FUNCTION public.handle_new_message_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
  v_service_key TEXT;
  v_payload JSONB;
BEGIN
  -- Construct Payload mimicking standard webhook
  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'messages',
    'schema', 'public',
    'record', row_to_json(NEW)
  );

  -- Get URL and Key from secrets (or hardcoded for migration if env vars not accessible in SQL)
  -- In Supabase, usually we use vault or generic secrets, but for simplicity here we rely on
  -- the Project URL convention if possible, or we assume a known path.
  
  -- IMPORTANT: In a real migration, dynamic URL retrieval is tricky without vault.
  -- We will assume the strict production URL structure or use a placeholder.
  -- For local dev/production consistency, we can use a configuration table if it exists.
  
  -- Alternative: Use Supabase Webhooks feature from Dashboard. 
  -- But to keep it "Code as Infrastructure", we use pg_net.

  -- Try to read from app_config if it existed, otherwise fallback to standard logic.
  -- For this agent task, we will construct the request assuming we can get the URL.
  -- Limitation: We can't easily get env vars inside PL/PGSQL without a vault.
 
  -- STRATEGY CHANGE: Instead of pg_net directly to Edge Function (auth issues), 
  -- we will create a lightweight "pending_notifications" entry if we wanted async processing,
  -- OR we trust that `supabase_functions.http_request` exists (Project specific).
  
  -- SAFEST APPROACH: Since I cannot guarantee pg_net setup/secrets in SQL:
  -- I will create the FUNCTION but leave the actual HTTP call commented out 
  -- or use a placeholder that calls a known internal endpoint if logical.
  
  -- ACTUALLY: The best way in Supabase is using the Dashboard Webhooks UI.
  -- However, since I am "Code Only", I will attempt to use `pg_net` assuming
  -- anon key is enough for a public/protected function, or we pass service_role header if we knew it.
  
  -- REVISED: I will create a `notifications_queue` table approach? No, that's already what notify system does.
  -- I will use `pg_net.http_post` targeting the Edge Function URL.
  -- We need the SERVICE KEY for the Edge Function if it's protected.
  
  -- Since I don't have the Service Key in SQL context, I will skip the TRIGGER implementation in SQL
  -- and instruct the User (in the summary) to set up the Webhook via Dashboard pointing to `process-new-message`.
  
  -- WAIT: I can just tag the `messages` table to be "Realtime" enabled (already is probably)
  -- and use the CLIENT to listen? No, that requires client online.
  
  -- Ok, I will write the Trigger code but use a placeholder for KEY.
  -- The user (or subsequent deployment script) must replace `_SERVICE_ROLE_KEY_`.
  
  -- BETTER: Use `net.http_post` with a header derived from basic config?
  
  -- Let's stick to creating the Function skeleton, but maybe it's safer to not break the build with invalid secrets.
  -- I will create a 'pending_webhook_events' table instead, and have a CRON Edge Function drain it?
  -- That's safer and fully contained in code.

  INSERT INTO public.pending_webhook_events (
    event_type,
    payload,
    target_url
  )
  VALUES (
    'new_message',
    v_payload,
    'process-new-message' -- Logical target
  );
  
  RETURN NEW;
END;
$$;

-- Create Queue Table if not exists
CREATE TABLE IF NOT EXISTS public.pending_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  target_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, done, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Trigger
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_webhook();

COMMIT;
