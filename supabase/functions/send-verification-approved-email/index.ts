// Edge Function: send-verification-approved-email
// Envía email de confirmación cuando la verificación de identidad es aprobada
//
// Called by: Admin verification approval workflow (Issue #125)
// Provider: Resend (https://resend.com)
//
// Environment variables required:
// - RESEND_API_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface EmailPayload {
  user_id: string;
  user_email: string;
  user_name: string;
  approved_level: number;  // 2 or 3
  previous_level: number;
  notes?: string;
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const payload: EmailPayload = await req.json();
    console.log('📧 Received verification approval email request:', payload);

    // Validate payload
    if (!payload.user_email || !payload.approved_level) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_email, approved_level' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Skip if no API key configured
    if (!RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email skipped (API key not configured)',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Build level-specific content
    const levelInfo = payload.approved_level === 2
      ? {
          levelName: 'Participante',
          levelEmoji: '🎯',
          benefits: [
            'Publicar 1 auto en la plataforma',
            'Reservar vehículos hasta 7 días',
            'Transacciones hasta $50,000 ARS',
            'Retiros hasta $50,000 ARS por mes',
            'Ver contacto en reservas confirmadas'
          ],
          nextSteps: `
            <p style="font-size: 16px; margin-top: 20px;">
              <strong>Próximo nivel: Verificado Full</strong><br>
              Para desbloquear transacciones ilimitadas y seguros premium, completá la verificación de Nivel 3 con selfie y reconocimiento facial.
            </p>
          `
        }
      : {
          levelName: 'Verificado Full',
          levelEmoji: '✨',
          benefits: [
            'Publicar autos ilimitados',
            'Reservas sin límite de duración',
            'Transacciones sin límite de monto',
            'Retiros sin límite mensual',
            'Seguros premium incluidos',
            'Soporte prioritario 24/7'
          ],
          nextSteps: `
            <p style="font-size: 16px; margin-top: 20px; color: #48bb78;">
              <strong>¡Felicitaciones! Alcanzaste el nivel máximo de verificación.</strong><br>
              Ya podés disfrutar de todos los beneficios de AutoRenta sin restricciones.
            </p>
          `
        };

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación Aprobada - AutoRenta</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${levelInfo.levelEmoji} ¡Verificación Aprobada!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-top: 0;">
      Hola${payload.user_name ? ` ${payload.user_name}` : ''},
    </p>

    <p style="font-size: 16px;">
      ¡Excelente noticia! Tu solicitud de verificación de identidad ha sido <strong style="color: #48bb78;">aprobada exitosamente</strong>.
    </p>

    <div style="background: #f0fff4; border-left: 4px solid #48bb78; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #718096;">Tu nuevo nivel de verificación:</p>
      <p style="margin: 0; font-size: 28px; font-weight: bold; color: #48bb78;">
        Nivel ${payload.approved_level} - ${levelInfo.levelName}
      </p>
    </div>

    <h3 style="color: #2d3748; font-size: 18px; margin-top: 30px; margin-bottom: 15px;">
      ✅ Beneficios desbloqueados:
    </h3>
    <ul style="font-size: 15px; line-height: 1.8; color: #4a5568; padding-left: 20px;">
      ${levelInfo.benefits.map(benefit => `<li>${benefit}</li>`).join('\n      ')}
    </ul>

    ${levelInfo.nextSteps}

    ${payload.notes ? `
    <div style="background: #edf2f7; padding: 15px; margin: 25px 0; border-radius: 6px;">
      <p style="margin: 0; font-size: 14px; color: #4a5568;">
        <strong>Nota del equipo:</strong><br>
        ${payload.notes}
      </p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 35px 0;">
      <a href="https://autorenta-web.pages.dev/verification"
         style="display: inline-block; background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Ver Mi Estado de Verificación
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

    <p style="font-size: 14px; color: #718096; margin: 0;">
      Si tenés alguna pregunta sobre tu verificación o los beneficios de tu nivel, no dudes en contactarnos.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; color: #a0aec0; font-size: 12px;">
    <p>© 2025 AutoRenta. Todos los derechos reservados.</p>
    <p style="margin-top: 10px;">
      <a href="https://autorenta-web.pages.dev" style="color: #48bb78; text-decoration: none;">Visitar AutoRenta</a> |
      <a href="mailto:soporte@autorentar.com" style="color: #48bb78; text-decoration: none;">Soporte</a>
    </p>
  </div>
</body>
</html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AutoRenta <noreply@autorentar.com>',
        to: [payload.user_email],
        subject: `${levelInfo.levelEmoji} ¡Verificación Aprobada! - Nivel ${payload.approved_level}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('❌ Error sending email via Resend:', resendData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send email',
          details: resendData,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Verification approval email sent successfully:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification approval email sent successfully',
        email_id: resendData.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in send-verification-approved-email:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
