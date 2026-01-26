-- ============================================================================
-- REFUND EMAIL NOTIFICATIONS
-- Created: 2025-11-07
-- Purpose: Trigger email notifications when refunds are completed
-- Issue: #124
-- ============================================================================

BEGIN;

-- ============================================
-- Function to send refund confirmation email
-- ============================================

CREATE OR REPLACE FUNCTION notify_refund_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_car_title TEXT;
  v_estimated_days INTEGER;
BEGIN
  -- Only send email when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Get user details
    SELECT
      u.email,
      p.full_name
    INTO v_user_email, v_user_name
    FROM auth.users u
    INNER JOIN public.profiles p ON p.id = u.id
    WHERE u.id = NEW.user_id;

    -- Get booking/car details
    SELECT c.title
    INTO v_car_title
    FROM public.bookings b
    INNER JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = NEW.booking_id;

    -- Determine estimated completion days based on destination
    v_estimated_days := CASE
      WHEN NEW.destination = 'wallet' THEN 0
      ELSE 3 -- Average for payment method refunds
    END;

    -- Invoke Edge Function to send email (async, non-blocking)
    -- Note: This uses pg_net extension if available, or you can use Supabase Functions
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-refund-confirmation-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body := jsonb_build_object(
          'refundRequestId', NEW.id::text,
          'bookingId', NEW.booking_id::text,
          'recipientEmail', v_user_email,
          'recipientName', v_user_name,
          'refundAmount', NEW.refund_amount,
          'currency', NEW.currency,
          'destination', NEW.destination,
          'reason', NEW.request_reason,
          'estimatedCompletionDays', v_estimated_days
        )::text
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to trigger refund email notification: %', SQLERRM;
    END;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_refund_confirmation IS 'Triggers email notification when refund is completed';

-- ============================================
-- Trigger on refund_requests table
-- ============================================

DROP TRIGGER IF EXISTS trigger_refund_email_notification ON public.refund_requests;

CREATE TRIGGER trigger_refund_email_notification
  AFTER INSERT OR UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_refund_confirmation();

COMMENT ON TRIGGER trigger_refund_email_notification ON public.refund_requests
  IS 'Sends email notification when refund status changes to completed';

-- ============================================
-- Alternative: Manual RPC for sending email
-- ============================================

-- If pg_net extension is not available, admins can manually trigger emails using this RPC
CREATE OR REPLACE FUNCTION public.send_refund_email_manual(
  p_refund_request_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_refund RECORD;
  v_user_email TEXT;
  v_user_name TEXT;
  v_car_title TEXT;
  v_result JSON;
BEGIN
  -- Get refund request details
  SELECT * INTO v_refund
  FROM public.refund_requests
  WHERE id = p_refund_request_id;

  IF v_refund IS NULL THEN
    RAISE EXCEPTION 'Refund request not found: %', p_refund_request_id;
  END IF;

  -- Get user details
  SELECT
    u.email,
    p.full_name
  INTO v_user_email, v_user_name
  FROM auth.users u
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE u.id = v_refund.user_id;

  -- Get car title
  SELECT c.title INTO v_car_title
  FROM public.bookings b
  INNER JOIN public.cars c ON c.id = b.car_id
  WHERE b.id = v_refund.booking_id;

  -- Return email data for client-side sending
  v_result := json_build_object(
    'refundRequestId', v_refund.id::text,
    'bookingId', v_refund.booking_id::text,
    'recipientEmail', v_user_email,
    'recipientName', v_user_name,
    'refundAmount', v_refund.refund_amount,
    'currency', v_refund.currency,
    'destination', v_refund.destination,
    'reason', v_refund.request_reason,
    'carTitle', v_car_title,
    'estimatedCompletionDays', CASE
      WHEN v_refund.destination = 'wallet' THEN 0
      ELSE 3
    END
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.send_refund_email_manual IS 'Returns refund email data for manual sending (if auto-trigger fails)';

GRANT EXECUTE ON FUNCTION public.send_refund_email_manual TO authenticated;

COMMIT;
