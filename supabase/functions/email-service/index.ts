/**
 * UNIFIED EMAIL SERVICE
 * AutoRenta - 2026-02-07
 *
 * Consolidated email sending service that handles all email types
 * with template-based routing. Replaces individual email functions.
 *
 * Supported templates:
 * - booking-confirmation
 * - booking-cancellation
 * - booking-reminder
 * - deposit-confirmation
 * - refund-confirmation
 * - verification-approved
 * - verification-rejected
 * - marketing
 * - generic (fallback)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface EmailRequest {
    template: string;
    to: string;
    recipientName?: string;
    subject?: string;
    // Template-specific data
    data: Record<string, unknown>;
}

interface EmailResponse {
    success: boolean;
    emailId?: string;
    error?: string;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

const TEMPLATES: Record<string, {
    subject: (data: Record<string, unknown>) => string;
    html: (data: Record<string, unknown>) => string;
}> = {
    'booking-confirmation': {
        subject: (d) => `✅ Reserva Confirmada - ${d.carBrand} ${d.carModel}`,
        html: (d) => bookingConfirmationTemplate(d),
    },
    'booking-cancellation': {
        subject: (d) => `❌ Reserva Cancelada - ${d.carBrand} ${d.carModel}`,
        html: (d) => bookingCancellationTemplate(d),
    },
    'booking-reminder': {
        subject: (d) => `⏰ Recordatorio de Reserva - ${d.carBrand} ${d.carModel}`,
        html: (d) => bookingReminderTemplate(d),
    },
    'deposit-confirmation': {
        subject: (d) => `🔒 Garantía Confirmada - ${d.carBrand} ${d.carModel}`,
        html: (d) => depositConfirmationTemplate(d),
    },
    'refund-confirmation': {
        subject: (d) => `💰 Reembolso Procesado - ${d.carBrand || 'AutoRenta'}`,
        html: (d) => refundConfirmationTemplate(d),
    },
    'verification-approved': {
        subject: () => `✅ Verificación Aprobada - AutoRenta`,
        html: (d) => verificationApprovedTemplate(d),
    },
    'verification-rejected': {
        subject: () => `⚠️ Verificación Rechazada - AutoRenta`,
        html: (d) => verificationRejectedTemplate(d),
    },
    'marketing': {
        subject: (d) => String(d.subject || '🚗 Novedades de AutoRenta'),
        html: (d) => marketingTemplate(d),
    },
    'generic': {
        subject: (d) => String(d.subject || 'Notificación de AutoRenta'),
        html: (d) => genericTemplate(d),
    },
};

// ============================================================================
// SHARED HELPERS
// ============================================================================

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function formatCurrency(amount: number, currency: string = 'ARS'): string {
    return new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

function baseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 2px solid #10b981;">
              <h1 style="margin: 0 0 10px 0; color: #1f2937; font-size: 32px;">🚗 AutoRenta</h1>
            </td>
          </tr>
          <!-- Content -->
          ${content}
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                ¿Necesitas ayuda? Contáctanos en <a href="mailto:soporte@autorentar.com" style="color: #10b981; text-decoration: none;">soporte@autorentar.com</a>
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
}

// ============================================================================
// TEMPLATE IMPLEMENTATIONS
// ============================================================================

function bookingConfirmationTemplate(d: Record<string, unknown>): string {
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://autorentar.com';
    return baseTemplate(`
    <tr>
      <td style="padding: 30px 40px 20px 40px;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">
          ¡Hola <strong>${d.recipientName}</strong>!
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
          Tu reserva ha sido confirmada exitosamente.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px;">
          <tr><td style="padding: 10px 0;"><strong>ID de Reserva:</strong><br/><span style="color: #6b7280;">${d.bookingId}</span></td></tr>
          <tr><td style="padding: 10px 0;"><strong>Vehículo:</strong><br/><span style="color: #6b7280;">${d.carBrand} ${d.carModel}</span></td></tr>
          <tr><td style="padding: 10px 0;"><strong>Desde:</strong><br/><span style="color: #6b7280;">${formatDate(String(d.startDate))}</span></td></tr>
          <tr><td style="padding: 10px 0;"><strong>Hasta:</strong><br/><span style="color: #6b7280;">${formatDate(String(d.endDate))}</span></td></tr>
          <tr><td style="padding: 10px 0; border-top: 1px solid #e5e7eb;"><strong>Total:</strong><br/><span style="color: #16a34a; font-size: 24px; font-weight: bold;">${formatCurrency(Number(d.totalPrice), String(d.currency || 'ARS'))}</span></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px;" align="center">
        <a href="${appBaseUrl}/bookings/${d.bookingId}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Ver Detalles</a>
      </td>
    </tr>
  `);
}

function bookingCancellationTemplate(d: Record<string, unknown>): string {
    return baseTemplate(`
    <tr>
      <td style="padding: 30px 40px;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Hola <strong>${d.recipientName}</strong>,</p>
        <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
          Tu reserva de <strong>${d.carBrand} ${d.carModel}</strong> ha sido cancelada.
        </p>
        ${d.refundAmount ? `<p style="margin-top: 15px; color: #6b7280;">Se procesará un reembolso de ${formatCurrency(Number(d.refundAmount), String(d.currency || 'ARS'))}.</p>` : ''}
        ${d.reason ? `<p style="margin-top: 15px; color: #6b7280;">Motivo: ${d.reason}</p>` : ''}
      </td>
    </tr>
  `);
}

function bookingReminderTemplate(d: Record<string, unknown>): string {
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://autorentar.com';
    return baseTemplate(`
    <tr>
      <td style="padding: 30px 40px;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Hola <strong>${d.recipientName}</strong>,</p>
        <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
          ${d.reminderType === 'start'
            ? `Tu reserva de <strong>${d.carBrand} ${d.carModel}</strong> comienza ${d.timeUntil || 'pronto'}.`
            : `Recuerda devolver <strong>${d.carBrand} ${d.carModel}</strong> ${d.timeUntil || 'pronto'}.`}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px;" align="center">
        <a href="${appBaseUrl}/bookings/${d.bookingId}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Ver Reserva</a>
      </td>
    </tr>
  `);
}

function depositConfirmationTemplate(d: Record<string, unknown>): string {
    return baseTemplate(`
    <tr>
      <td style="padding: 30px 40px;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Hola <strong>${d.recipientName}</strong>,</p>
        <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
          La garantía de ${formatCurrency(Number(d.depositAmount), String(d.currency || 'ARS'))} para tu reserva de <strong>${d.carBrand} ${d.carModel}</strong> ha sido ${d.action === 'released' ? 'liberada' : 'confirmada'}.
        </p>
        ${d.action === 'released' ? '<p style="margin-top: 15px; color: #16a34a;">El dinero volverá a tu método de pago en 5-10 días hábiles.</p>' : ''}
      </td>
    </tr>
  `);
}

function refundConfirmationTemplate(d: Record<string, unknown>): string {
    return baseTemplate(`
    <tr>
      <td style="padding: 30px 40px;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Hola <strong>${d.recipientName}</strong>,</p>
        <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
          Hemos procesado un reembolso de <strong style="color: #16a34a;">${formatCurrency(Number(d.refundAmount), String(d.currency || 'ARS'))}</strong>.
        </p>
        <p style="margin-top: 15px; color: #6b7280;">El dinero estará disponible en tu método de pago en 5-10 días hábiles.</p>
        ${d.reason ? `<p style="margin-top: 15px; color: #6b7280;">Motivo: ${d.reason}</p>` : ''}
      </td>
    </tr>
  `);
}

function verificationApprovedTemplate(d: Record<string, unknown>): string {
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://autorentar.com';
    return baseTemplate(`
    <tr>
      <td style="padding: 30px 40px;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">¡Hola <strong>${d.recipientName}</strong>!</p>
        <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
          🎉 <strong>¡Tu verificación ha sido aprobada!</strong>
        </p>
        <p style="margin-top: 15px; color: #6b7280;">
          Ya puedes ${d.verificationLevel === 'owner' ? 'publicar tus vehículos y' : ''} alquilar autos en AutoRenta.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px;" align="center">
        <a href="${appBaseUrl}/cars/list" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Explorar Autos</a>
      </td>
    </tr>
  `);
}

function verificationRejectedTemplate(d: Record<string, unknown>): string {
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://autorentar.com';
    return baseTemplate(`
    <tr>
      <td style="padding: 30px 40px;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Hola <strong>${d.recipientName}</strong>,</p>
        <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
          Lamentablemente, tu verificación no pudo ser aprobada.
        </p>
        ${d.reason ? `<p style="margin-top: 15px; color: #ef4444;"><strong>Motivo:</strong> ${d.reason}</p>` : ''}
        <p style="margin-top: 15px; color: #6b7280;">
          Por favor, revisa tus documentos y vuelve a intentar.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 40px;" align="center">
        <a href="${appBaseUrl}/verification" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Reintentar Verificación</a>
      </td>
    </tr>
  `);
}

function marketingTemplate(d: Record<string, unknown>): string {
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://autorentar.com';
    return baseTemplate(`
    <tr>
      <td style="padding: 30px 40px;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Hola <strong>${d.recipientName || 'Usuario'}</strong>,</p>
        <div style="color: #6b7280; font-size: 16px; line-height: 1.6;">
          ${d.htmlContent || d.body || ''}
        </div>
      </td>
    </tr>
    ${d.ctaUrl ? `
    <tr>
      <td style="padding: 20px 40px;" align="center">
        <a href="${d.ctaUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">${d.ctaText || 'Ver Más'}</a>
      </td>
    </tr>
    ` : ''}
  `);
}

function genericTemplate(d: Record<string, unknown>): string {
    return baseTemplate(`
    <tr>
      <td style="padding: 30px 40px;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Hola <strong>${d.recipientName || 'Usuario'}</strong>,</p>
        <div style="color: #6b7280; font-size: 16px; line-height: 1.6;">
          ${d.body || d.message || ''}
        </div>
      </td>
    </tr>
  `);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const request: EmailRequest = await req.json();
        const { template, to, recipientName, data } = request;

        // Validate required fields
        if (!template || !to) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing required fields: template, to' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get template (fallback to generic)
        const templateDef = TEMPLATES[template] || TEMPLATES['generic'];

        // Enrich data with recipient name
        const enrichedData = {
            ...data,
            recipientName: recipientName || data.recipientName || 'Usuario',
        };

        // Generate email
        const subject = request.subject || templateDef.subject(enrichedData);
        const html = templateDef.html(enrichedData);

        // Get Resend API key
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
            console.error('RESEND_API_KEY not configured');
            return new Response(
                JSON.stringify({ success: false, error: 'Email service not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Send email via Resend
        console.log(`[email-service] Sending "${template}" to ${to}`);

        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: 'AutoRenta <noreply@autorentar.com>',
                to: [to],
                subject,
                html,
            }),
        });

        if (!emailResponse.ok) {
            const errorData = await emailResponse.json();
            console.error('[email-service] Resend API error:', errorData);
            return new Response(
                JSON.stringify({ success: false, error: 'Failed to send email' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const result = await emailResponse.json();
        console.log('[email-service] Email sent:', result.id);

        return new Response(
            JSON.stringify({ success: true, emailId: result.id }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[email-service] Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
