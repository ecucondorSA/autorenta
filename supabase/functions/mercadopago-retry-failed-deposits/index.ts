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
import MercadoPagoConfig from 'https://esm.sh/mercadopago@2';
import { Payment } from 'https://esm.sh/mercadopago@2';

interface RetryResult {
  transaction_id: string;
  payment_id: string | null;
  status: 'confirmed' | 'failed' | 'still_pending' | 'no_payment_id' | 'api_error';
  message: string;
}

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== MercadoPago Retry Failed Deposits Job Started ===');

    // Configuración
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !MP_ACCESS_TOKEN) {
      throw new Error('Missing required environment variables');
    }

    // Crear cliente de Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Crear cliente de MercadoPago
    const client = new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
      options: {
        timeout: 5000,
      },
    });
    const paymentClient = new Payment(client);

    // Buscar depósitos pendientes antiguos (más de 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: pendingDeposits, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, provider_metadata, created_at')
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .lt('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: true })
      .limit(50); // Procesar máximo 50 por ejecución

    if (fetchError) {
      console.error('Error fetching pending deposits:', fetchError);
      throw fetchError;
    }

    if (!pendingDeposits || pendingDeposits.length === 0) {
      console.log('No pending deposits found older than 5 minutes');
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

    console.log(`Found ${pendingDeposits.length} pending deposits to retry`);

    // Procesar cada depósito
    const results: RetryResult[] = [];

    for (const deposit of pendingDeposits) {
      console.log(`Processing deposit ${deposit.id}...`);

      // Intentar obtener payment_id de metadata
      const metadata = deposit.provider_metadata as any;
      let paymentId = metadata?.payment_id || metadata?.id;

      // Si no hay payment_id en metadata, buscar por external_reference en MP
      if (!paymentId) {
        console.log(`No payment_id found for transaction ${deposit.id}, skipping for now`);
        results.push({
          transaction_id: deposit.id,
          payment_id: null,
          status: 'no_payment_id',
          message: 'No payment_id in metadata',
        });
        continue;
      }

      // Consultar MercadoPago API
      try {
        console.log(`Fetching payment ${paymentId} from MercadoPago...`);
        const paymentData = await paymentClient.get({ id: paymentId });

        if (!paymentData || !paymentData.id) {
          console.error(`Invalid payment data for ${paymentId}`);
          results.push({
            transaction_id: deposit.id,
            payment_id: paymentId,
            status: 'api_error',
            message: 'Invalid payment data from MercadoPago',
          });
          continue;
        }

        console.log(`Payment ${paymentId} status: ${paymentData.status}`);

        // Verificar estado del pago
        if (paymentData.status === 'approved') {
          // Pago aprobado - confirmar depósito
          console.log(`Payment approved, confirming deposit ${deposit.id}...`);

          const { data: confirmResult, error: confirmError } = await supabase.rpc(
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
            console.error(`Error confirming deposit ${deposit.id}:`, confirmError);
            results.push({
              transaction_id: deposit.id,
              payment_id: paymentId,
              status: 'api_error',
              message: `Confirmation failed: ${confirmError.message}`,
            });
          } else {
            console.log(`Deposit ${deposit.id} confirmed successfully`);
            results.push({
              transaction_id: deposit.id,
              payment_id: paymentId,
              status: 'confirmed',
              message: `Deposit confirmed: $${deposit.amount}`,
            });
          }
        } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(paymentData.status)) {
          // Pago rechazado/cancelado - marcar transacción como fallida
          console.log(`Payment ${paymentData.status}, marking deposit as failed...`);

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
          // Pago aún pendiente - dejar para el siguiente ciclo
          console.log(`Payment still pending (${paymentData.status}), will retry later`);
          results.push({
            transaction_id: deposit.id,
            payment_id: paymentId,
            status: 'still_pending',
            message: `Payment status: ${paymentData.status}`,
          });
        }
      } catch (apiError) {
        console.error(`MercadoPago API error for payment ${paymentId}:`, apiError);

        // Si API devolvió HTML (error 500), guardar para debugging
        if (apiError instanceof Error && apiError.message?.includes('Unexpected token')) {
          await supabase
            .from('wallet_transactions')
            .update({
              provider_metadata: {
                ...metadata,
                last_retry_error: {
                  timestamp: new Date().toISOString(),
                  error: 'MercadoPago API returned HTML',
                  payment_id: paymentId,
                },
              },
            })
            .eq('id', deposit.id);
        }

        results.push({
          transaction_id: deposit.id,
          payment_id: paymentId,
          status: 'api_error',
          message: apiError instanceof Error ? apiError.message : 'Unknown API error',
        });
      }
    }

    // Resumen de resultados
    const summary = {
      total_processed: results.length,
      confirmed: results.filter((r) => r.status === 'confirmed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      still_pending: results.filter((r) => r.status === 'still_pending').length,
      no_payment_id: results.filter((r) => r.status === 'no_payment_id').length,
      api_errors: results.filter((r) => r.status === 'api_error').length,
    };

    console.log('=== Retry Job Summary ===');
    console.log(JSON.stringify(summary, null, 2));

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
    console.error('Error in retry job:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
