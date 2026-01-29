/**
 * Supabase Edge Function: process-webhook-dlq
 *
 * Procesa items del Dead Letter Queue (webhook_dead_letter).
 * Reintenta webhooks fallidos con backoff exponencial.
 *
 * Diseñado para ser llamado por:
 * - Cron job de Supabase (pg_cron) cada 5 minutos
 * - n8n workflow periódico
 * - Manualmente por admin
 *
 * Flujo:
 * 1. Obtener items pendientes ordenados por next_retry_at
 * 2. Para cada item:
 *    a. Intentar reprocesar según tipo de evento
 *    b. Si éxito: marcar como 'resolved'
 *    c. Si falla: incrementar retry_count y calcular next_retry
 *    d. Si max retries alcanzado: marcar como 'failed' y alertar
 *
 * Environment Variables Required:
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key
 * - MERCADOPAGO_ACCESS_TOKEN: Para verificar pagos
 * - ALERT_WEBHOOK_URL: (opcional) URL para alertas críticas
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface DLQItem {
  id: string;
  event_type: string;
  event_id: string;
  payload: Record<string, unknown>;
  error_message: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string;
  status: 'pending' | 'retrying' | 'resolved' | 'failed';
  created_at: string;
}

interface ProcessResult {
  id: string;
  event_type: string;
  success: boolean;
  message: string;
  final_status: 'resolved' | 'retrying' | 'failed';
}

const MAX_ITEMS_PER_RUN = 10; // Limitar para evitar timeouts

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Obtener items pendientes para retry
    const now = new Date().toISOString();
    const { data: items, error: fetchError } = await supabase
      .from('webhook_dead_letter')
      .select('*')
      .in('status', ['pending', 'retrying'])
      .lte('next_retry_at', now)
      .order('next_retry_at', { ascending: true })
      .limit(MAX_ITEMS_PER_RUN);

    if (fetchError) {
      // Tabla puede no existir aún
      if (fetchError.message.includes('does not exist')) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'DLQ table not yet created',
            processed: 0,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      throw fetchError;
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No items to process',
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results: ProcessResult[] = [];

    for (const item of items as DLQItem[]) {
      // Marcar como retrying
      await supabase
        .from('webhook_dead_letter')
        .update({ status: 'retrying' })
        .eq('id', item.id);

      let success = false;
      let message = '';

      try {
        // Procesar según tipo de evento
        switch (item.event_type) {
          case 'payment':
          case 'payment.created':
          case 'payment.updated':
            success = await processPaymentEvent(supabase, item, MP_ACCESS_TOKEN);
            message = success ? 'Payment processed successfully' : 'Payment processing failed';
            break;

          case 'merchant_order':
            success = await processMerchantOrderEvent(supabase, item, MP_ACCESS_TOKEN);
            message = success ? 'Merchant order processed' : 'Merchant order processing failed';
            break;

          case 'preapproval':
          case 'preapproval_plan':
            success = await processPreapprovalEvent(supabase, item, MP_ACCESS_TOKEN);
            message = success ? 'Preapproval processed' : 'Preapproval processing failed';
            break;

          default:
            // Evento desconocido - marcar como fallido permanentemente
            message = `Unknown event type: ${item.event_type}`;
            success = false;
        }
      } catch (e) {
        message = e instanceof Error ? e.message : 'Unknown error during processing';
        success = false;
      }

      // Actualizar estado del item
      let finalStatus: 'resolved' | 'retrying' | 'failed';

      if (success) {
        finalStatus = 'resolved';
        await supabase
          .from('webhook_dead_letter')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', item.id);
      } else if (item.retry_count + 1 >= item.max_retries) {
        finalStatus = 'failed';
        await supabase
          .from('webhook_dead_letter')
          .update({
            status: 'failed',
            retry_count: item.retry_count + 1,
            error_message: message,
          })
          .eq('id', item.id);

        // Alertar sobre fallo permanente
        await sendFailureAlert(item, message);
      } else {
        finalStatus = 'retrying';
        // Calcular próximo retry con backoff exponencial
        const nextRetryMinutes = Math.pow(2, item.retry_count + 1) * 5; // 10, 20, 40, 80, 160 min
        const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60 * 1000).toISOString();

        await supabase
          .from('webhook_dead_letter')
          .update({
            status: 'pending',
            retry_count: item.retry_count + 1,
            next_retry_at: nextRetryAt,
            error_message: message,
          })
          .eq('id', item.id);
      }

      results.push({
        id: item.id,
        event_type: item.event_type,
        success,
        message,
        final_status: finalStatus,
      });
    }

    // Resumen de resultados
    const resolved = results.filter((r) => r.final_status === 'resolved').length;
    const retrying = results.filter((r) => r.final_status === 'retrying').length;
    const failed = results.filter((r) => r.final_status === 'failed').length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        summary: { resolved, retrying, failed },
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing DLQ:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Procesa eventos de pago
 */
