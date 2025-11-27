// ============================================
// EDGE FUNCTION: send-booking-reminder-email
// Propósito: Enviar recordatorios de reservas próximas
// Llamado por: Cron job diario
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface ReminderEmailData {
  bookingId: string;
  recipientEmail: string;
  recipientName: string;
  recipientType: 'renter' | 'owner';
  carBrand: string;
  carModel: string;
  carPlate?: string;
  startDate: string;
  endDate: string;
  pickupLocation?: string;
  daysUntilStart: number;
  ownerName?: string;
  ownerPhone?: string;
  renterName?: string;
  renterPhone?: string;
}

interface SendResult {
  bookingId: string;
  recipientType: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Booking Reminder] Starting reminder process');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://autorentar.com';

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a manual request with specific booking
    let bookingsToRemind: ReminderEmailData[] = [];

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.bookingId) {
          // Single booking reminder
          const { data: booking } = await supabase
            .from('bookings')
            .select(`
              id, start_date, end_date,
              car:cars(brand_text_backup, model_text_backup, plate, location_address),
              renter:profiles!bookings_renter_id_fkey(id, email, full_name, phone),
              owner:profiles!bookings_owner_id_fkey(id, email, full_name, phone)
            `)
            .eq('id', body.bookingId)
            .eq('status', 'confirmed')
            .single();

          if (booking) {
            const daysUntil = Math.ceil(
              (new Date(booking.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            const car = booking.car as Record<string, unknown>;
            const renter = booking.renter as Record<string, unknown>;
            const owner = booking.owner as Record<string, unknown>;

            // Reminder for renter
            bookingsToRemind.push({
              bookingId: booking.id,
              recipientEmail: renter.email as string,
              recipientName: renter.full_name as string,
              recipientType: 'renter',
              carBrand: car.brand_text_backup as string,
              carModel: car.model_text_backup as string,
              carPlate: car.plate as string,
              startDate: booking.start_date,
              endDate: booking.end_date,
              pickupLocation: car.location_address as string,
              daysUntilStart: daysUntil,
              ownerName: owner.full_name as string,
              ownerPhone: owner.phone as string,
            });

            // Reminder for owner
            bookingsToRemind.push({
              bookingId: booking.id,
              recipientEmail: owner.email as string,
              recipientName: owner.full_name as string,
              recipientType: 'owner',
              carBrand: car.brand_text_backup as string,
              carModel: car.model_text_backup as string,
              carPlate: car.plate as string,
              startDate: booking.start_date,
              endDate: booking.end_date,
              pickupLocation: car.location_address as string,
              daysUntilStart: daysUntil,
              renterName: renter.full_name as string,
              renterPhone: renter.phone as string,
            });
          }
        }
      } catch {
        // Ignore parse errors, proceed with cron logic
      }
    }

    // If no manual booking, find bookings starting tomorrow or in 3 days
    if (bookingsToRemind.length === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const threeDaysOut = new Date();
      threeDaysOut.setDate(threeDaysOut.getDate() + 3);
      threeDaysOut.setHours(0, 0, 0, 0);

      const fourDaysOut = new Date(threeDaysOut);
      fourDaysOut.setDate(fourDaysOut.getDate() + 1);

      // Get bookings starting tomorrow (1-day reminder)
      const { data: tomorrowBookings } = await supabase
        .from('bookings')
        .select(`
          id, start_date, end_date,
          car:cars(brand_text_backup, model_text_backup, plate, location_address),
          renter:profiles!bookings_renter_id_fkey(id, email, full_name, phone),
          owner:profiles!bookings_owner_id_fkey(id, email, full_name, phone)
        `)
        .eq('status', 'confirmed')
        .gte('start_date', tomorrow.toISOString())
        .lt('start_date', dayAfterTomorrow.toISOString());

      // Get bookings starting in 3 days (3-day reminder)
      const { data: threeDayBookings } = await supabase
        .from('bookings')
        .select(`
          id, start_date, end_date,
          car:cars(brand_text_backup, model_text_backup, plate, location_address),
          renter:profiles!bookings_renter_id_fkey(id, email, full_name, phone),
          owner:profiles!bookings_owner_id_fkey(id, email, full_name, phone)
        `)
        .eq('status', 'confirmed')
        .gte('start_date', threeDaysOut.toISOString())
        .lt('start_date', fourDaysOut.toISOString());

      const allBookings = [...(tomorrowBookings || []), ...(threeDayBookings || [])];

      for (const booking of allBookings) {
        const daysUntil = Math.ceil(
          (new Date(booking.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const car = booking.car as Record<string, unknown>;
        const renter = booking.renter as Record<string, unknown>;
        const owner = booking.owner as Record<string, unknown>;

        // Reminder for renter
        bookingsToRemind.push({
          bookingId: booking.id,
          recipientEmail: renter.email as string,
          recipientName: renter.full_name as string,
          recipientType: 'renter',
          carBrand: car.brand_text_backup as string,
          carModel: car.model_text_backup as string,
          carPlate: car.plate as string,
          startDate: booking.start_date,
          endDate: booking.end_date,
          pickupLocation: car.location_address as string,
          daysUntilStart: daysUntil,
          ownerName: owner.full_name as string,
          ownerPhone: owner.phone as string,
        });

        // Reminder for owner
        bookingsToRemind.push({
          bookingId: booking.id,
          recipientEmail: owner.email as string,
          recipientName: owner.full_name as string,
          recipientType: 'owner',
          carBrand: car.brand_text_backup as string,
          carModel: car.model_text_backup as string,
          carPlate: car.plate as string,
          startDate: booking.start_date,
          endDate: booking.end_date,
          pickupLocation: car.location_address as string,
          daysUntilStart: daysUntil,
          renterName: renter.full_name as string,
          renterPhone: renter.phone as string,
        });
      }
    }

    if (bookingsToRemind.length === 0) {
      console.log('[Booking Reminder] No bookings to remind');
      return new Response(
        JSON.stringify({ success: true, message: 'No bookings need reminders', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Booking Reminder] Sending ${bookingsToRemind.length} reminders`);

    // Format helpers
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    };

    const results: SendResult[] = [];

    for (const reminder of bookingsToRemind) {
      try {
        const isRenter = reminder.recipientType === 'renter';
        const urgencyText = reminder.daysUntilStart === 1 ? '¡MAÑANA!' : `en ${reminder.daysUntilStart} días`;

        const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 2px solid #f59e0b;">
              <h1 style="margin: 0 0 10px 0; color: #1f2937; font-size: 32px;">🚗 AutoRenta</h1>
              <p style="margin: 0; color: #f59e0b; font-size: 18px; font-weight: 600;">⏰ Recordatorio de Reserva</p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; text-align: center; border: 2px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 20px; font-weight: bold;">
                  ${reminder.daysUntilStart === 1 ? '🔔' : '📅'} Tu reserva comienza ${urgencyText}
                </p>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 10px 40px 20px 40px;">
              <p style="margin: 0; color: #1f2937; font-size: 16px;">
                Hola <strong>${reminder.recipientName}</strong>,
              </p>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 16px;">
                ${isRenter
                  ? 'Te recordamos que tu reserva de vehículo está próxima a comenzar.'
                  : 'Te recordamos que tienes una reserva próxima para tu vehículo.'}
              </p>
            </td>
          </tr>

          <!-- Booking Details -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px;">
                <tr>
                  <td style="padding: 10px 0;">
                    <strong style="color: #374151;">🚘 Vehículo:</strong><br/>
                    <span style="color: #1f2937; font-size: 18px;">${reminder.carBrand} ${reminder.carModel}</span>
                    ${reminder.carPlate ? `<br/><span style="color: #6b7280;">Patente: ${reminder.carPlate}</span>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <strong style="color: #374151;">📅 Inicio:</strong><br/>
                    <span style="color: #1f2937;">${formatDate(reminder.startDate)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <strong style="color: #374151;">📅 Fin:</strong><br/>
                    <span style="color: #1f2937;">${formatDate(reminder.endDate)}</span>
                  </td>
                </tr>
                ${reminder.pickupLocation ? `
                <tr>
                  <td style="padding: 10px 0;">
                    <strong style="color: #374151;">📍 Ubicación:</strong><br/>
                    <span style="color: #1f2937;">${reminder.pickupLocation}</span>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Contact Info -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="background-color: #eff6ff; border-radius: 6px; padding: 20px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: 600;">
                  👤 ${isRenter ? 'Datos del Propietario' : 'Datos del Locatario'}
                </p>
                <p style="margin: 0; color: #1e40af;">
                  <strong>${isRenter ? reminder.ownerName : reminder.renterName}</strong><br/>
                  ${isRenter ? (reminder.ownerPhone ? `📱 ${reminder.ownerPhone}` : '') : (reminder.renterPhone ? `📱 ${reminder.renterPhone}` : '')}
                </p>
              </div>
            </td>
          </tr>

          <!-- Checklist -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 10px 0; color: #374151; font-weight: 600;">
                ${isRenter ? '✅ Antes de retirar el vehículo:' : '✅ Antes de entregar el vehículo:'}
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                ${isRenter ? `
                <li>Lleva tu DNI/Pasaporte y licencia de conducir</li>
                <li>Coordina con el propietario el punto de encuentro</li>
                <li>Revisa el estado del vehículo antes de partir</li>
                <li>Toma fotos del estado inicial</li>
                ` : `
                <li>Prepara la documentación del vehículo</li>
                <li>Verifica que el tanque esté lleno</li>
                <li>Limpia el interior y exterior</li>
                <li>Coordina el punto de encuentro con el locatario</li>
                `}
              </ul>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 20px 40px;" align="center">
              <a href="${appBaseUrl}/bookings/${reminder.bookingId}"
                 style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Ver Detalles de la Reserva
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                ¿Necesitas ayuda? <a href="mailto:soporte@autorentar.com" style="color: #3b82f6;">soporte@autorentar.com</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} AutoRenta
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
            from: 'AutoRenta <recordatorios@autorentar.com>',
            to: [reminder.recipientEmail],
            subject: `⏰ ${reminder.daysUntilStart === 1 ? '¡MAÑANA!' : 'Recordatorio'} Tu reserva de ${reminder.carBrand} ${reminder.carModel}`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          results.push({ bookingId: reminder.bookingId, recipientType: reminder.recipientType, success: true });
        } else {
          const errorData = await emailResponse.json();
          results.push({
            bookingId: reminder.bookingId,
            recipientType: reminder.recipientType,
            success: false,
            error: errorData.message || `HTTP ${emailResponse.status}`,
          });
        }
      } catch (err: unknown) {
        results.push({
          bookingId: reminder.bookingId,
          recipientType: reminder.recipientType,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`[Booking Reminder] Complete: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Booking Reminder] Error:', errorMessage);

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/* ============================================
 * DOCUMENTACIÓN
 * ============================================
 *
 * ## Uso Manual (booking específico)
 *
 * POST /functions/v1/send-booking-reminder-email
 * Body: { "bookingId": "uuid" }
 *
 * ## Uso Automático (Cron)
 *
 * POST /functions/v1/send-booking-reminder-email
 * (Sin body - busca bookings que empiezan mañana o en 3 días)
 *
 * ## Cron Job (pg_cron)
 *
 * SELECT cron.schedule(
 *   'booking-reminders',
 *   '0 8 * * *', -- 8am todos los días
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://PROJECT.supabase.co/functions/v1/send-booking-reminder-email',
 *     headers := '{"Authorization": "Bearer SERVICE_KEY"}'::jsonb
 *   )
 *   $$
 * );
 *
 * ## Variables de Entorno
 *
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - RESEND_API_KEY
 * - APP_BASE_URL
 *
 * ============================================ */
