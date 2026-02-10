-- ============================================================================
-- Migration: Migrate orphan Edge Function references
-- Purpose: Update DB trigger to use current project URL and consolidated function
-- Date: 2026-02-10
--
-- Changes:
--   1. notify_booking_status_change() → calls notify-multi-channel instead of
--      booking-notify-n8n, using active project (aceacpaockyxgogxsfyc)
--   2. The old project URL (pisqjmoklivzpwufhscx) is deprecated (quota exceeded)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Build the payload matching Supabase webhook format
  payload := jsonb_build_object(
    'type', 'UPDATE',
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW)::jsonb,
    'old_record', row_to_json(OLD)::jsonb
  );

  -- Call the consolidated notification Edge Function via pg_net
  PERFORM net.http_post(
    url := 'https://aceacpaockyxgogxsfyc.supabase.co/functions/v1/notify-multi-channel',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'notify_booking_status_change failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update documentation
COMMENT ON FUNCTION public.notify_booking_status_change() IS
  'Calls notify-multi-channel Edge Function when booking status changes (migrated from booking-notify-n8n)';

COMMENT ON TRIGGER on_booking_status_change ON public.bookings IS
  'Notifies multi-channel service when booking status changes for WhatsApp/email/push notifications';