async function processPaymentEvent(
  supabase: any,
  item: DLQItem,
  mpToken: string | undefined
): Promise<boolean> {
  if (!mpToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
  }

  const paymentId = item.payload.data?.id || item.event_id;
  if (!paymentId) {
    throw new Error('No payment ID in payload');
  }

  // Obtener estado actual del pago en MercadoPago
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${mpToken.trim()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`MercadoPago API error: ${response.status}`);
  }

  const payment = await response.json();

  // Buscar el booking asociado
  const externalRef = payment.external_reference;
  if (!externalRef) {
    throw new Error('Payment has no external_reference');
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', externalRef)
    .single();

  if (bookingError || !booking) {
    throw new Error(`Booking not found: ${externalRef}`);
  }

  // Solo procesar si el pago está aprobado y el booking está pendiente
  if (payment.status === 'approved' && booking.status === 'pending_payment') {
    // Registrar el pago
    const { error: paymentError } = await supabase.from('payments').upsert(
      {
        id: payment.id.toString(),
        booking_id: booking.id,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        status: 'completed',
        provider: 'mercadopago',
        provider_payment_id: payment.id.toString(),
        provider_metadata: payment,
        paid_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (paymentError) {
      throw new Error(`Failed to record payment: ${paymentError.message}`);
    }

    // Actualizar booking a confirmed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', booking.id);

    if (updateError) {
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    return true;
  }

  // Si el pago ya fue procesado o el booking ya está en otro estado, marcar como resuelto
  if (
    booking.status !== 'pending_payment' ||
    payment.status === 'approved' ||
    payment.status === 'cancelled' ||
    payment.status === 'rejected'
  ) {
    return true; // Resolved - no action needed
  }

  return false;
}

/**
 * Procesa eventos de merchant order
 */
async function processMerchantOrderEvent(
  supabase: any,
  item: DLQItem,
  mpToken: string | undefined
): Promise<boolean> {
  if (!mpToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
  }

  const orderId = item.payload.data?.id || item.event_id;
  if (!orderId) {
    throw new Error('No order ID in payload');
  }

  // Obtener merchant order
  const response = await fetch(`https://api.mercadopago.com/merchant_orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${mpToken.trim()}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Order no existe - marcar como resuelto
      return true;
    }
    throw new Error(`MercadoPago API error: ${response.status}`);
  }

  const order = await response.json();

  // Verificar si hay pagos asociados
  if (order.payments && order.payments.length > 0) {
    for (const payment of order.payments) {
      if (payment.status === 'approved') {
        // Crear DLQ item para el pago si no existe
        await supabase.from('webhook_dead_letter').upsert(
          {
            event_type: 'payment',
            event_id: payment.id.toString(),
            payload: { data: { id: payment.id } },
            error_message: 'Created from merchant order',
            status: 'pending',
            next_retry_at: new Date().toISOString(),
          },
          { onConflict: 'event_id' }
        );
      }
    }
  }

  return true;
}

/**
 * Procesa eventos de preapproval (suscripciones/pre-autorizaciones)
 */
async function processPreapprovalEvent(
  supabase: any,
  item: DLQItem,
  mpToken: string | undefined
): Promise<boolean> {
  if (!mpToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
  }

  const preapprovalId = item.payload.data?.id || item.event_id;
  if (!preapprovalId) {
    throw new Error('No preapproval ID in payload');
  }

  // Obtener estado de preapproval
  const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: {
      Authorization: `Bearer ${mpToken.trim()}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return true; // No existe, marcar como resuelto
    }
    throw new Error(`MercadoPago API error: ${response.status}`);
  }

  const preapproval = await response.json();

  // Actualizar estado en nuestra base de datos
  const { error } = await supabase
    .from('preauthorizations')
    .update({
      status: preapproval.status,
      provider_metadata: preapproval,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_preauth_id', preapprovalId);

  if (error) {
    // Puede que no exista aún - registrar
    console.warn('Could not update preauthorization:', error.message);
  }

  return true;
}

/**
 * Envía alerta cuando un item falla permanentemente
 */
async function sendFailureAlert(item: DLQItem, errorMessage: string): Promise<void> {
  const alertUrl = Deno.env.get('ALERT_WEBHOOK_URL');
  const n8nUrl = Deno.env.get('N8N_ALERT_WEBHOOK_URL');

  const alertPayload = {
    severity: 'critical',
    source: 'process-webhook-dlq',
    event_type: 'dlq_permanent_failure',
    timestamp: new Date().toISOString(),
    details: {
      dlq_item_id: item.id,
      event_type: item.event_type,
      event_id: item.event_id,
      retry_count: item.retry_count,
      error_message: errorMessage,
      created_at: item.created_at,
    },
    message: `DLQ item permanently failed after ${item.retry_count} retries: ${item.event_type} - ${item.event_id}`,
  };

  // Intentar enviar a ambos endpoints si están configurados
  const urls = [alertUrl, n8nUrl].filter(Boolean);

  for (const url of urls) {
    try {
      await fetch(url!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload),
      });
    } catch (e) {
      console.error(`Failed to send alert to ${url}:`, e);
    }
  }
}
