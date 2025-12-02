-- Trigger to send confirmation email when deposit is confirmed
-- Calls Edge Function: send-deposit-confirmation-email

-- Create function that calls the Edge Function
CREATE OR REPLACE FUNCTION trigger_send_deposit_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  supabase_anon_key TEXT;
  http_response RECORD;
BEGIN
  -- Only send email if:
  -- 1. Transaction type is 'deposit'
  -- 2. Status changed from 'pending' to 'completed'
  IF NEW.type = 'deposit' AND OLD.status = 'pending' AND NEW.status = 'completed' THEN

    -- Get Supabase URL and anon key from secrets (you'll need to set these)
    edge_function_url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/send-deposit-confirmation-email';

    -- Call Edge Function asynchronously using pg_net (if available)
    -- If pg_net is not available, this will fail silently
    -- You can install pg_net: https://github.com/supabase/pg_net

    BEGIN
      -- Try to call Edge Function via HTTP
      -- Note: This requires pg_net extension
      -- If not available, you can call from application code instead

      PERFORM net.http_post(
        url := edge_function_url,
        body := jsonb_build_object(
          'transaction_id', NEW.id,
          'user_id', NEW.user_id,
          'amount', NEW.amount,
          'currency', NEW.currency
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        )
      );

      RAISE NOTICE 'Email trigger sent for transaction %', NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to send email notification: %', SQLERRM;
    END;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on wallet_transactions
DROP TRIGGER IF EXISTS on_deposit_confirmed ON wallet_transactions;

CREATE TRIGGER on_deposit_confirmed
AFTER UPDATE ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_send_deposit_confirmation_email();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_send_deposit_confirmation_email() TO service_role;

-- Note: This trigger uses pg_net extension which may not be available by default
-- If pg_net is not available, you can:
-- 1. Install it: CREATE EXTENSION pg_net;
-- 2. Or call the email function from your application code after confirming deposit
