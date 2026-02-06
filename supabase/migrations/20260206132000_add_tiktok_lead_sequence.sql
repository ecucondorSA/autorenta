-- Migration: Add TikTok Lead Nurture Sequence
-- Created: 2026-02-06

-- 1. SEQUENCE
INSERT INTO public.email_sequences (name, slug, description, sequence_type, target_audience)
VALUES (
  'Leads TikTok Propietarios',
  'tiktok-owner-lead',
  'Secuencia para leads de TikTok Instant Form interesados en publicar su auto',
  'promotional',
  'owners'
) ON CONFLICT (slug) DO NOTHING;

-- 2. STEPS
-- Step 1: immediate
INSERT INTO public.email_sequence_steps (sequence_id, step_number, delay_days, delay_hours, subject, html_content)
SELECT
  id,
  1,
  0,
  0,
  'Gracias por tu interes en AutoRenta',
  '
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #111827; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">AutoRenta</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">Hola {{first_name}},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Gracias por tu interes. En AutoRenta podes publicar tu auto y generar ingresos con reglas claras, verificacion de conductor y check-in con fotos.</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Si queres, te explicamos el proceso en menos de 2 minutos.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://autorentar.com/ganar?utm_source=tiktok&utm_medium=lead&utm_campaign=instant_form" style="display: inline-block; padding: 14px 32px; background-color: #111827; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Ver como funciona</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripcion</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'
FROM public.email_sequences WHERE slug = 'tiktok-owner-lead'
ON CONFLICT DO NOTHING;

-- Step 2: 1 day later
INSERT INTO public.email_sequence_steps (sequence_id, step_number, delay_days, delay_hours, subject, html_content)
SELECT
  id,
  2,
  1,
  0,
  'Cuanto podrias ganar con tu auto',
  '
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
        <tr><td style="background-color: #2563eb; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">Estimacion de ingresos</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <p style="color: #374151; font-size: 16px;">Hola {{first_name}},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Tu auto puede cubrir gastos fijos (seguro, patente, cochera) y generar un extra mensual.</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Mira ejemplos reales y calcula un estimado segun tu modelo.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://autorentar.com/ganar?utm_source=tiktok&utm_medium=lead&utm_campaign=instant_form" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Ver ejemplos</a>
          </p>
        </td></tr>
        <tr><td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;"><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripcion</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'
FROM public.email_sequences WHERE slug = 'tiktok-owner-lead'
ON CONFLICT DO NOTHING;
