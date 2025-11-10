import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';


interface BookingConfirmationEmailData {
  bookingId: string;
  recipientEmail: string;
  recipientName: string;
  carBrand: string;
  carModel: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  currency: string;
  paymentProvider: string;
  paymentReferenceId: string;
}

/**
 * Edge Function: Send Booking Confirmation Email
 *
 * Envía un email de confirmación de reserva usando Resend
 * (u otro proveedor de email transaccional)
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: API key de Resend
 * - APP_BASE_URL: URL base de la aplicación
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
    const emailData: BookingConfirmationEmailData = await req.json();

    // Validate required fields
    const requiredFields = [
      'bookingId',
      'recipientEmail',
      'recipientName',
      'carBrand',
      'carModel',
      'startDate',
      'endDate',
      'totalPrice',
      'currency',
    ];

    for (const field of requiredFields) {
      if (!emailData[field as keyof BookingConfirmationEmailData]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Get environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://autorentar.com';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Format dates
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    };

    // Format currency
    const formatCurrency = (amount: number, currency: string) => {
      return new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    // Generate email HTML
    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Reserva</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 2px solid #3b82f6;">
              <h1 style="margin: 0 0 10px 0; color: #1f2937; font-size: 32px;">🚗 AutoRenta</h1>
              <p style="margin: 0; color: #6b7280; font-size: 16px;">Confirmación de Reserva</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px 40px;">
              <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">
                ¡Hola <strong>${emailData.recipientName}</strong>!
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                Tu reserva ha sido confirmada exitosamente. A continuación encontrarás los detalles de tu reserva:
              </p>
            </td>
          </tr>

          <!-- Booking Details -->
          <tr>
            <td style="padding: 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px;">
                <tr>
                  <td style="padding: 10px 0;">
                    <strong style="color: #374151;">ID de Reserva:</strong><br/>
                    <span style="color: #6b7280;">${emailData.bookingId}</span>
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
                    <strong style="color: #374151;">Desde:</strong><br/>
                    <span style="color: #6b7280;">${formatDate(emailData.startDate)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <strong style="color: #374151;">Hasta:</strong><br/>
                    <span style="color: #6b7280;">${formatDate(emailData.endDate)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-top: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Total Pagado:</strong><br/>
                    <span style="color: #16a34a; font-size: 24px; font-weight: bold;">
                      ${formatCurrency(emailData.totalPrice, emailData.currency)}
                    </span>
                  </td>
                </tr>
                ${emailData.paymentReferenceId ? `
                <tr>
                  <td style="padding: 10px 0;">
                    <strong style="color: #374151;">ID de Pago:</strong><br/>
                    <span style="color: #6b7280;">${emailData.paymentReferenceId}</span>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 20px 40px;" align="center">
              <a href="${appBaseUrl}/bookings/${emailData.bookingId}"
                 style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Ver Detalles de la Reserva
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                ¿Necesitas ayuda? Contáctanos en <a href="mailto:soporte@autorentar.com" style="color: #3b82f6; text-decoration: none;">soporte@autorentar.com</a>
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

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'AutoRenta <reservas@autorentar.com>',
        to: [emailData.recipientEmail],
        subject: `✅ Reserva Confirmada - ${emailData.carBrand} ${emailData.carModel}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-booking-confirmation-email:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
