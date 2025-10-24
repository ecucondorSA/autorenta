/**
 * Supabase Edge Function: mercadopago-webhook
 *
 * Maneja las notificaciones IPN (Instant Payment Notification) de Mercado Pago.
 * MIGRADO A SDK OFICIAL DE MERCADOPAGO
 *
 * Flujo del Webhook:
 * 1. Mercado Pago envía notificación POST cuando cambia estado del pago
 * 2. Esta función valida y procesa la notificación
 * 3. Consulta API de MP usando SDK oficial para obtener detalles del pago
 * 4. Actualiza la transacción en DB con wallet_confirm_deposit()
 * 5. Acredita fondos al wallet del usuario
 *
 * Tipos de Notificación MP:
 * - payment: Pago creado/actualizado
 * - plan: Plan de suscripción
 * - subscription: Suscripción
 * - invoice: Factura
 * - point_integration_wh: Integración de puntos
 *
 * Estados de Pago MP:
 * - approved: Aprobado (acreditar fondos)
 * - pending: Pendiente
 * - in_process: En proceso
 * - rejected: Rechazado
 * - cancelled: Cancelado
 * - refunded: Reembolsado
 * - charged_back: Contracargo
 *
 * Environment Variables Required:
 * - MERCADOPAGO_ACCESS_TOKEN: Access token de Mercado Pago
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos de Mercado Pago
interface MPWebhookPayload {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  user_id: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar variables de entorno
    let MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || 'APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571';

    // Limpiar token
    MP_ACCESS_TOKEN = MP_ACCESS_TOKEN.trim().replace(/[\r\n\t\s]/g, '');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // VALIDACIÓN DE FIRMA HMAC (CRÍTICA)
    // Verificar que el webhook proviene realmente de MercadoPago
    // ========================================

    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    // Obtener query params para validación
    const url = new URL(req.url);
    const dataId = url.searchParams.get('data.id');
    const webhookType = url.searchParams.get('type');

    // Leer body raw (necesario para HMAC)
    const rawBody = await req.text();
    let webhookPayload: MPWebhookPayload;

    try {
      webhookPayload = JSON.parse(rawBody);
    } catch (e) {
      console.error('Invalid JSON in webhook payload:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('MercadoPago Webhook received:', JSON.stringify(webhookPayload, null, 2));

    // ========================================
    // VALIDAR FIRMA HMAC (si está presente)
    // ========================================
    if (xSignature && xRequestId) {
      // Extraer ts y v1 de x-signature
      // Formato: "ts=1704900000,v1=abc123def456..."
      const signatureParts: Record<string, string> = {};

      xSignature.split(',').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          signatureParts[key.trim()] = value.trim();
        }
      });

      const ts = signatureParts['ts'];
      const hash = signatureParts['v1'];

      if (ts && hash) {
        // Construir mensaje para HMAC
        // Formato: data.id + x-request-id + ts
        const paymentId = webhookPayload.data?.id || dataId || '';
        const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;

        console.log('HMAC validation:', {
          manifest,
          ts,
          hash_received: hash.substring(0, 20) + '...',
        });

        // Calcular HMAC-SHA256
        const encoder = new TextEncoder();
        const keyData = encoder.encode(MP_ACCESS_TOKEN);

        try {
          const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );

          const signature = await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            encoder.encode(manifest)
          );

          // Convertir a hex
          const hashArray = Array.from(new Uint8Array(signature));
          const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          console.log('HMAC calculated:', calculatedHash.substring(0, 20) + '...');

          // Comparar hashes
          if (calculatedHash !== hash) {
            console.error('HMAC validation FAILED', {
              expected: hash.substring(0, 20) + '...',
              calculated: calculatedHash.substring(0, 20) + '...',
            });

            // ✅ ACTIVADO EN PRODUCCIÓN - Rechazar webhook con firma inválida
            return new Response(
              JSON.stringify({
                error: 'Invalid webhook signature',
                code: 'INVALID_HMAC',
              }),
              {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          } else {
            console.log('✅ HMAC validation passed');
          }
        } catch (cryptoError) {
          console.error('Error calculating HMAC:', cryptoError);
          // No fallar por errores de crypto, solo loggear
        }
      } else {
        console.warn('x-signature present but missing ts or v1 parts');
      }
    } else {
      console.warn('⚠️ No x-signature header - webhook signature not validated');
      // En producción deberíamos rechazar, por ahora solo loggeamos
    }

    // Solo procesar notificaciones de tipo 'payment'
    if (webhookPayload.type !== 'payment') {
      console.log(`Ignoring webhook type: ${webhookPayload.type}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook type ignored' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // LLAMADA DIRECTA A MERCADOPAGO REST API
    // FIX: SDK tiene bug con Deno (f.headers.raw is not a function)
    // ========================================

    const paymentId = webhookPayload.data.id;
    console.log(`Fetching payment ${paymentId} using MercadoPago REST API...`);

    // Llamar directamente a la REST API (sin SDK)
    let paymentData;
    try {
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        console.error('MercadoPago API Error:', {
          status: mpResponse.status,
          statusText: mpResponse.statusText,
          body: errorText,
        });

        // Si MP API está caída (500, 502, 503)
        if (mpResponse.status >= 500) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'MercadoPago API temporarily unavailable',
              retry_after: 300,
              payment_id: paymentId,
            }),
            {
              status: 503,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Retry-After': '300',
              },
            }
          );
        }

        // Payment not found o unauthorized
        throw new Error(`MercadoPago API error: ${mpResponse.status} ${errorText}`);
      }

      paymentData = await mpResponse.json();

      // Validar que la respuesta contiene datos válidos
      if (!paymentData || !paymentData.id) {
        console.error('Invalid payment data received from MercadoPago API:', paymentData);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid payment data from MercadoPago API',
            payment_id: paymentId,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Payment Data from REST API:', JSON.stringify(paymentData, null, 2));

    } catch (apiError) {
      console.error('MercadoPago API error:', apiError);

      // Retornar 200 OK para evitar reintentos infinitos
      // El polling backup confirmará el pago de todas formas
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Error fetching payment, will be processed by polling',
          payment_id: paymentId,
          error_details: apiError instanceof Error ? apiError.message : 'Unknown error',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // MANEJAR PREAUTORIZACIONES (AUTHORIZED STATUS)
    // ========================================

    // Check if this is a preauthorization (status: authorized)
    if (paymentData.status === 'authorized') {
      console.log('Processing preauthorization (hold) webhook...');

      // Find payment intent by mp_payment_id
      const { data: intent, error: intentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('mp_payment_id', paymentId)
        .single();

      if (intentError || !intent) {
        console.log('No payment intent found for authorized payment:', paymentId);
        // This might be a regular authorized payment, not a preauth
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Preauth webhook received but no intent found',
            status: paymentData.status,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Update payment intent with authorized status
      const { error: updateError } = await supabase.rpc('update_payment_intent_status', {
        p_mp_payment_id: paymentId,
        p_mp_status: paymentData.status,
        p_mp_status_detail: paymentData.status_detail,
        p_payment_method_id: paymentData.payment_method_id,
        p_card_last4: paymentData.card?.last_four_digits,
        p_metadata: {
          webhook_received_at: new Date().toISOString(),
          mp_payment_data: paymentData,
        },
      });

      if (updateError) {
        console.error('Error updating preauth intent:', updateError);
      } else {
        console.log('✅ Preauthorization updated successfully');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Preauthorization webhook processed',
          intent_id: intent.id,
          status: 'authorized',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // MANEJAR CAPTURAS DE PREAUTH (APPROVED AFTER AUTHORIZED)
    // ========================================

    // Check if this is a captured preauth (status changed from authorized to approved)
    const { data: capturedIntent, error: capturedIntentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('mp_payment_id', paymentId)
      .eq('status', 'authorized')
      .single();

    if (!capturedIntentError && capturedIntent && paymentData.status === 'approved') {
      console.log('Processing preauth capture webhook...');

      // Update payment intent to captured
      const { error: updateError } = await supabase.rpc('update_payment_intent_status', {
        p_mp_payment_id: paymentId,
        p_mp_status: 'approved',
        p_mp_status_detail: paymentData.status_detail,
        p_metadata: {
          captured_via_webhook: true,
          webhook_received_at: new Date().toISOString(),
          mp_payment_data: paymentData,
        },
      });

      if (updateError) {
        console.error('Error updating captured preauth:', updateError);
      }

      // Call capture_preauth RPC to handle ledger entries
      if (capturedIntent.booking_id) {
        const { error: captureError } = await supabase.rpc('capture_preauth', {
          p_intent_id: capturedIntent.id,
          p_booking_id: capturedIntent.booking_id,
        });

        if (captureError) {
          console.error('Error processing capture ledger:', captureError);
        } else {
          console.log('✅ Preauth captured and ledger updated');
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Preauth capture webhook processed',
          intent_id: capturedIntent.id,
          status: 'captured',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // MANEJAR CANCELACIONES DE PREAUTH
    // ========================================

    if (paymentData.status === 'cancelled') {
      console.log('Processing preauth cancellation webhook...');

      // Find payment intent by mp_payment_id
      const { data: cancelledIntent, error: cancelledIntentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('mp_payment_id', paymentId)
        .single();

      if (!cancelledIntentError && cancelledIntent) {
        // Update payment intent to cancelled
        const { error: updateError } = await supabase.rpc('update_payment_intent_status', {
          p_mp_payment_id: paymentId,
          p_mp_status: 'cancelled',
          p_mp_status_detail: paymentData.status_detail,
          p_metadata: {
            cancelled_via_webhook: true,
            webhook_received_at: new Date().toISOString(),
            mp_payment_data: paymentData,
          },
        });

        if (updateError) {
          console.error('Error updating cancelled preauth:', updateError);
        }

        // Call cancel_preauth RPC to release any locked funds
        const { error: cancelError } = await supabase.rpc('cancel_preauth', {
          p_intent_id: cancelledIntent.id,
        });

        if (cancelError) {
          console.error('Error processing cancellation:', cancelError);
        } else {
          console.log('✅ Preauth cancelled successfully');
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Preauth cancellation webhook processed',
            intent_id: cancelledIntent.id,
            status: 'cancelled',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // ========================================
    // MANEJAR PAGOS REGULARES (NO PREAUTH)
    // ========================================

    // Verificar que el pago esté aprobado
    if (paymentData.status !== 'approved') {
      console.log(`Payment not approved. Status: ${paymentData.status}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment not approved yet',
          status: paymentData.status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener reference del external_reference (puede ser booking_id o transaction_id)
    const reference_id = paymentData.external_reference;

    if (!reference_id) {
      console.error('Missing external_reference in payment data');
      throw new Error('Missing external_reference');
    }

    // Crear cliente de Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ========================================
    // DETERMINAR TIPO DE PAGO: BOOKING O WALLET DEPOSIT
    // ========================================

    // Primero verificar si es un booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', reference_id)
      .single();

    // Si es un booking, procesar pago de booking
    if (booking && !bookingError) {
      console.log('Processing booking payment:', reference_id);

      // Verificar que el booking esté pendiente de pago
      if (booking.status !== 'pending') {
        console.log(`Booking is not pending (status: ${booking.status}), ignoring webhook`);
        return new Response(
          JSON.stringify({ success: true, message: 'Booking already processed' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Actualizar booking a confirmado
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          paid_at: new Date().toISOString(),
          payment_method: 'credit_card',
          metadata: {
            ...(booking.metadata || {}),
            mercadopago_payment_id: paymentData.id,
            mercadopago_status: paymentData.status,
            mercadopago_payment_method: paymentData.payment_method_id,
            mercadopago_amount: paymentData.transaction_amount,
            mercadopago_currency: paymentData.currency_id,
            mercadopago_approved_at: paymentData.date_approved,
          },
        })
        .eq('id', reference_id);

      if (updateError) {
        console.error('Error updating booking:', updateError);
        throw updateError;
      }

      console.log('✅ Booking payment confirmed successfully:', reference_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Booking payment processed successfully',
          booking_id: reference_id,
          payment_id: paymentData.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Si no es un booking, verificar si es un wallet deposit
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', reference_id)
      .eq('type', 'deposit')
      .single();

    if (txError || !transaction) {
      console.error('Neither booking nor wallet transaction found:', reference_id);
      throw new Error('Reference not found - not a booking or wallet deposit');
    }

    console.log('Processing wallet deposit:', reference_id);

    // Si la transacción ya fue completada, ignorar (idempotencia)
    if (transaction.status === 'completed') {
      console.log('Transaction already completed, ignoring webhook');
      return new Response(
        JSON.stringify({ success: true, message: 'Transaction already completed' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // MEJORA: Usar función admin que no requiere auth
    // ========================================
    // Confirmar depósito llamando a la función de base de datos (versión admin)
    const { data: confirmResult, error: confirmError } = await supabase.rpc(
      'wallet_confirm_deposit_admin',
      {
        p_user_id: transaction.user_id,
        p_transaction_id: transaction_id,
        p_provider_transaction_id: paymentData.id?.toString() || '',
        p_provider_metadata: {
          id: paymentData.id,
          status: paymentData.status,
          status_detail: paymentData.status_detail,
          payment_method_id: paymentData.payment_method_id,
          payment_type_id: paymentData.payment_type_id,
          transaction_amount: paymentData.transaction_amount,
          net_amount: paymentData.transaction_details?.net_received_amount,
          currency_id: paymentData.currency_id,
          date_approved: paymentData.date_approved,
          date_created: paymentData.date_created,
          external_reference: paymentData.external_reference,
          payer_email: paymentData.payer?.email,
          payer_first_name: paymentData.payer?.first_name,
          payer_last_name: paymentData.payer?.last_name,
        },
      }
    );

    if (confirmError) {
      console.error('Error confirming deposit:', confirmError);
      throw confirmError;
    }

    console.log('Deposit confirmed successfully:', confirmResult);

    // ========================================
    // REGISTRAR EN WALLET LEDGER (NUEVO SISTEMA)
    // ========================================
    // Convertir a centavos (MercadoPago usa decimales, ledger usa centavos)
    const amountCents = Math.round(paymentData.transaction_amount * 100);
    const refKey = `mp-${paymentData.id}`;

    console.log(`Registering deposit in ledger: ${amountCents} cents for user ${transaction.user_id}`);

    const { data: ledgerResult, error: ledgerError } = await supabase.rpc(
      'wallet_deposit_ledger',
      {
        p_user_id: transaction.user_id,
        p_amount_cents: amountCents,
        p_ref: refKey,
        p_provider: 'mercadopago',
        p_meta: {
          transaction_id: transaction_id,
          payment_id: paymentData.id,
          payment_method: paymentData.payment_method_id,
          payment_type: paymentData.payment_type_id,
          status: paymentData.status,
          status_detail: paymentData.status_detail,
          currency: paymentData.currency_id,
          net_amount: paymentData.transaction_details?.net_received_amount,
          date_approved: paymentData.date_approved,
          payer_email: paymentData.payer?.email,
        },
      }
    );

    if (ledgerError) {
      // No fallar el webhook si el ledger falla, solo loggear
      // El sistema viejo (wallet_transactions) ya funcionó
      console.error('Warning: Error registering in ledger (old system still worked):', ledgerError);
    } else {
      console.log('✅ Deposit registered in ledger successfully:', ledgerResult);
    }

    // Retornar éxito
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        transaction_id,
        payment_id: paymentData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing MercadoPago webhook:', error);

    // Retornar 200 incluso en error para evitar reintentos de MP
    // MP reintenta si recibe 4xx/5xx
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
