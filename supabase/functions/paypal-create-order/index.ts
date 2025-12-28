/**
 * PayPal Create Order Edge Function
 * Creates a PayPal order for booking payments with optional marketplace split
 *
 * Endpoints:
 * - POST /paypal-create-order
 *
 * Request Body:
 * {
 *   "booking_id": "uuid",
 *   "use_split_payment": boolean (optional, default: false)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "order_id": "PayPal order ID",
 *   "approval_url": "URL for user to approve payment",
 *   "status": "CREATED"
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';
import {
  PayPalConfig,
  getPayPalAccessToken,
  createPayPalOrder,
  getApprovalUrl,
  centsToPayPalAmount,
  PayPalOrderRequest,
  PayPalAPIError,
} from '../_shared/paypal-api.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // RATE LIMITING (fail-closed for security)
    // ========================================================================
    try {
      await enforceRateLimit(req, {
        endpoint: 'paypal-create-order',
        windowSeconds: 60,
        maxRequests: 30,
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

    // ========================================================================
    // 1. AUTHENTICATION & VALIDATION
    // ========================================================================

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { booking_id, use_split_payment = false } = await req.json();

    if (!booking_id) {
      throw new Error('booking_id is required');
    }

    console.log(`Creating PayPal order for booking ${booking_id}, user ${user.id}, split: ${use_split_payment}`);

    // ========================================================================
    // 2. GET PAYPAL CONFIGURATION
    // ========================================================================

    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalSecret = Deno.env.get('PAYPAL_SECRET');
    const paypalEnv = (Deno.env.get('PAYPAL_ENV') || 'sandbox') as 'sandbox' | 'live';
    const paypalBnCode = Deno.env.get('PAYPAL_PARTNER_ATTRIBUTION_ID');

    if (!paypalClientId || !paypalSecret) {
      throw new Error('PayPal credentials not configured');
    }

    const paypalConfig: PayPalConfig = {
      clientId: paypalClientId,
      clientSecret: paypalSecret,
      environment: paypalEnv,
      partnerAttributionId: paypalBnCode,
    };

    // ========================================================================
    // 3. PREPARE BOOKING PAYMENT DATA
    // ========================================================================

    // Call RPC function to get all necessary payment data
    const { data: paymentData, error: rpcError } = await supabase.rpc(
      'prepare_booking_payment',
      {
        p_booking_id: booking_id,
        p_provider: 'paypal',
        p_use_split_payment: use_split_payment,
      }
    );

    if (rpcError || !paymentData) {
      console.error('prepare_booking_payment RPC error:', rpcError);
      throw new Error(`Failed to prepare payment: ${rpcError?.message || 'Unknown error'}`);
    }

    if (!paymentData.success) {
      throw new Error(paymentData.error || 'Failed to prepare payment data');
    }

    const { booking, payment, owner, renter, metadata } = paymentData;

    console.log('Payment data prepared:', {
      booking_id: booking.id,
      total_cents: payment.total_amount_cents,
      split_enabled: payment.split_enabled,
      currency: payment.currency,
    });

    // Validate that renter is the authenticated user
    if (booking.renter_id !== user.id) {
      throw new Error('Unauthorized: You are not the renter of this booking');
    }

    // ========================================================================
    // 4. CONVERT CURRENCY (ARS → USD)
    // ========================================================================

    let amountUSD: number;
    let currencyCode: string;

    if (booking.currency === 'USD') {
      amountUSD = payment.total_amount_decimal;
      currencyCode = 'USD';
    } else if (booking.currency === 'ARS') {
      // Get exchange rate from exchange_rates table
      const { data: fxData, error: fxError } = await supabase
        .from('exchange_rates')
        .select('platform_rate')
        .eq('pair', 'USDTARS')
        .eq('is_active', true)
        .single();

      if (fxError || !fxData) {
        console.error('Failed to get FX rate:', fxError);
        // Fallback rate
        amountUSD = payment.total_amount_decimal / 1015.0;
      } else {
        amountUSD = payment.total_amount_decimal / fxData.platform_rate;
      }

      currencyCode = 'USD';
      console.log(`Converted ${payment.total_amount_decimal} ARS to ${amountUSD.toFixed(2)} USD`);
    } else {
      throw new Error(`Unsupported currency: ${booking.currency}`);
    }

    const totalAmountUSD = amountUSD.toFixed(2);

    // ========================================================================
    // 5. GET PAYPAL ACCESS TOKEN
    // ========================================================================

    const accessToken = await getPayPalAccessToken(paypalConfig);

    // ========================================================================
    // 6. BUILD PAYPAL ORDER REQUEST
    // ========================================================================

    const returnUrl = Deno.env.get('PAYPAL_RETURN_URL') || `${supabaseUrl}/checkout/success`;
    const cancelUrl = Deno.env.get('PAYPAL_CANCEL_URL') || `${supabaseUrl}/checkout/cancel`;

    const orderRequest: PayPalOrderRequest = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: booking.id,
          custom_id: metadata.external_reference,
          description: `AutoRenta car rental - ${booking.start_date} to ${booking.end_date}`,
          soft_descriptor: 'AutoRenta',
          amount: {
            currency_code: currencyCode,
            value: totalAmountUSD,
          },
          items: [
            {
              name: 'Car Rental',
              description: `${booking.start_date} to ${booking.end_date}`,
              unit_amount: {
                currency_code: currencyCode,
                value: totalAmountUSD,
              },
              quantity: '1',
              category: 'PHYSICAL_GOODS',
            },
          ],
        },
      ],
      application_context: {
        brand_name: 'AutoRenta',
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: 'PAY_NOW',
      },
    };

    // Add split payment configuration if enabled
    if (payment.split_enabled && payment.provider_payee_identifier) {
      const platformFeeUSD = (payment.platform_fee_cents / 100) * (amountUSD / payment.total_amount_decimal);
      const ownerAmountUSD = amountUSD - platformFeeUSD;

      console.log('Adding split payment:', {
        platform_fee_usd: platformFeeUSD.toFixed(2),
        owner_amount_usd: ownerAmountUSD.toFixed(2),
        payee_merchant_id: payment.provider_payee_identifier,
      });

      // Get disbursement mode from config
      const { data: configData } = await supabase.rpc('get_platform_config', {
        p_key: 'paypal_disbursement_mode',
        p_default_text: 'INSTANT',
      });

      const disbursementMode = (configData?.[0]?.value_text || 'INSTANT') as 'INSTANT' | 'DELAYED';

      orderRequest.purchase_units[0].payment_instruction = {
        platform_fees: [
          {
            amount: {
              currency_code: currencyCode,
              value: platformFeeUSD.toFixed(2),
            },
          },
        ],
        disbursement_mode: disbursementMode,
      };

      orderRequest.purchase_units[0].payee = {
        merchant_id: payment.provider_payee_identifier,
      };
    }

    // ========================================================================
    // 7. CREATE PAYPAL ORDER
    // ========================================================================

    const idempotencyKey = `booking_${booking.id}_${Date.now()}`;
    const order = await createPayPalOrder(paypalConfig, accessToken, orderRequest, idempotencyKey);

    console.log('PayPal order created:', {
      order_id: order.id,
      status: order.status,
    });

    // ========================================================================
    // 8. UPDATE BOOKING WITH PAYPAL ORDER INFO
    // ========================================================================

    const approvalUrl = getApprovalUrl(order);

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_provider: 'paypal',
        payment_preference_id: order.id,
        payment_init_point: approvalUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (updateError) {
      console.error('Failed to update booking with PayPal order:', updateError);
      // Don't throw - order was already created
    }

    // ========================================================================
    // 9. CREATE PAYMENT INTENT RECORD
    // ========================================================================

    const { error: intentError } = await supabase
      .from('payment_intents')
      .insert({
        user_id: user.id,
        booking_id: booking.id,
        intent_type: 'charge',
        provider: 'paypal',
        paypal_order_id: order.id,
        provider_payment_id: order.id,
        provider_status: order.status,
        amount_usd: parseFloat(totalAmountUSD),
        amount_ars: payment.currency === 'ARS' ? payment.total_amount_decimal : null,
        status: 'pending',
        metadata: {
          split_enabled: payment.split_enabled,
          split_requested: use_split_payment,
          platform_fee_cents: payment.platform_fee_cents,
          owner_amount_cents: payment.owner_amount_cents,
          original_currency: booking.currency,
        },
      });

    if (intentError) {
      console.error('Failed to create payment intent:', intentError);
      // Don't throw - order was already created
    }

    // ========================================================================
    // 10. RETURN SUCCESS RESPONSE
    // ========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        approval_url: approvalUrl,
        status: order.status,
        amount_usd: totalAmountUSD,
        currency: currencyCode,
        split_enabled: payment.split_enabled,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creating PayPal order:', error);

    const statusCode = error instanceof PayPalAPIError ? error.statusCode : 500;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof PayPalAPIError ? error.details : undefined,
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
