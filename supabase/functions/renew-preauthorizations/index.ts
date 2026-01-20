/**
 * Renew Pre-authorizations Edge Function
 *
 * Cron job que renueva pre-autorizaciones que están por expirar.
 * Las pre-auth de MercadoPago expiran en 7 días, renovamos a los 5 días.
 *
 * Flujo:
 * 1. Buscar pre-auths que expiran en 2 días
 * 2. Verificar si el usuario tiene tarjeta guardada
 * 3. Si sí: crear nueva pre-auth con la tarjeta guardada
 * 4. Si éxito: cancelar la pre-auth anterior
 * 5. Si no tiene tarjeta: enviar notificación al usuario
 *
 * Schedule: Cada 6 horas (0 */6 * * *)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import {
  createPaymentWithSavedCard,
  cancelPreauthorization,
} from '../_shared/mercadopago-card-saver.ts';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;

interface ExpiringPreauth {
  intent_id: string;
  booking_id: string;
  renter_id: string;
  amount: number;
  mp_payment_id: string;
  preauth_expires_at: string;
  saved_card_id: string | null;
  booking_status: string;
  booking_end_date: string;
  mp_customer_id: string | null;
  mp_card_id: string | null;
  card_last4: string | null;
  profile_customer_id: string | null;
  email: string;
  full_name: string;
  days_until_expiry: number;
  can_auto_renew: boolean;
}

interface RenewalResult {
  intent_id: string;
  booking_id: string;
  status: 'renewed' | 'manual_required' | 'booking_ended' | 'failed';
  message: string;
  new_payment_id?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[renew-preauth] Starting pre-authorization renewal check...');

    // 1. Obtener pre-auths que expiran pronto usando la vista
    const { data: expiringPreauths, error: fetchError } = await supabase
      .from('v_expiring_preauthorizations')
      .select('*')
      .limit(50);

    if (fetchError) {
      console.error('[renew-preauth] Error fetching expiring pre-auths:', fetchError);
      throw fetchError;
    }

