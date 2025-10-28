/**
 * Supabase Edge Function: mercadopago-poll-pending-payments
 *
 * POLLING ACTIVO de pagos pendientes usando MercadoPago API Search
 * Esta función NO depende de webhooks - consulta activamente la API
 *
 * Flujo:
 * 1. Busca transacciones pendientes (>2 minutos antiguas)
 * 2. Para cada una, busca en MercadoPago API por external_reference
 * 3. Si encuentra el pago aprobado, confirma el depósito
 * 4. Si el pago no existe o está rechazado, marca como fallido
 *
 * Environment Variables Required:
 * - MERCADOPAGO_ACCESS_TOKEN: Access token de Mercado Pago
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PollResult {
  transaction_id: string;
  status: 'confirmed' | 'failed' | 'still_pending' | 'not_found';
  payment_id?: string;
  message: string;
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== MercadoPago Poll Pending Payments Started ===');

    // Configuración
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const rawToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !rawToken) {
      throw new Error('Missing required environment variables');
    }

    const MP_ACCESS_TOKEN = rawToken.trim().replace(/[\r\n\t\s]/g, '');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Buscar depósitos pendientes (>2 minutos)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: pendingDeposits, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, provider_metadata, created_at')
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .lt('created_at', twoMinutesAgo)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching pending deposits:', fetchError);
      throw fetchError;
    }

    if (!pendingDeposits || pendingDeposits.length === 0) {
      console.log('No pending deposits found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending deposits to poll',
          processed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingDeposits.length} pending deposits to poll`);

    const results: PollResult[] = [];

    for (const deposit of pendingDeposits) {
      console.log(`Polling payment for transaction ${deposit.id}...`);

      try {
        // Buscar pago por external_reference usando MercadoPago Search API
        const searchUrl = new URL('https://api.mercadopago.com/v1/payments/search');
        searchUrl.searchParams.append('external_reference', deposit.id);
        searchUrl.searchParams.append('sort', 'date_created');
        searchUrl.searchParams.append('criteria', 'desc');

        const searchResponse = await fetch(searchUrl.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!searchResponse.ok) {
          console.error(`MercadoPago API error: ${searchResponse.status} ${searchResponse.statusText}`);
          results.push({
            transaction_id: deposit.id,
            status: 'not_found',
            message: `API error: ${searchResponse.status}`,
          });
          continue;
        }

        const searchData = await searchResponse.json();

        if (!searchData.results || searchData.results.length === 0) {
          console.log(`No payment found for transaction ${deposit.id}`);
          results.push({
            transaction_id: deposit.id,
            status: 'still_pending',
            message: 'Payment not created yet',
          });
          continue;
        }

        // Tomar el pago más reciente
        const payment = searchData.results[0];
        console.log(`Found payment ${payment.id} with status: ${payment.status}`);

        if (payment.status === 'approved') {
          // Confirmar depósito
          console.log(`Payment approved, confirming deposit ${deposit.id}...`);

          const { error: confirmError } = await supabase.rpc(
            'wallet_confirm_deposit_admin',
            {
              p_user_id: deposit.user_id,
              p_transaction_id: deposit.id,
              p_provider_transaction_id: payment.id.toString(),
              p_provider_metadata: {
                id: payment.id,
                status: payment.status,
                status_detail: payment.status_detail,
                payment_type_id: payment.payment_type_id,
                payment_method_id: payment.payment_method_id,
                transaction_amount: payment.transaction_amount,
                date_approved: payment.date_approved,
                date_created: payment.date_created,
                payer_email: payment.payer?.email,
                polled_at: new Date().toISOString(),
              },
            }
          );

          if (confirmError) {
            console.error(`Error confirming deposit ${deposit.id}:`, confirmError);
            results.push({
              transaction_id: deposit.id,
              payment_id: payment.id.toString(),
              status: 'failed',
              message: `Confirmation failed: ${confirmError.message}`,
            });
          } else {
            console.log(`Deposit ${deposit.id} confirmed successfully`);
            results.push({
              transaction_id: deposit.id,
              payment_id: payment.id.toString(),
              status: 'confirmed',
              message: `Deposit confirmed: $${deposit.amount}`,
            });
          }
        } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(payment.status)) {
          // Marcar como fallido
          console.log(`Payment ${payment.status}, marking as failed...`);

          await supabase
            .from('wallet_transactions')
            .update({
              status: 'failed',
              provider_transaction_id: payment.id.toString(),
              provider_metadata: {
                ...deposit.provider_metadata,
                status: payment.status,
                status_detail: payment.status_detail,
                failed_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', deposit.id);

          results.push({
            transaction_id: deposit.id,
            payment_id: payment.id.toString(),
            status: 'failed',
            message: `Payment ${payment.status}: ${payment.status_detail}`,
          });
        } else {
          // Aún pendiente
          console.log(`Payment still ${payment.status}`);
          results.push({
            transaction_id: deposit.id,
            payment_id: payment.id.toString(),
            status: 'still_pending',
            message: `Payment status: ${payment.status}`,
          });
        }
      } catch (error) {
        console.error(`Error polling payment for ${deposit.id}:`, error);
        results.push({
          transaction_id: deposit.id,
          status: 'not_found',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Resumen
    const summary = {
      total_processed: results.length,
      confirmed: results.filter((r) => r.status === 'confirmed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      still_pending: results.filter((r) => r.status === 'still_pending').length,
      not_found: results.filter((r) => r.status === 'not_found').length,
    };

    console.log('=== Poll Summary ===');
    console.log(JSON.stringify(summary, null, 2));

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in poll job:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
