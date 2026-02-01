-- Migration: Email Automation Enhancements
-- Purpose: Add Abandoned Booking sequence and improve subscriber triggers
-- Created: 2026-02-01

-- 1. ADD ABANDONED BOOKING SEQUENCE
INSERT INTO public.email_sequences (name, slug, description, sequence_type, target_audience)
VALUES (
  'Reserva Abandonada',
  'abandoned-booking',
  'Recordatorio para usuarios que iniciaron una reserva pero no completaron el pago',
  're_engagement',
  'all'
) ON CONFLICT (slug) DO NOTHING;

-- 2. ADD STEPS FOR ABANDONED BOOKING
-- Paso 1: 30 minutos después
INSERT INTO public.email_sequence_steps (sequence_id, step_number, delay_days, delay_hours, subject, html_content)
SELECT 
  id, 
  1, 
  0, 
  0, -- El delay real se manejará en el trigger que lo agrega (inmediato una vez disparado)
  '🛒 ¿Aún quieres alquilar este auto?',
  '
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #3b82f6; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">🛒 ¡Tu reserva te está esperando!</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">Hola {{first_name}},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Notamos que dejaste algo en tu carrito. El auto que elegiste aún está disponible, pero podría no estarlo por mucho tiempo.</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Completa tu reserva ahora para asegurar tu viaje.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://autorentar.com/bookings" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Completar mi reserva</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'
FROM public.email_sequences WHERE slug = 'abandoned-booking'
ON CONFLICT DO NOTHING;

-- Paso 2: 24 horas después
INSERT INTO public.email_sequence_steps (sequence_id, step_number, delay_days, delay_hours, subject, html_content)
SELECT 
  id, 
  2, 
  1, 
  0,
  '⚠️ Tu reserva está por expirar',
  '
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #ef4444; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">⚠️ Última oportunidad</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">Hola {{first_name}},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Queríamos avisarte que tu reserva pendiente está por ser cancelada automáticamente para liberar el vehículo.</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Si aún planeas realizar el viaje, este es el momento de confirmarlo.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://autorentar.com/bookings" style="display: inline-block; padding: 14px 32px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Confirmar ahora</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'
FROM public.email_sequences WHERE slug = 'abandoned-booking'
ON CONFLICT DO NOTHING;

-- 3. IMPROVE auto_create_email_subscriber TO ADD TO WELCOME SEQUENCE
CREATE OR REPLACE FUNCTION public.auto_create_email_subscriber()
RETURNS TRIGGER AS $$
DECLARE
  v_subscriber_id UUID;
  v_role TEXT;
  v_seq_slug TEXT;
BEGIN
  -- Determine role
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'renter'); -- Default to renter
  
  -- Insert or update subscriber
  INSERT INTO public.email_subscribers (
    user_id,
    email,
    first_name,
    user_type,
    source,
    last_activity_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    v_role,
    'signup',
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = NEW.id,
    updated_at = now()
  RETURNING id INTO v_subscriber_id;

  -- Add to appropriate welcome sequence
  IF v_role = 'owner' THEN
    v_seq_slug := 'welcome-owner';
  ELSE
    v_seq_slug := 'welcome-renter';
  END IF;

  PERFORM public.add_subscriber_to_sequence(v_subscriber_id, v_seq_slug);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCTION TO TRIGGER ABANDONED BOOKING EMAILS
CREATE OR REPLACE FUNCTION public.check_abandoned_bookings()
RETURNS void AS $$
DECLARE
  v_booking RECORD;
  v_subscriber_id UUID;
BEGIN
  FOR v_booking IN 
    SELECT b.id, b.renter_id, p.email, p.full_name
    FROM public.bookings b
    JOIN public.profiles p ON b.renter_id = p.id
    WHERE b.status = 'pending_payment'
      AND b.created_at < now() - INTERVAL '30 minutes'
      AND b.created_at > now() - INTERVAL '35 minutes' -- To avoid processing same booking multiple times if run every 5m
  LOOP
    -- Get or create subscriber
    SELECT id INTO v_subscriber_id FROM public.email_subscribers WHERE email = v_booking.email;
    
    IF v_subscriber_id IS NULL THEN
      INSERT INTO public.email_subscribers (user_id, email, first_name, user_type, source)
      VALUES (v_booking.renter_id, v_booking.email, split_part(v_booking.full_name, ' ', 1), 'renter', 'abandoned_booking')
      RETURNING id INTO v_subscriber_id;
    END IF;

    -- Add to abandoned booking sequence
    PERFORM public.add_subscriber_to_sequence(v_subscriber_id, 'abandoned-booking');
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. SCHEDULE CRON JOBS
-- Schedule Abandoned Booking Check (Every 5 minutes)
SELECT cron.schedule(
    'check-abandoned-bookings',
    '*/5 * * * *',
    $$ SELECT public.check_abandoned_bookings(); $$
);

-- Schedule Email Sequence Processor (Every 30 minutes)
DO $$
DECLARE
  v_supabase_url TEXT := COALESCE(current_setting('app.supabase_url', true), 'https://pisqjmoklivzpwufhscx.supabase.co');
BEGIN
  PERFORM cron.schedule(
      'process-email-sequences',
      '*/30 * * * *',
      format(
          'SELECT net.http_post(url := %L, headers := %L, body := %L)',
          v_supabase_url || '/functions/v1/process-email-sequences',
          jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('app.supabase_key', true)
          ),
          '{}'::jsonb
      )
  );
END $$;