    if (!expiringPreauths || expiringPreauths.length === 0) {
      console.log('[renew-preauth] No expiring pre-authorizations found');
      return new Response(
        JSON.stringify({ message: 'No expiring pre-auths found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[renew-preauth] Found ${expiringPreauths.length} expiring pre-authorizations`);

    const results: RenewalResult[] = [];

    for (const preauth of expiringPreauths as ExpiringPreauth[]) {
      console.log(`[renew-preauth] Processing intent ${preauth.intent_id} for booking ${preauth.booking_id}`);

      // 2. Verificar si el booking ya terminó o está por terminar
      const bookingEndDate = new Date(preauth.booking_end_date);
      const now = new Date();
      const daysUntilBookingEnd = Math.ceil((bookingEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Si el booking termina en menos de 2 días, no renovar (se va a capturar o liberar pronto)
      if (daysUntilBookingEnd <= 2) {
        console.log(`[renew-preauth] Booking ${preauth.booking_id} ends in ${daysUntilBookingEnd} days, skipping renewal`);
        results.push({
          intent_id: preauth.intent_id,
          booking_id: preauth.booking_id,
          status: 'booking_ended',
          message: `Booking termina en ${daysUntilBookingEnd} días, no requiere renovación`,
        });
        continue;
      }

      // 3. Intentar renovación automática si tiene tarjeta
      const customerId = preauth.mp_customer_id || preauth.profile_customer_id;
      const cardId = preauth.mp_card_id;

      if (customerId && cardId) {
        console.log(`[renew-preauth] Attempting auto-renewal with card ${preauth.card_last4}`);

        // Crear nueva pre-auth
        const newPayment = await createPaymentWithSavedCard(
          customerId,
          cardId,
          preauth.amount,
          `Renovación de garantía - Reserva ${preauth.booking_id.slice(0, 8)}`,
          `preauth-renewal-${preauth.intent_id}`,
          MERCADOPAGO_ACCESS_TOKEN,
          false // capture = false = pre-auth
        );

        if (newPayment.success && newPayment.payment_id) {
          console.log(`[renew-preauth] New pre-auth created: ${newPayment.payment_id}`);

          // 4. Cancelar la pre-auth anterior
          const cancelled = await cancelPreauthorization(
            preauth.mp_payment_id,
            MERCADOPAGO_ACCESS_TOKEN
          );

          if (!cancelled) {
            console.warn(`[renew-preauth] Could not cancel old pre-auth ${preauth.mp_payment_id}, but new one is active`);
          }

          // 5. Actualizar el payment_intent con los nuevos datos
          const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          const { error: updateError } = await supabase
            .from('payment_intents')
            .update({
              mp_payment_id: newPayment.payment_id.toString(),
              mp_status: newPayment.status,
              mp_status_detail: newPayment.status_detail,
              preauth_expires_at: newExpiresAt,
              authorized_at: new Date().toISOString(),
              metadata: {
                renewed_at: new Date().toISOString(),
                previous_mp_payment_id: preauth.mp_payment_id,
                renewal_count: 1, // TODO: increment if already renewed
              },
            })
            .eq('id', preauth.intent_id);

          if (updateError) {
            console.error('[renew-preauth] Error updating intent:', updateError);
          }

          // Notificar al usuario que se renovó automáticamente
          await supabase.from('notifications').insert({
            user_id: preauth.renter_id,
            type: 'payment',
            title: 'Garantía renovada automáticamente',
            message: `La garantía de tu reserva #${preauth.booking_id.slice(0, 8)} fue renovada automáticamente. No se realizó ningún cobro adicional.`,
            data: {
              booking_id: preauth.booking_id,
              intent_id: preauth.intent_id,
              card_last4: preauth.card_last4,
            },
          });

          results.push({
            intent_id: preauth.intent_id,
            booking_id: preauth.booking_id,
            status: 'renewed',
            message: 'Renovada automáticamente',
            new_payment_id: newPayment.payment_id,
          });

          console.log(`[renew-preauth] Successfully renewed pre-auth for booking ${preauth.booking_id}`);
        } else {
          // Falló la renovación automática
          console.error(`[renew-preauth] Auto-renewal failed: ${newPayment.error}`);

          // Marcar como que necesita intervención manual
          await supabase
            .from('payment_intents')
            .update({
              metadata: {
                renewal_failed_at: new Date().toISOString(),
                renewal_error: newPayment.error,
              },
            })
            .eq('id', preauth.intent_id);

          // Notificar al usuario
          await createManualRenewalNotification(supabase, preauth, newPayment.error || 'Error desconocido');

          results.push({
            intent_id: preauth.intent_id,
            booking_id: preauth.booking_id,
            status: 'failed',
            message: `Renovación automática falló: ${newPayment.error}`,
          });
        }
      } else {
        // 6. No tiene tarjeta guardada, requiere acción manual
        console.log(`[renew-preauth] No saved card for user ${preauth.renter_id}, sending notification`);

        await createManualRenewalNotification(supabase, preauth, 'No hay tarjeta guardada');

        results.push({
          intent_id: preauth.intent_id,
          booking_id: preauth.booking_id,
          status: 'manual_required',
          message: 'Usuario debe ingresar tarjeta manualmente',
        });
      }
    }

    // Resumen
    const renewed = results.filter(r => r.status === 'renewed').length;
    const manual = results.filter(r => r.status === 'manual_required').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'booking_ended').length;

    console.log(`[renew-preauth] Completed. Renewed: ${renewed}, Manual: ${manual}, Failed: ${failed}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        renewed,
        manual_required: manual,
        failed,
        skipped,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[renew-preauth] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Crea notificación para renovación manual
 */
async function createManualRenewalNotification(
  supabase: ReturnType<typeof createClient>,
  preauth: ExpiringPreauth,
  reason: string
): Promise<void> {
  try {
    // Notificación al arrendatario
    await supabase.from('notifications').insert({
      user_id: preauth.renter_id,
      type: 'payment',
      title: '⚠️ Acción requerida: Garantía por vencer',
      message: `La garantía de tu reserva #${preauth.booking_id.slice(0, 8)} vence en ${preauth.days_until_expiry} días. Por favor, actualiza tu método de pago para continuar con la reserva.`,
      data: {
        booking_id: preauth.booking_id,
        intent_id: preauth.intent_id,
        action_required: 'update_payment_method',
        expires_at: preauth.preauth_expires_at,
      },
    });

    // Alerta al sistema (para dashboard admin)
    await supabase.from('notifications').insert({
      user_id: preauth.renter_id, // Podría ser un admin_id
      type: 'system_alert',
      title: 'Renovación de garantía requiere acción',
      message: `Reserva #${preauth.booking_id.slice(0, 8)} - ${preauth.full_name} (${preauth.email}). Razón: ${reason}`,
      data: {
        booking_id: preauth.booking_id,
        intent_id: preauth.intent_id,
        renter_id: preauth.renter_id,
        reason: reason,
        amount: preauth.amount,
      },
    });

    // TODO: Enviar push notification y/o WhatsApp
    console.log(`[renew-preauth] Sent manual renewal notification to ${preauth.email}`);
  } catch (error) {
    console.error('[renew-preauth] Error creating notification:', error);
  }
}
