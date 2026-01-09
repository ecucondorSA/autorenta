/**
 * Supabase Edge Function: mercadopago-process-brick-payment
 *
 * Procesa pagos directos desde el Payment Brick de MercadoPago.
 * A diferencia de checkout-pro (redirect), este procesa el pago in-site.
 *
 * Flujo:
 * 1. Frontend muestra Payment Brick
 * 2. Usuario completa el formulario de pago
 * 3. Payment Brick llama onSubmit con formData (token, payment_method, etc.)
 * 4. Frontend llama a esta Edge Function
 * 5. Edge Function crea el pago directo en MercadoPago usando /v1/payments
 * 6. Retorna resultado al frontend inmediatamente
 * 7. Webhook de MP también confirmará (redundancia para fiabilidad)
 *
 * Environment Variables Required:
 * - MERCADOPAGO_ACCESS_TOKEN: Access token de Mercado Pago (APP_USR-*)
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getMercadoPagoAccessToken } from '../_shared/mercadopago-token.ts';
import { enforceRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

const MP_API_BASE = 'https://api.mercadopago.com/v1';

/**
 * Payment Brick form data structure
 */
interface BrickFormData {
  token?: string; // Card token (for card payments)
  issuer_id?: string;
  payment_method_id: string;
  transaction_amount: number;
  installments?: number;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
}

/**
 * Request body from frontend
 */
interface ProcessPaymentRequest {
  formData: BrickFormData;
  depositId?: string; // Optional: link to existing deposit transaction
  description?: string;
}

/**
 * Response structure
 */
interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  status?: 'approved' | 'pending' | 'rejected' | 'in_process' | 'cancelled';
  statusDetail?: string;
  message?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========================================
    // RATE LIMITING (fail-closed for security)
    // ========================================
    try {
      await enforceRateLimit(req, {
        endpoint: 'mercadopago-process-brick-payment',
        windowSeconds: 60,
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return error.toResponse();
      }
      // SECURITY: Fail-closed - if rate limiter fails, reject request
      console.error('[RateLimit] Service unavailable:', error);
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable', code: 'RATE_LIMITER_UNAVAILABLE' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // VALIDATE METHOD
    // ========================================
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
    // ENVIRONMENT VARIABLES
    // ========================================
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // ========================================
    // AUTHENTICATION
    // ========================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // PARSE REQUEST BODY
    // ========================================
    const body: ProcessPaymentRequest = await req.json();
    const { formData, depositId, description } = body;

    if (!formData || !formData.payment_method_id || !formData.transaction_amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required payment data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // VALIDATE AMOUNT
    // ========================================
    if (formData.transaction_amount < 1000 || formData.transaction_amount > 1000000) {
      return new Response(
        JSON.stringify({
          error: `El monto debe estar entre $1,000 y $1,000,000 ARS`,
          code: 'INVALID_AMOUNT',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // GET/CREATE DEPOSIT TRANSACTION
    // ========================================
    let transactionId = depositId;

    if (!transactionId) {
      // Create a new deposit transaction
      const { data: depositResult, error: depositError } = await supabase.rpc(
        'wallet_initiate_deposit',
        {
          p_amount: Math.round((formData.transaction_amount / 1300) * 100), // Convert ARS to USD cents (approximate)
        }
      );

      if (depositError) {
        console.error('Error creating deposit transaction:', depositError);
        throw new Error('No se pudo crear la transacción de depósito');
      }

      transactionId = depositResult;
    } else {
      // Validate existing transaction belongs to user
      const { data: transaction, error: txError } = await supabase
        .from('wallet_transactions')
        .select('user_id, status')
        .eq('id', depositId)
        .single();

      if (txError || !transaction) {
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (transaction.user_id !== user.id) {
        console.error('SECURITY: User attempting to use transaction from another user');
        return new Response(
          JSON.stringify({ error: 'Unauthorized transaction' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (transaction.status !== 'pending') {
        return new Response(
          JSON.stringify({ error: 'Transaction already processed' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // ========================================
    // GET USER PROFILE FOR PAYER DATA
    // ========================================
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, gov_id_number, gov_id_type')
      .eq('id', user.id)
      .single();

    // ========================================
    // CREATE PAYMENT IN MERCADOPAGO (usando fetch directo)
    // ========================================
    console.log('Creating payment in MercadoPago...');
    console.log('Payment method:', formData.payment_method_id);
    console.log('Amount:', formData.transaction_amount);

    const MP_ACCESS_TOKEN = getMercadoPagoAccessToken('mercadopago-process-brick-payment', true);

    // Build payment request
    const paymentRequest: any = {
      transaction_amount: formData.transaction_amount,
      payment_method_id: formData.payment_method_id,
      description: description || 'Depósito a Wallet - AutoRenta',
      payer: {
        email: formData.payer.email,
        ...(formData.payer.identification && {
          identification: formData.payer.identification,
        }),
      },
      external_reference: transactionId,
      metadata: {
        transaction_id: transactionId,
        user_id: user.id,
        source: 'payment_brick',
      },
      // Add statement descriptor for bank statements
      statement_descriptor: 'AUTORENTA',
    };

    // Add card-specific fields if using card payment
    if (formData.token) {
      paymentRequest.token = formData.token;
      paymentRequest.installments = formData.installments || 1;
      if (formData.issuer_id) {
        paymentRequest.issuer_id = formData.issuer_id;
      }
    }

    // Add payer name from profile
    if (profile?.full_name) {
      const nameParts = profile.full_name.trim().split(' ');
      paymentRequest.payer.first_name = nameParts[0] || 'Usuario';
      paymentRequest.payer.last_name = nameParts.slice(1).join(' ') || 'AutoRenta';
    }

    // Add identification from profile if not provided
    if (!paymentRequest.payer.identification && profile?.gov_id_number) {
      paymentRequest.payer.identification = {
        type: profile.gov_id_type || 'DNI',
        number: profile.gov_id_number.replace(/[^0-9]/g, ''),
      };
    }

    console.log('Payment request:', JSON.stringify(paymentRequest, null, 2));

    // Create the payment using direct fetch (evita SDK incompatible con Deno)
    const idempotencyKey = `brick-payment-${transactionId}-${crypto.randomUUID()}`;
    const mpResponse = await fetch(`${MP_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentRequest),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json().catch(() => ({}));
      console.error('MercadoPago API error:', errorData);
      throw new Error(errorData.message || `MercadoPago API error: ${mpResponse.status}`);
    }

    const payment = await mpResponse.json();
    console.log('Payment created:', payment.id, payment.status);

    // ========================================
    // UPDATE TRANSACTION BASED ON RESULT
    // ========================================
    const paymentStatus = payment.status as string;
    const paymentStatusDetail = payment.status_detail as string;

    // Update transaction with payment info
    await supabase
      .from('wallet_transactions')
      .update({
        provider_transaction_id: String(payment.id),
        provider_metadata: {
          payment_id: payment.id,
          status: paymentStatus,
          status_detail: paymentStatusDetail,
          payment_method_id: formData.payment_method_id,
          installments: formData.installments,
          source: 'payment_brick',
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    // If approved, confirm the deposit
    if (paymentStatus === 'approved') {
      console.log('Payment approved, confirming deposit...');

      const { error: confirmError } = await supabase.rpc(
        'wallet_confirm_deposit_admin',
        {
          p_user_id: user.id,
          p_transaction_id: transactionId,
          p_provider_transaction_id: String(payment.id),
          p_provider_metadata: {
            payment_id: payment.id,
            status: paymentStatus,
            status_detail: paymentStatusDetail,
            payment_method_id: formData.payment_method_id,
          },
        }
      );

      if (confirmError) {
        console.error('Error confirming deposit:', confirmError);
        // Payment was approved but deposit confirmation failed
        // The webhook will retry, so we return success but log the error
      }
    }

    // ========================================
    // BUILD RESPONSE
    // ========================================
    const response: PaymentResponse = {
      success: paymentStatus === 'approved',
      paymentId: String(payment.id),
      status: paymentStatus as PaymentResponse['status'],
      statusDetail: paymentStatusDetail,
      message: getStatusMessage(paymentStatus, paymentStatusDetail),
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error processing payment:', error);

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return new Response(
      JSON.stringify({
        success: false,
        message: `Error al procesar el pago: ${errorMessage}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Get user-friendly status message
 */
function getStatusMessage(status: string, statusDetail: string): string {
  const messages: Record<string, string> = {
    approved: '¡Pago aprobado! Los fondos se acreditaron a tu wallet.',
    pending: 'El pago está pendiente de confirmación.',
    in_process: 'El pago está siendo procesado.',
    rejected: getRejectMessage(statusDetail),
    cancelled: 'El pago fue cancelado.',
  };

  return messages[status] || 'Estado de pago desconocido.';
}

/**
 * Get rejection reason message
 */
function getRejectMessage(statusDetail: string): string {
  const rejectMessages: Record<string, string> = {
    cc_rejected_insufficient_amount: 'Fondos insuficientes en la tarjeta.',
    cc_rejected_bad_filled_card_number: 'Número de tarjeta incorrecto.',
    cc_rejected_bad_filled_date: 'Fecha de vencimiento incorrecta.',
    cc_rejected_bad_filled_security_code: 'Código de seguridad incorrecto.',
    cc_rejected_bad_filled_other: 'Datos de tarjeta incorrectos.',
    cc_rejected_blacklist: 'La tarjeta fue rechazada por seguridad.',
    cc_rejected_call_for_authorize: 'Debes autorizar el pago con tu banco.',
    cc_rejected_card_disabled: 'La tarjeta está deshabilitada.',
    cc_rejected_duplicated_payment: 'Ya realizaste este pago.',
    cc_rejected_high_risk: 'Pago rechazado por seguridad.',
    cc_rejected_max_attempts: 'Demasiados intentos fallidos.',
    cc_rejected_other_reason: 'La tarjeta fue rechazada.',
  };

  return rejectMessages[statusDetail] || 'El pago fue rechazado. Intenta con otro medio de pago.';
}
