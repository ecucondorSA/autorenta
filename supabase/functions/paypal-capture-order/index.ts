/**
 * PayPal Capture Order Edge Function
 * Captures a PayPal order after user approval (completes the payment)
 *
 * Endpoints:
 * - POST /paypal-capture-order
 *
 * Request Body:
 * {
 *   "order_id": "PayPal order ID"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "capture_id": "PayPal capture ID",
 *   "status": "COMPLETED",
 *   "amount": "150.00",
 *   "currency": "USD"
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import {
  PayPalConfig,
  getPayPalAccessToken,
  capturePayPalOrder,
  getPayPalOrder,
  PayPalAPIError,
} from '../_shared/paypal-api.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { order_id } = await req.json();

    if (!order_id) {
      throw new Error('order_id is required');
    }

    console.log(`Capturing PayPal order ${order_id} for user ${user.id}`);

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
    // 3. VERIFY ORDER BELONGS TO USER
    // ========================================================================

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, renter_id, payment_provider, payment_preference_id, total_amount, currency')
      .eq('payment_preference_id', order_id)
      .eq('payment_provider', 'paypal')
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found for this PayPal order');
    }

    if (booking.renter_id !== user.id) {
      throw new Error('Unauthorized: You are not the renter of this booking');
    }

    console.log('Booking found:', {
      booking_id: booking.id,
      renter_id: booking.renter_id,
    });

    // ========================================================================
    // 4. CHECK IF ALREADY CAPTURED (IDEMPOTENCY)
    // ========================================================================

    const { data: existingIntent, error: intentError } = await supabase
      .from('payment_intents')
      .select('id, status, paypal_capture_id')
      .eq('paypal_order_id', order_id)
      .eq('booking_id', booking.id)
      .single();

    if (!intentError && existingIntent) {
      if (existingIntent.status === 'captured' || existingIntent.status === 'approved') {
        console.log('Order already captured, returning existing capture');
        return new Response(
          JSON.stringify({
            success: true,
            capture_id: existingIntent.paypal_capture_id,
            status: 'COMPLETED',
            message: 'Order already captured',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // ========================================================================
    // 5. GET PAYPAL ACCESS TOKEN
    // ========================================================================

    const accessToken = await getPayPalAccessToken(paypalConfig);

    // ========================================================================
    // 6. VERIFY ORDER STATUS
    // ========================================================================

    const orderDetails = await getPayPalOrder(paypalConfig, accessToken, order_id);

    console.log('Order status:', orderDetails.status);

    if (orderDetails.status === 'COMPLETED') {
      console.log('Order already completed');
      return new Response(
        JSON.stringify({
          success: true,
          status: 'COMPLETED',
          message: 'Order already completed',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (orderDetails.status !== 'APPROVED') {
      throw new Error(`Cannot capture order with status: ${orderDetails.status}. Order must be APPROVED first.`);
    }

    // ========================================================================
    // 7. CAPTURE THE ORDER
    // ========================================================================

    const idempotencyKey = `capture_${order_id}_${Date.now()}`;
    const captureResponse = await capturePayPalOrder(
      paypalConfig,
      accessToken,
      order_id,
      idempotencyKey
    );

    console.log('Capture response:', {
      id: captureResponse.id,
      status: captureResponse.status,
    });

    // Extract capture details
    const purchaseUnit = captureResponse.purchase_units[0];
    const capture = purchaseUnit.payments.captures[0];

    // ========================================================================
    // 8. UPDATE PAYMENT INTENT
    // ========================================================================

    const { error: updateIntentError } = await supabase
      .from('payment_intents')
      .update({
        paypal_capture_id: capture.id,
        provider_payment_id: capture.id,
        provider_status: capture.status,
        status: capture.status === 'COMPLETED' ? 'captured' : 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('paypal_order_id', order_id)
      .eq('booking_id', booking.id);

    if (updateIntentError) {
      console.error('Failed to update payment intent:', updateIntentError);
      // Don't throw - capture was successful
    }

    // ========================================================================
    // 9. UPDATE BOOKING STATUS
    // ========================================================================

    if (capture.status === 'COMPLETED') {
      const { error: updateBookingError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (updateBookingError) {
        console.error('Failed to update booking status:', updateBookingError);
        // Don't throw - capture was successful
      }

      console.log(`Booking ${booking.id} confirmed after PayPal capture`);
    }

    // ========================================================================
    // 10. CREATE PAYMENT RECORD
    // ========================================================================

    const { error: paymentRecordError } = await supabase
      .from('payments')
      .insert({
        booking_id: booking.id,
        provider: 'paypal',
        provider_payment_id: capture.id,
        amount: parseFloat(capture.amount.value),
        currency: capture.amount.currency_code,
        status: capture.status === 'COMPLETED' ? 'approved' : 'pending',
        metadata: {
          order_id: order_id,
          capture_id: capture.id,
          purchase_unit_reference_id: purchaseUnit.reference_id,
        },
      });

    if (paymentRecordError) {
      console.error('Failed to create payment record:', paymentRecordError);
      // Don't throw - capture was successful
    }

    // ========================================================================
    // 11. RETURN SUCCESS RESPONSE
    // ========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        capture_id: capture.id,
        order_id: captureResponse.id,
        status: capture.status,
        amount: capture.amount.value,
        currency: capture.amount.currency_code,
        booking_id: booking.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error capturing PayPal order:', error);

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
