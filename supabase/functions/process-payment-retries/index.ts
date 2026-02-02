/**
 * @fileoverview Edge Function: process-payment-retries
 * @version 1.0.0
 * @date 2026-02-01
 *
 * Procesa reintentos de pagos fallidos con backoff exponencial.
 * Diseñado para ejecutarse como cron job cada hora.
 *
 * Flujo:
 * 1. Obtiene pagos pendientes de reintento
 * 2. Para cada uno, intenta procesar el pago nuevamente
 * 3. Si falla, programa el siguiente reintento
 * 4. Notifica al usuario en cada intento
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';

declare const Deno: any;

const log = createChildLogger('ProcessPaymentRetries');
const MP_API_BASE = 'https://api.mercadopago.com/v1';

interface RetryRecord {
  id: string;
  payment_id: string | null;
  payment_intent_id: string | null;
  booking_id: string | null;
  user_id: string | null;
  mp_payment_id: string | null;
  amount_cents: number;
  payment_method_id: string | null;
  attempt: number;
  max_attempts: number;
  reason: string;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    exhausted: 0,
    errors: [] as string[],
  };

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')?.trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !MP_ACCESS_TOKEN) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Get pending retries
    const { data: pendingRetries, error: fetchError } = await supabase
      .rpc('get_pending_retries', { p_limit: 50 });

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingRetries || pendingRetries.length === 0) {
      log.info('No pending retries to process');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending retries', results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info(`Processing ${pendingRetries.length} pending retries`);

    // 2. Process each retry
    for (const retry of pendingRetries as RetryRecord[]) {
      results.processed++;

      try {
        // Mark as retrying
        await supabase
          .from('payment_retry_queue')
          .update({ status: 'retrying' })
          .eq('id', retry.id);

        // Attempt to process payment
        const paymentResult = await attemptPayment(retry, MP_ACCESS_TOKEN, supabase);

        // Update result
        const { data: updateResult } = await supabase.rpc('update_retry_result', {
          p_retry_id: retry.id,
          p_success: paymentResult.success,
          p_new_payment_id: paymentResult.payment_id || null,
          p_error_message: paymentResult.error || null,
          p_error_code: paymentResult.error_code || null,
        });

        if (paymentResult.success) {
          results.succeeded++;
          log.info(`✅ Retry ${retry.id} succeeded:`, paymentResult);

          // Notify user of success
          await notifyUser(supabase, retry.user_id, 'payment_retry_success', {
            booking_id: retry.booking_id,
            amount_cents: retry.amount_cents,
          });
        } else {
          if (updateResult?.status === 'exhausted') {
            results.exhausted++;
            log.warn(`❌ Retry ${retry.id} exhausted all attempts`);

            // Notify user that retries exhausted
            await notifyUser(supabase, retry.user_id, 'payment_retry_exhausted', {
              booking_id: retry.booking_id,
              amount_cents: retry.amount_cents,
              error: paymentResult.error,
            });
          } else {
            results.failed++;
            log.info(`⏳ Retry ${retry.id} failed, scheduled next attempt:`, updateResult);

            // Notify user of failed attempt
            await notifyUser(supabase, retry.user_id, 'payment_retry_failed', {
              booking_id: retry.booking_id,
              amount_cents: retry.amount_cents,
              attempt: retry.attempt + 1,
              max_attempts: retry.max_attempts,
              next_retry: updateResult?.next_retry_at,
              error: paymentResult.error,
            });
          }
        }

      } catch (retryError: any) {
        log.error(`Error processing retry ${retry.id}:`, retryError);
        results.errors.push(`${retry.id}: ${retryError.message}`);

        // Reset to pending for next run
        await supabase
          .from('payment_retry_queue')
          .update({
            status: 'pending',
            last_error: retryError.message,
          })
          .eq('id', retry.id);
      }
    }

    const duration = Date.now() - startTime;
    log.info(`Payment retries completed in ${duration}ms:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    log.error('Error in process-payment-retries:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function attemptPayment(
  retry: RetryRecord,
  accessToken: string,
  supabase: any
): Promise<{ success: boolean; payment_id?: string; error?: string; error_code?: string }> {
  // Strategy 1: If we have a payment_method_id (card token), create new payment
  if (retry.payment_method_id && retry.booking_id) {
    try {
      // Get booking details for idempotency key
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, renter_id, car_id, total_amount')
        .eq('id', retry.booking_id)
        .single();

      if (!booking) {
        return { success: false, error: 'Booking not found', error_code: 'BOOKING_NOT_FOUND' };
      }

      // Get user email for payer
      const { data: user } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', retry.user_id)
        .single();

      // Create payment via MercadoPago
      const idempotencyKey = `retry_${retry.id}_${retry.attempt}`;

      const mpResponse = await fetch(`${MP_API_BASE}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          transaction_amount: retry.amount_cents / 100,
          token: retry.payment_method_id,
          description: `Retry payment for booking ${retry.booking_id}`,
          installments: 1,
          payment_method_id: 'visa', // This should come from the original payment
          payer: {
            email: user?.email || 'unknown@autorentar.com',
          },
          external_reference: `booking_${retry.booking_id}_retry_${retry.attempt}`,
          metadata: {
            retry_id: retry.id,
            original_payment_id: retry.mp_payment_id,
            booking_id: retry.booking_id,
          },
        }),
      });

      const mpResult = await mpResponse.json();

      if (mpResult.status === 'approved') {
        return {
          success: true,
          payment_id: String(mpResult.id),
        };
      } else {
        return {
          success: false,
          error: mpResult.message || mpResult.status_detail || 'Payment not approved',
          error_code: mpResult.status,
        };
      }

    } catch (mpError: any) {
      return {
        success: false,
        error: mpError.message || 'MercadoPago API error',
        error_code: 'MP_API_ERROR',
      };
    }
  }

  // Strategy 2: Check if original payment was approved in the meantime
  if (retry.mp_payment_id) {
    try {
      const checkResponse = await fetch(`${MP_API_BASE}/payments/${retry.mp_payment_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const checkResult = await checkResponse.json();

      if (checkResult.status === 'approved') {
        return {
          success: true,
          payment_id: String(checkResult.id),
        };
      }

      return {
        success: false,
        error: `Payment still ${checkResult.status}: ${checkResult.status_detail}`,
        error_code: checkResult.status,
      };

    } catch (checkError: any) {
      return {
        success: false,
        error: checkError.message || 'Failed to check payment status',
        error_code: 'CHECK_ERROR',
      };
    }
  }

  return {
    success: false,
    error: 'No payment method or payment ID to retry',
    error_code: 'NO_RETRY_METHOD',
  };
}

async function notifyUser(
  supabase: any,
  userId: string | null,
  eventType: string,
  data: Record<string, any>
): Promise<void> {
  if (!userId) return;

  try {
    const messages: Record<string, { title: string; body: string }> = {
      payment_retry_success: {
        title: '✅ Pago Procesado',
        body: `Tu pago de ${formatCurrency(data.amount_cents / 100)} fue procesado exitosamente.`,
      },
      payment_retry_failed: {
        title: '⚠️ Pago Pendiente',
        body: `No pudimos procesar tu pago. Intento ${data.attempt}/${data.max_attempts}. Reintentaremos automáticamente.`,
      },
      payment_retry_exhausted: {
        title: '❌ Pago Fallido',
        body: `No pudimos procesar tu pago de ${formatCurrency(data.amount_cents / 100)}. Por favor actualiza tu método de pago.`,
      },
    };

    const message = messages[eventType];
    if (!message) return;

    await supabase.functions.invoke('notify-multi-channel', {
      body: {
        user_id: userId,
        event_type: eventType,
        title: message.title,
        message: message.body,
        data: {
          ...data,
          action_url: data.booking_id ? `/bookings/${data.booking_id}/payment` : '/wallet',
        },
        channels: ['push', 'email'],
      },
    });

    // Update notification count
    await supabase
      .from('payment_retry_queue')
      .update({
        user_notified_count: supabase.sql`user_notified_count + 1`,
        last_notified_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'pending');

  } catch (error) {
    log.error('Error notifying user:', error);
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}
