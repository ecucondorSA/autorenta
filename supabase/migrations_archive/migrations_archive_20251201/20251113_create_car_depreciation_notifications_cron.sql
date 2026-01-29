-- Migration: Create Car Depreciation Monthly Notifications Cron Job
-- Date: 2025-11-13
-- Description: Creates a cron job to send monthly depreciation notifications to car owners

-- ============================================================================
-- 1. Function to send monthly depreciation notifications
-- (Fixed booking date column and value COALESCE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_monthly_depreciation_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  car_record RECORD;
  monthly_depreciation NUMERIC(12,2);
  monthly_earnings NUMERIC(12,2);
  net_gain NUMERIC(12,2);
  current_month TEXT;
  depreciation_rate NUMERIC(6,4);
  car_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  FOR car_record IN
    SELECT 
      c.id,
      c.owner_id,
      c.title,
      c.brand,
      c.model,
      c.year,
      COALESCE(c.value_usd, c.estimated_value_usd) AS valuation_usd,
      c.category_id,
      c.price_per_day,
      c.status
    FROM cars c
    WHERE c.status = 'active'
      AND c.owner_id IS NOT NULL
  LOOP
    -- Skip if notification already sent this month
    IF EXISTS (
      SELECT 1
      FROM notifications n
      WHERE n.user_id = car_record.owner_id
        AND n.type = 'generic_announcement'
        AND n.metadata->>'notification_kind' = 'monthly_depreciation'
        AND n.metadata->>'car_id' = car_record.id::text
        AND DATE_TRUNC('month', n.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ) THEN
      CONTINUE;
    END IF;

    -- Get depreciation rate from category (default 5% annual)
    depreciation_rate := 0.05;
    IF car_record.category_id IS NOT NULL THEN
      SELECT COALESCE(vc.depreciation_rate_annual, 0.05)
      INTO depreciation_rate
      FROM vehicle_categories vc
      WHERE vc.id = car_record.category_id;
    END IF;

    -- Calculate monthly depreciation
    IF car_record.valuation_usd IS NOT NULL AND car_record.valuation_usd > 0 THEN
      monthly_depreciation := (car_record.valuation_usd * depreciation_rate) / 12;
    ELSE
      monthly_depreciation := 0;
    END IF;

    -- Calculate monthly earnings (85% of completed/active bookings)
    SELECT COALESCE(SUM(b.total_amount * 0.85), 0)
    INTO monthly_earnings
    FROM bookings b
    WHERE b.car_id = car_record.id
      AND b.status IN ('in_progress','completed','confirmed','pending')
      AND DATE_TRUNC('month', b.start_at) = DATE_TRUNC('month', CURRENT_DATE)
      AND (b.currency IS NULL OR b.currency = 'ARS');

    -- Calculate net gain
    net_gain := monthly_earnings - monthly_depreciation;

    -- Build car name
    car_name := COALESCE(
      car_record.title,
      TRIM(COALESCE(car_record.brand, '') || ' ' || COALESCE(car_record.model, '')),
      'tu auto'
    );

    -- Create notification
    notification_title := '📊 Reporte Mensual: ' || car_name;
    notification_message := 
      'Este mes tu auto tuvo:' || E'\n' ||
      '• Depreciación: $' || TO_CHAR(monthly_depreciation, 'FM999,999,999.00') || ' USD' || E'\n' ||
      '• Ganancias: $' || TO_CHAR(monthly_earnings, 'FM999,999,999.00') || ' ARS' || E'\n' ||
      '• Ganancia Neta: $' || TO_CHAR(net_gain, 'FM999,999,999.00') || ' ARS' || E'\n\n' ||
      CASE 
        WHEN net_gain > monthly_depreciation * 0.5 THEN
          '🎉 ¡Excelente! Estás contrarrestando la depreciación con tus ganancias.'
        WHEN monthly_earnings < monthly_depreciation * 0.5 THEN
          '⚠️ Tus ganancias están por debajo de la depreciación. Considera optimizar tu precio o disponibilidad.'
        ELSE
          '💡 Puedes mejorar tus ganancias optimizando tu precio y disponibilidad.'
      END;

    -- Insert notification
    INSERT INTO notifications (
      user_id,
      title,
      body,
      type,
      cta_link,
      metadata
    ) VALUES (
      car_record.owner_id,
      notification_title,
      notification_message,
      'generic_announcement',
      '/cars/' || car_record.id,
      jsonb_build_object(
        'notification_kind', 'monthly_depreciation',
        'car_id', car_record.id,
        'month', current_month,
        'depreciation', monthly_depreciation,
        'earnings', monthly_earnings,
        'net_gain', net_gain
      )
    );

    -- If earnings are low, send additional optimization notification
    IF monthly_earnings < monthly_depreciation * 0.5 AND car_record.price_per_day IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        title,
        body,
        type,
        cta_link,
        metadata
      ) VALUES (
        car_record.owner_id,
        '💡 Optimiza tu precio: ' || car_name,
        'Tus ganancias están por debajo de la depreciación. ' ||
        'Considera aumentar tu precio a $' || TO_CHAR(car_record.price_per_day * 1.15, 'FM999,999.00') || 
        ' ARS/día para mejorar tus ganancias.',
        'generic_announcement',
        '/cars/' || car_record.id || '/edit',
        jsonb_build_object(
          'notification_kind', 'low_earnings_optimization',
          'car_id', car_record.id,
          'current_price', car_record.price_per_day,
          'recommended_price', car_record.price_per_day * 1.15
        )
      );
    END IF;

  END LOOP;
END;
$$;

-- ============================================================================
-- 2. Grant execute permission: only to service_role (more secure)
-- ============================================================================

REVOKE ALL ON FUNCTION public.send_monthly_depreciation_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_monthly_depreciation_notifications() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.send_monthly_depreciation_notifications() TO service_role;

-- ============================================================================
-- 3. Create cron job to run monthly (1st day of each month at 9:00 AM UTC)
-- Remove existing job with same name if present, then schedule
-- ============================================================================

-- Schedule job if not exists
SELECT CASE 
  WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-car-depreciation-notifications') 
  THEN NULL
  ELSE cron.schedule(
    'monthly-car-depreciation-notifications',
    '0 9 1 * *', -- Every 1st day of month at 9:00 AM UTC
    $$SELECT public.send_monthly_depreciation_notifications();$$
  ) 
END;

-- ============================================================================
-- 4. Comments
-- ============================================================================

COMMENT ON FUNCTION public.send_monthly_depreciation_notifications() IS 
  'Sends monthly depreciation notifications to car owners. Calculates depreciation based on car category and value, compares with monthly earnings, and provides optimization tips.';
