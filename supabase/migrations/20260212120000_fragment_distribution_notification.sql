-- Add notification type for fragment distributions
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'fragment_distribution';

-- Trigger: notify investor when a distribution payout is created
CREATE OR REPLACE FUNCTION public.notify_fragment_distribution_payout()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_asset_code TEXT;
  v_amount_display TEXT;
BEGIN
  -- Fetch asset_code for the notification body
  SELECT va.asset_code INTO v_asset_code
  FROM fragment_distributions fd
  JOIN vehicle_assets va ON va.id = fd.vehicle_asset_id
  WHERE fd.id = NEW.distribution_id;

  v_amount_display := '$' || TRIM(TO_CHAR(NEW.amount_cents / 100.0, '999,999.00'));

  INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
  VALUES (
    NEW.user_id,
    'Distribución recibida',
    'Recibiste ' || v_amount_display || ' ' || NEW.currency
      || ' por tu inversión en ' || COALESCE(v_asset_code, 'un vehículo'),
    'fragment_distribution',
    '/wallet?tab=investments',
    jsonb_build_object(
      'distribution_id', NEW.distribution_id,
      'payout_id', NEW.id,
      'amount_cents', NEW.amount_cents,
      'currency', NEW.currency,
      'asset_code', v_asset_code
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_fragment_distribution_payout_notify
  AFTER INSERT ON fragment_distribution_payouts
  FOR EACH ROW
  EXECUTE FUNCTION notify_fragment_distribution_payout();
