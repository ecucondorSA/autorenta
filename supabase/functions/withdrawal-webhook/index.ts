/**
 * Supabase Edge Function: withdrawal-webhook
 *
 * Recibe notificaciones IPN de MercadoPago sobre el estado de las transferencias
 *
 * Flujo:
 * 1. MercadoPago envía notificación cuando cambia el estado
 * 2. Verificamos el withdrawal_request usando external_reference
 * 3. Actualizamos el estado según la respuesta de MP
 * 4. Completamos o marcamos como fallido
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createChildLogger } from '../_shared/logger.ts';

const log = createChildLogger('WithdrawalWebhook');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;

serve(async (req) => {
  try {
    log.info('[withdrawal-webhook] Received webhook from MercadoPago');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse query parameters (IPN sends data as query params)
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic');
    const id = url.searchParams.get('id');

    log.info(`[withdrawal-webhook] Topic: ${topic}, ID: ${id}`);

    if (!topic || !id) {
      log.info('[withdrawal-webhook] Missing topic or id');
      return new Response('OK', { status: 200 }); // Always return 200 to MP
    }

    // Only process money_request topics
    if (topic !== 'money_request') {
      log.info(`[withdrawal-webhook] Ignoring topic: ${topic}`);
      return new Response('OK', { status: 200 });
    }

    // Get the money request details from MercadoPago
    log.info(`[withdrawal-webhook] Fetching money request ${id} from MercadoPago...`);

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/money_requests/${id}`, {
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      log.error('[withdrawal-webhook] Failed to fetch money request from MP:', await mpResponse.text());
      return new Response('OK', { status: 200 }); // Still return 200
    }

    const moneyRequest = await mpResponse.json();

    log.info(`[withdrawal-webhook] Money request status: ${moneyRequest.status}`);
    log.info(`[withdrawal-webhook] External reference: ${moneyRequest.external_reference}`);

    const withdrawalRequestId = moneyRequest.external_reference;

    if (!withdrawalRequestId) {
      log.error('[withdrawal-webhook] No external_reference found');
      return new Response('OK', { status: 200 });
    }

    // Get withdrawal request
    const { data: withdrawalRequest, error: requestError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalRequestId)
      .single();

    if (requestError || !withdrawalRequest) {
      log.error(`[withdrawal-webhook] Withdrawal request not found: ${withdrawalRequestId}`);
      return new Response('OK', { status: 200 });
    }

    log.info(`[withdrawal-webhook] Current withdrawal status: ${withdrawalRequest.status}`);

    // Process based on money request status
    switch (moneyRequest.status) {
      case 'approved':
      case 'completed':
        // Money transfer was successful
        log.info('[withdrawal-webhook] Transfer successful, completing withdrawal...');

        if (withdrawalRequest.status !== 'completed') {
          const { error: completeError } = await supabase.rpc('wallet_complete_withdrawal', {
            p_request_id: withdrawalRequestId,
            p_provider_transaction_id: id.toString(),
            p_provider_metadata: moneyRequest,
          });

          if (completeError) {
            log.error('[withdrawal-webhook] Error completing withdrawal:', completeError);
          } else {
            log.info('[withdrawal-webhook] Withdrawal completed successfully');
          }
        } else {
          log.info('[withdrawal-webhook] Withdrawal already completed');
        }
        break;

      case 'rejected':
      case 'cancelled':
      case 'expired':
        // Money transfer failed
        log.info(`[withdrawal-webhook] Transfer failed with status: ${moneyRequest.status}`);

        if (!['completed', 'failed', 'rejected'].includes(withdrawalRequest.status)) {
          const { error: failError } = await supabase.rpc('wallet_fail_withdrawal', {
            p_request_id: withdrawalRequestId,
            p_failure_reason: `MercadoPago: ${moneyRequest.status} - ${moneyRequest.status_detail || 'No details'}`,
          });

          if (failError) {
            log.error('[withdrawal-webhook] Error marking as failed:', failError);
          } else {
            log.info('[withdrawal-webhook] Withdrawal marked as failed');
          }
        } else {
          log.info('[withdrawal-webhook] Withdrawal already in final state');
        }
        break;

      case 'pending':
      case 'in_process':
        // Still processing
        log.info(`[withdrawal-webhook] Transfer still processing: ${moneyRequest.status}`);
        // No action needed, just log
        break;

      default:
        log.info(`[withdrawal-webhook] Unknown status: ${moneyRequest.status}`);
    }

    // Always return 200 to MercadoPago
    return new Response('OK', { status: 200 });

  } catch (error: any) {
    log.error('[withdrawal-webhook] Unexpected error:', error);
    // Still return 200 to prevent MP from retrying
    return new Response('OK', { status: 200 });
  }
});
