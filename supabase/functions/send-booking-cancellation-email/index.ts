// ============================================
// EDGE FUNCTION: send-booking-cancellation-email
// Propósito: Enviar email de cancelación de reserva
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

interface CancellationEmailData {
  bookingId: string;
  recipientEmail: string;
  recipientName: string;
  carBrand: string;
  carModel: string;
  startDate: string;
  endDate: string;
  cancelledBy: 'renter' | 'owner' | 'system';
  cancellationReason?: string;
  refundAmount?: number;
  refundCurrency?: string;
  isFullRefund?: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const emailData: CancellationEmailData = await req.json();

    // Validate required fields
    const requiredFields = ['bookingId', 'recipientEmail', 'recipientName', 'carBrand', 'carModel', 'startDate', 'endDate', 'cancelledBy'];

    for (const field of requiredFields) {
      if (!emailData[field as keyof CancellationEmailData]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://autorentar.com';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format dates
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    };

    // Format currency
    const formatCurrency = (amount: number, currency: string) => {
      return new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    // Cancellation message based on who cancelled
    const getCancellationMessage = () => {
      switch (emailData.cancelledBy) {
        case 'renter':
          return 'El locatario ha cancelado esta reserva.';
        case 'owner':
          return 'El propietario del vehículo ha cancelado esta reserva.';
        case 'system':
          return 'Esta reserva fue cancelada automáticamente por el sistema.';
        default:
          return 'Esta reserva ha sido cancelada.';
      }
    };

    // Refund section
    const getRefundSection = () => {
      if (!emailData.refundAmount || emailData.refundAmount <= 0) {
        return '';
      }

      const refundText = emailData.isFullRefund
        ? 'Se te reembolsará el monto total:'
        : 'Se te reembolsará parcialmente:';

      return `
        <tr>
          <td style="padding: 20px 40px;">
            <div style="background-color: #ecfdf5; border-radius: 6px; padding: 20px; border-left: 4px solid #10b981;">
              <p style="margin: 0 0 10px 0; color: #065f46; font-weight: 600;">
                💰 Información de Reembolso
              </p>
              <p style="margin: 0; color: #047857;">
                ${refundText}
                <strong>${formatCurrency(emailData.refundAmount, emailData.refundCurrency || 'ARS')}</strong>
              </p>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                El reembolso se procesará en un plazo de 5-10 días hábiles.
              </p>
            </div>
          </td>
        </tr>
      `;
    };

    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva Cancelada</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 2px solid #ef4444;">
              <h1 style="margin: 0 0 10px 0; color: #1f2937; font-size: 32px;">🚗 AutoRenta</h1>
              <p style="margin: 0; color: #ef4444; font-size: 16px; font-weight: 600;">Reserva Cancelada</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px 40px;">
              <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">
                Hola <strong>${emailData.recipientName}</strong>,
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                ${getCancellationMessage()}
              </p>
              ${emailData.cancellationReason ? `
              <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px; font-style: italic;">
                Motivo: "${emailData.cancellationReason}"
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Booking Details -->
          <tr>
            <td style="padding: 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 6px; padding: 20px;">
                <tr>
                  <td style="padding: 10px 0;">
                    <strong style="color: #374151;">ID de Reserva:</strong><br/>
                    <span style="color: #6b7280; text-decoration: line-through;">${emailData.bookingId}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <strong style="color: #374151;">Vehículo:</strong><br/>
                    <span style="color: #6b7280;">${emailData.carBrand} ${emailData.carModel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <strong style="color: #374151;">Fechas Originales:</strong><br/>
                    <span style="color: #6b7280;">${formatDate(emailData.startDate)} - ${formatDate(emailData.endDate)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Refund Info -->
          ${getRefundSection()}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 20px 40px;" align="center">
              <a href="${appBaseUrl}/marketplace"
                 style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Buscar Otro Vehículo
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                ¿Preguntas? Contáctanos en <a href="mailto:soporte@autorentar.com" style="color: #3b82f6; text-decoration: none;">soporte@autorentar.com</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} AutoRenta. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'AutoRenta <reservas@autorentar.com>',
        to: [emailData.recipientEmail],
        subject: `❌ Reserva Cancelada - ${emailData.carBrand} ${emailData.carModel}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('Cancellation email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in send-booking-cancellation-email:', errorMessage);

    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/* ============================================
 * DOCUMENTACIÓN
 * ============================================
 *
 * ## Uso
 *
 * POST /functions/v1/send-booking-cancellation-email
 * Body:
 * {
 *   "bookingId": "uuid",
 *   "recipientEmail": "user@example.com",
 *   "recipientName": "Juan Pérez",
 *   "carBrand": "Toyota",
 *   "carModel": "Corolla",
 *   "startDate": "2024-03-01",
 *   "endDate": "2024-03-05",
 *   "cancelledBy": "renter" | "owner" | "system",
 *   "cancellationReason": "Cambio de planes",
 *   "refundAmount": 15000,
 *   "refundCurrency": "ARS",
 *   "isFullRefund": true
 * }
 *
 * ## Variables de Entorno
 *
 * - RESEND_API_KEY
 * - APP_BASE_URL (default: https://autorentar.com)
 *
 * ============================================ */
