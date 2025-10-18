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
// Importar SDK de MercadoPago desde npm vía esm.sh
import MercadoPagoConfig from 'https://esm.sh/mercadopago@2';
import { Payment } from 'https://esm.sh/mercadopago@2';

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

    // Obtener payload del webhook
    const webhookPayload: MPWebhookPayload = await req.json();

    console.log('MercadoPago Webhook received:', JSON.stringify(webhookPayload, null, 2));

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
    // MIGRACIÓN AL SDK OFICIAL DE MERCADOPAGO
    // ========================================

    // Inicializar cliente de MercadoPago con el SDK oficial
    const client = new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
      options: {
        timeout: 5000,
      },
    });

    // Crear instancia de Payment
    const paymentClient = new Payment(client);

    // Obtener detalles del pago usando el SDK
    const paymentId = webhookPayload.data.id;
    console.log(`Fetching payment ${paymentId} using MercadoPago SDK...`);

    const paymentData = await paymentClient.get({ id: paymentId });

    console.log('Payment Data from SDK:', JSON.stringify(paymentData, null, 2));

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

    // Obtener transaction_id del external_reference
    const transaction_id = paymentData.external_reference;

    if (!transaction_id) {
      console.error('Missing external_reference in payment data');
      throw new Error('Missing external_reference');
    }

    // Crear cliente de Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verificar que la transacción existe y está pendiente
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('type', 'deposit')
      .single();

    if (txError || !transaction) {
      console.error('Transaction not found:', transaction_id);
      throw new Error('Transaction not found');
    }

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

    // Confirmar depósito llamando a la función de base de datos
    const { data: confirmResult, error: confirmError } = await supabase.rpc(
      'wallet_confirm_deposit',
      {
        p_transaction_id: transaction_id,
        p_provider_transaction_id: paymentData.id?.toString() || '',
        p_provider_metadata: {
          status: paymentData.status,
          status_detail: paymentData.status_detail,
          payment_method_id: paymentData.payment_method_id,
          payment_type_id: paymentData.payment_type_id,
          transaction_amount: paymentData.transaction_amount,
          currency_id: paymentData.currency_id,
          date_approved: paymentData.date_approved,
          payer_email: paymentData.payer?.email,
        },
      }
    );

    if (confirmError) {
      console.error('Error confirming deposit:', confirmError);
      throw confirmError;
    }

    console.log('Deposit confirmed successfully:', confirmResult);

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
