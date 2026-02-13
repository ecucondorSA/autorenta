/**
 * Supabase Edge Function: mercadopago-retry-failed-deposits
 *
 * Reintenta procesar depósitos pendientes que no se confirmaron automáticamente.
 * Se ejecuta periódicamente (cada 10 minutos) vía pg_cron o manualmente.
 *
 * Flujo:
 * 1. Busca transacciones de depósito pendientes más antiguas de 5 minutos
 * 2. Consulta MercadoPago API para verificar el estado del pago
 * 3. Si el pago está aprobado, confirma el depósito
 * 4. Si el pago está rechazado/expirado, marca la transacción como fallida
 * 5. Si el pago sigue pendiente, lo deja para el siguiente ciclo
 *
 * Environment Variables Required:
 * - MERCADOPAGO_ACCESS_TOKEN: Access token de Mercado Pago
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getMercadoPagoAccessToken, MP_API_BASE, MP_TIMEOUT } from '../_shared/mercadopago-token.ts';
import { fromRequest } from '../_shared/logger.ts';

interface RetryResult {
  transaction_id: string;
  payment_id: string | null;
  status: 'confirmed' | 'failed' | 'still_pending' | 'no_payment_id' | 'api_error';
  message: string;
}

interface MPPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  payment_type_id?: string;
  transaction_amount?: number;
  date_approved?: string;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const log = fromRequest(req).child('retry-failed-deposits');

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const MP_ACCESS_TOKEN = getMercadoPagoAccessToken('mercadopago-retry-failed-deposits');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Buscar depósitos pendientes antiguos (más de 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: pendingDeposits, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, provider_metadata, created_at')
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .lt('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      log.error('Error fetching pending deposits', fetchError);
      throw fetchError;
    }

    if (!pendingDeposits || pendingDeposits.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending deposits to retry',
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results: RetryResult[] = [];

    for (const deposit of pendingDeposits) {
      const metadata = deposit.provider_metadata;

      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        results.push({
          transaction_id: deposit.id,
          payment_id: null,
          status: 'no_payment_id',
          message: 'Invalid or missing metadata',
        });
        continue;
      }

      const metadataRecord = metadata as Record<string, unknown>;
      const paymentId = metadataRecord.payment_id || metadataRecord.id;

      if (!paymentId || typeof paymentId !== 'string') {
        results.push({
          transaction_id: deposit.id,
          payment_id: null,
          status: 'no_payment_id',
          message: 'No payment_id in metadata',
        });
        continue;
      }

      // Consultar MercadoPago REST API directamente (SDK-free)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), MP_TIMEOUT.DEFAULT);

        const mpResponse = await fetch(`${MP_API_BASE}/payments/${paymentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!mpResponse.ok) {
          const errorText = await mpResponse.text().catch(() => 'Unknown error');
          results.push({
            transaction_id: deposit.id,
            payment_id: paymentId,
            status: 'api_error',
            message: `MP API ${mpResponse.status}: ${errorText.substring(0, 200)}`,
          });
          continue;
        }

        const paymentData: MPPaymentResponse = await mpResponse.json();

        if (!paymentData || !paymentData.id) {
          results.push({
            transaction_id: deposit.id,
            payment_id: paymentId,
            status: 'api_error',
            message: 'Invalid payment data from MercadoPago',
          });
          continue;
        }

        if (paymentData.status === 'approved') {
          const { error: confirmError } = await supabase.rpc(
            'wallet_confirm_deposit_admin',
            {
              p_user_id: deposit.user_id,
              p_transaction_id: deposit.id,
              p_provider_transaction_id: paymentData.id.toString(),
              p_provider_metadata: {
                id: paymentData.id,
                status: paymentData.status,
                status_detail: paymentData.status_detail,
                payment_type_id: paymentData.payment_type_id,
                transaction_amount: paymentData.transaction_amount,
                date_approved: paymentData.date_approved,
                retry_confirmed_at: new Date().toISOString(),
              },
            }
          );

          if (confirmError) {
            log.error('Error confirming deposit', new Error(confirmError.message), { deposit_id: deposit.id });
            results.push({
              transaction_id: deposit.id,
              payment_id: paymentId,
              status: 'api_error',
              message: `Confirmation failed: ${confirmError.message}`,
            });
          } else {
            results.push({
              transaction_id: deposit.id,
              payment_id: paymentId,
              status: 'confirmed',
              message: `Deposit confirmed: $${deposit.amount}`,
            });
          }
        } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(paymentData.status)) {
          await supabase
            .from('wallet_transactions')
            .update({
              status: 'failed',
              provider_transaction_id: paymentData.id.toString(),
              provider_metadata: {
                ...metadata,
                status: paymentData.status,
                status_detail: paymentData.status_detail,
                failed_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', deposit.id);

          results.push({
            transaction_id: deposit.id,
            payment_id: paymentId,
            status: 'failed',
            message: `Payment ${paymentData.status}: ${paymentData.status_detail}`,
          });
        } else {
          results.push({
            transaction_id: deposit.id,
            payment_id: paymentId,
            status: 'still_pending',
            message: `Payment status: ${paymentData.status}`,
          });
        }
      } catch (apiError) {
        log.error('MercadoPago API error', apiError instanceof Error ? apiError : new Error(String(apiError)), { payment_id: paymentId });

        if (apiError instanceof Error && apiError.name === 'AbortError') {
          results.push({
            transaction_id: deposit.id,
            payment_id: paymentId,
            status: 'api_error',
            message: 'MercadoPago API timeout',
          });
        } else {
          results.push({
            transaction_id: deposit.id,
            payment_id: paymentId,
            status: 'api_error',
            message: apiError instanceof Error ? apiError.message : 'Unknown API error',
          });
        }
      }
    }

    const summary = {
      total_processed: results.length,
      confirmed: results.filter((r) => r.status === 'confirmed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      still_pending: results.filter((r) => r.status === 'still_pending').length,
      no_payment_id: results.filter((r) => r.status === 'no_payment_id').length,
      api_errors: results.filter((r) => r.status === 'api_error').length,
    };

    log.info('Retry job completed', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    log.error('Retry job failed', error instanceof Error ? error : new Error(String(error)));

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
