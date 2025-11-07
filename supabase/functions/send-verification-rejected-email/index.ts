// Edge Function: send-verification-rejected-email
// Envía email cuando la verificación de identidad es rechazada
//
// Called by: Admin verification rejection workflow (Issue #125)
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
  rejected_level: number;  // 2 or 3
  reason: string;          // Required rejection reason
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
    console.log('📧 Received verification rejection email request:', payload);

    // Validate payload
    if (!payload.user_email || !payload.rejected_level || !payload.reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_email, rejected_level, reason' }),
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
    const levelInfo = payload.rejected_level === 2
      ? {
          levelName: 'Nivel 2 (Participante)',
          requirements: [
            'Fotografía clara del frente de tu documento de identidad',
            'Fotografía clara del dorso de tu documento de identidad',
            'Documento vigente y en buen estado',
            'Todos los datos deben ser legibles',
            'Sin reflejos, sombras o borrosidad'
          ]
        }
      : {
          levelName: 'Nivel 3 (Verificado Full)',
          requirements: [
            'Selfie con buena iluminación',
            'Rostro completamente visible sin obstrucciones',
            'Sin lentes de sol, gorras o accesorios que cubran el rostro',
            'Mirar directamente a la cámara',
            'Imagen nítida y sin filtros'
          ]
        };

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación Requiere Revisión - AutoRenta</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Verificación Requiere Revisión</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-top: 0;">
      Hola${payload.user_name ? ` ${payload.user_name}` : ''},
    </p>

    <p style="font-size: 16px;">
      Hemos revisado tu solicitud de verificación de identidad para <strong>${levelInfo.levelName}</strong> y necesitamos que realices algunos ajustes antes de poder aprobarla.
    </p>

    <div style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #92400e;">
        Motivo de la revisión:
      </p>
      <p style="margin: 0; font-size: 15px; color: #78350f; line-height: 1.6;">
        ${payload.reason}
      </p>
    </div>

    <h3 style="color: #2d3748; font-size: 18px; margin-top: 30px; margin-bottom: 15px;">
      📋 Requisitos para ${levelInfo.levelName}:
    </h3>
    <ul style="font-size: 15px; line-height: 1.8; color: #4a5568; padding-left: 20px;">
      ${levelInfo.requirements.map(req => `<li>${req}</li>`).join('\n      ')}
    </ul>

    <div style="background: #edf2f7; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <h4 style="margin: 0 0 12px 0; font-size: 16px; color: #2d3748;">💡 Consejos para una verificación exitosa:</h4>
      <ul style="font-size: 14px; line-height: 1.7; color: #4a5568; margin: 0; padding-left: 20px;">
        <li>Usá buena iluminación natural o artificial</li>
        <li>Asegurate de que la cámara esté limpia</li>
        <li>Tomá las fotos en un fondo neutro</li>
        <li>Evitá sombras y reflejos</li>
        <li>Verificá que todos los datos sean legibles antes de enviar</li>
      </ul>
    </div>

    <p style="font-size: 15px; color: #4a5568;">
      <strong>¿Qué hacer ahora?</strong><br>
      Simplemente volvé a la página de verificación y subí nuevas fotos que cumplan con los requisitos. Nuestro equipo revisará tu solicitud nuevamente lo antes posible.
    </p>

    <div style="text-align: center; margin: 35px 0;">
      <a href="https://autorenta-web.pages.dev/verification"
         style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Actualizar Mi Verificación
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

    <p style="font-size: 14px; color: #718096; margin: 0;">
      Si tenés dudas sobre el proceso de verificación o necesitás ayuda, contactanos y con gusto te asistiremos.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; color: #a0aec0; font-size: 12px;">
    <p>© 2025 AutoRenta. Todos los derechos reservados.</p>
    <p style="margin-top: 10px;">
      <a href="https://autorenta-web.pages.dev" style="color: #f59e0b; text-decoration: none;">Visitar AutoRenta</a> |
      <a href="mailto:soporte@autorentar.com" style="color: #f59e0b; text-decoration: none;">Soporte</a>
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
        subject: '⚠️ Verificación Requiere Revisión - AutoRenta',
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

    console.log('✅ Verification rejection email sent successfully:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification rejection email sent successfully',
        email_id: resendData.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in send-verification-rejected-email:', error);

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
