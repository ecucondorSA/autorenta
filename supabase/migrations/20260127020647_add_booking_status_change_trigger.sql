-- ============================================
-- Migration: Add booking status change trigger for n8n webhook
-- Purpose: Notify n8n when booking status changes to send WhatsApp notifications
-- ============================================

-- Function to call the Edge Function when booking status changes
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  edge_function_url text;
  service_role_key text;
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

  -- Call the Edge Function asynchronously using pg_net
  -- Note: pg_net must be enabled in the project
  PERFORM net.http_post(
    url := 'https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/booking-notify-n8n',
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

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS on_booking_status_change ON public.bookings;

CREATE TRIGGER on_booking_status_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_booking_status_change();

-- Add comment for documentation
COMMENT ON TRIGGER on_booking_status_change ON public.bookings IS 
  'Notifies n8n workflow when booking status changes to send WhatsApp notifications';

COMMENT ON FUNCTION public.notify_booking_status_change() IS 
  'Calls booking-notify-n8n Edge Function when booking status changes';
