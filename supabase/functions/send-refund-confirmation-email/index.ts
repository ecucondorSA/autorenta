import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';


interface RefundConfirmationEmailData {
  refundRequestId: string;
  bookingId: string;
  recipientEmail: string;
  recipientName: string;
  refundAmount: number;
  currency: string;
  destination: 'wallet' | 'original_payment_method';
  reason?: string;
  estimatedCompletionDays?: number;
}

/**
 * Edge Function: Send Refund Confirmation Email
 *
 * Sends a refund confirmation email using Resend
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: API key from Resend
 * - APP_BASE_URL: Base URL of the application
 * - REFUND_CONFIRMATION_FROM_EMAIL: Sender email (default: no-reply@autorentar.com)
 */
serve(async (req) => {
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const emailData: RefundConfirmationEmailData = await req.json();

    // Validate required fields
    const requiredFields = [
      'refundRequestId',
      'bookingId',
      'recipientEmail',
      'recipientName',
      'refundAmount',
      'currency',
      'destination',
    ];

    for (const field of requiredFields) {
      if (!emailData[field as keyof RefundConfirmationEmailData]) {
        return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://autorentar.com';
    const fromEmail = Deno.env.get('REFUND_CONFIRMATION_FROM_EMAIL') || 'no-reply@autorentar.com';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format currency amount
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: emailData.currency,
    }).format(emailData.refundAmount);

    // Determine timeline message
    const timelineMessage =
      emailData.destination === 'wallet'
        ? 'El reembolso ha sido acreditado instantáneamente en tu wallet de AutoRenta.'
        : `El reembolso será procesado en ${emailData.estimatedCompletionDays || '2-5'} días hábiles a tu método de pago original.`;

    // Destination display text
    const destinationText =
      emailData.destination === 'wallet' ? 'Wallet de AutoRenta' : 'Método de pago original';

    // Build HTML email
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Reembolso - AutoRenta</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 40px 30px; }
    .refund-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .refund-amount { font-size: 36px; font-weight: 700; color: #667eea; margin: 10px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #666; }
    .info-value { color: #333; text-align: right; }
    .timeline-box { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .cta-button { display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
    .divider { height: 1px; background: #e9ecef; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Reembolso Confirmado</h1>
    </div>

    <div class="content">
      <p>Hola <strong>${emailData.recipientName}</strong>,</p>

      <p>Tu solicitud de reembolso ha sido procesada exitosamente.</p>

      <div class="refund-box">
        <div style="text-align: center;">
          <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Monto Reembolsado</div>
          <div class="refund-amount">${formattedAmount}</div>
        </div>
      </div>

      <div style="margin: 30px 0;">
        <h3 style="margin-bottom: 15px; color: #333;">Detalles del Reembolso</h3>
        <div class="info-row">
          <span class="info-label">ID de Reembolso:</span>
          <span class="info-value">${emailData.refundRequestId.substring(0, 8)}...</span>
        </div>
        <div class="info-row">
          <span class="info-label">Booking ID:</span>
          <span class="info-value">${emailData.bookingId.substring(0, 8)}...</span>
        </div>
        <div class="info-row">
          <span class="info-label">Monto:</span>
          <span class="info-value">${formattedAmount}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Destino:</span>
          <span class="info-value">${destinationText}</span>
        </div>
        ${
          emailData.reason
            ? `
        <div class="info-row">
          <span class="info-label">Motivo:</span>
          <span class="info-value">${emailData.reason}</span>
        </div>
        `
            : ''
        }
      </div>

      <div class="timeline-box">
        <strong>⏱️ Tiempo de Procesamiento:</strong><br/>
        ${timelineMessage}
      </div>

      <div class="divider"></div>

      <p style="margin-top: 30px;">Puedes ver el detalle de tu reembolso en tu historial de transacciones:</p>

      <div style="text-align: center;">
        <a href="${appBaseUrl}/wallet" class="cta-button">Ver Mi Wallet</a>
      </div>

      <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 6px;">
        <p style="margin: 0; font-size: 14px; color: #666;">
          <strong>¿Tienes alguna pregunta?</strong><br/>
          Contáctanos en <a href="mailto:soporte@autorentar.com" style="color: #667eea;">soporte@autorentar.com</a>
        </p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 10px 0;">AutoRenta - Marketplace de Renta de Autos</p>
      <p style="margin: 0; font-size: 12px; color: #999;">
        Este es un correo automático, por favor no respondas a este mensaje.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Plain text version
    const textContent = `
Confirmación de Reembolso - AutoRenta

Hola ${emailData.recipientName},

Tu solicitud de reembolso ha sido procesada exitosamente.

Detalles del Reembolso:
- ID de Reembolso: ${emailData.refundRequestId}
- Booking ID: ${emailData.bookingId}
- Monto: ${formattedAmount}
- Destino: ${destinationText}
${emailData.reason ? `- Motivo: ${emailData.reason}` : ''}

Tiempo de Procesamiento:
${timelineMessage}

Puedes ver el detalle de tu reembolso en: ${appBaseUrl}/wallet

¿Tienes alguna pregunta? Contáctanos en soporte@autorentar.com

AutoRenta - Marketplace de Renta de Autos
    `;

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [emailData.recipientEmail],
        subject: `Reembolso Confirmado - ${formattedAmount}`,
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendData = await resendResponse.json();

    console.log('Email sent successfully:', {
      refundRequestId: emailData.refundRequestId,
      recipientEmail: emailData.recipientEmail,
      resendId: resendData.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Refund confirmation email sent',
        emailId: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error sending refund confirmation email:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
