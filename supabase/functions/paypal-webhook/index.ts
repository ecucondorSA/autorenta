/**
 * PayPal Webhook Edge Function
 * Handles PayPal webhook events for order completion and payment capture
 *
 * Supported Events:
 * - CHECKOUT.ORDER.APPROVED - User approved the order (ready to capture)
 * - PAYMENT.CAPTURE.COMPLETED - Payment was captured successfully
 * - PAYMENT.CAPTURE.DECLINED - Payment capture failed
 * - MERCHANT.ONBOARDING.COMPLETED - Seller onboarding completed
 *
 * Security:
 * - PayPal webhook signature verification
 * - Idempotency by event ID
 * - Rate limiting (100 req/min per IP)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import {
  PayPalConfig,
  getPayPalAccessToken,
  verifyPayPalWebhookSignature,
  payPalAmountToCents,
} from '../_shared/paypal-api.ts';

// Rate limiting storage (in-memory, per-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 100; // 100 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms

// Processed events cache (idempotency)
const processedEvents = new Set<string>();
const PROCESSED_EVENTS_MAX_SIZE = 10000;

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  resource: any;
  summary: string;
}

serve(async (req: Request) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // 1. RATE LIMITING
    // ========================================================================

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const now = Date.now();

    const rateLimit = rateLimitStore.get(clientIP) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };

    if (now > rateLimit.resetTime) {
      // Reset window
      rateLimitStore.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else if (rateLimit.count >= RATE_LIMIT_MAX) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      rateLimit.count++;
      rateLimitStore.set(clientIP, rateLimit);
    }

    // ========================================================================
    // 2. PARSE WEBHOOK PAYLOAD
    // ========================================================================

    const rawBody = await req.text();
    const event: PayPalWebhookEvent = JSON.parse(rawBody);

    console.log(`PayPal webhook received: ${event.event_type} (ID: ${event.id})`);

    // ========================================================================
    // 3. IDEMPOTENCY CHECK
    // ========================================================================

    if (processedEvents.has(event.id)) {
      console.log(`Event ${event.id} already processed, skipping`);
      return new Response(
        JSON.stringify({ status: 'already_processed', event_id: event.id }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================================================
    // 4. WEBHOOK SIGNATURE VERIFICATION
    // ========================================================================

    const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalSecret = Deno.env.get('PAYPAL_SECRET');
    const paypalEnv = (Deno.env.get('PAYPAL_ENV') || 'sandbox') as 'sandbox' | 'live';

    if (!webhookId || !paypalClientId || !paypalSecret) {
      throw new Error('PayPal webhook configuration missing');
    }

    const paypalConfig: PayPalConfig = {
      clientId: paypalClientId,
      clientSecret: paypalSecret,
      environment: paypalEnv,
    };

    // Get access token for signature verification
    const accessToken = await getPayPalAccessToken(paypalConfig);

    // Extract headers for verification
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const isValid = await verifyPayPalWebhookSignature(
      paypalConfig,
      accessToken,
      webhookId,
      headers,
      event
    );

    if (!isValid) {
      console.error('Invalid PayPal webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Webhook signature verified ✓');

    // ========================================================================
    // 5. INITIALIZE SUPABASE CLIENT
    // ========================================================================

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========================================================================
    // 6. ROUTE TO EVENT HANDLER
    // ========================================================================

    let result: any;

    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        result = await handleOrderApproved(supabase, event);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        result = await handleCaptureCompleted(supabase, event);
        break;

      case 'PAYMENT.CAPTURE.DECLINED':
      case 'PAYMENT.CAPTURE.DENIED':
        result = await handleCaptureFailed(supabase, event);
        break;

      case 'MERCHANT.ONBOARDING.COMPLETED':
        result = await handleMerchantOnboarding(supabase, event);
        break;

      default:
        console.log(`Unhandled event type: ${event.event_type}`);
        result = { status: 'ignored', event_type: event.event_type };
    }

    // Mark event as processed
    processedEvents.add(event.id);

    // Limit cache size
    if (processedEvents.size > PROCESSED_EVENTS_MAX_SIZE) {
      const firstItem = processedEvents.values().next().value;
      processedEvents.delete(firstItem);
    }

    const duration = Date.now() - startTime;
    console.log(`Webhook processed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        status: 'success',
        event_id: event.id,
        event_type: event.event_type,
        result,
        duration_ms: duration,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('PayPal webhook error:', error);

    return new Response(
      JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle CHECKOUT.ORDER.APPROVED event
 * User approved the order, but payment not captured yet
 */
async function handleOrderApproved(supabase: any, event: PayPalWebhookEvent) {
  const orderId = event.resource.id;
  const orderStatus = event.resource.status;

  console.log(`Order approved: ${orderId}, status: ${orderStatus}`);

  // Update payment intent status
  const { error: updateError } = await supabase
    .from('payment_intents')
    .update({
      provider_status: orderStatus,
      status: 'authorized',
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_order_id', orderId);

  if (updateError) {
    console.error('Failed to update payment intent:', updateError);
  }

  return { order_id: orderId, status: orderStatus };
}

/**
 * Handle PAYMENT.CAPTURE.COMPLETED event
 * Payment was successfully captured
 */
async function handleCaptureCompleted(supabase: any, event: PayPalWebhookEvent) {
  const capture = event.resource;
  const captureId = capture.id;
  const captureStatus = capture.status;
  const captureAmount = capture.amount.value;
  const currency = capture.amount.currency_code;

  // Get order ID from supplementary data
  const orderId = capture.supplementary_data?.related_ids?.order_id;

  console.log(`Payment capture completed: ${captureId}, amount: ${captureAmount} ${currency}`);

  // Find booking by order ID
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, renter_id, car_id, total_amount, payment_split_completed, provider_collector_id')
    .eq('payment_preference_id', orderId)
    .eq('payment_provider', 'paypal')
    .single();

  if (bookingError || !booking) {
    console.error('Booking not found for order:', orderId);
    throw new Error(`Booking not found for order ${orderId}`);
  }

  console.log(`Booking found: ${booking.id}`);

  // Check if already processed (idempotency)
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('provider_payment_id', captureId)
    .eq('provider', 'paypal')
    .single();

  if (existingPayment) {
    console.log('Payment already processed');
    return { booking_id: booking.id, capture_id: captureId, status: 'already_processed' };
  }

  // Update payment intent
  const { error: intentError } = await supabase
    .from('payment_intents')
    .update({
      paypal_capture_id: captureId,
      provider_payment_id: captureId,
      provider_status: captureStatus,
      status: 'captured',
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_order_id', orderId);

  if (intentError) {
    console.error('Failed to update payment intent:', intentError);
  }

  // Create payment record
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id: booking.id,
      provider: 'paypal',
      provider_payment_id: captureId,
      amount: parseFloat(captureAmount),
      currency,
      status: 'approved',
      metadata: {
        order_id: orderId,
        capture_id: captureId,
        event_id: event.id,
      },
    });

  if (paymentError) {
    console.error('Failed to create payment record:', paymentError);
  }

  // Update booking status
  const { error: bookingUpdateError } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id);

  if (bookingUpdateError) {
    console.error('Failed to update booking status:', bookingUpdateError);
  }

  // Process split payment if applicable
  if (booking.provider_collector_id && !booking.payment_split_completed) {
    console.log('Processing split payment...');

    // Get owner details
    const { data: car } = await supabase
      .from('cars')
      .select('owner_id')
      .eq('id', booking.car_id)
      .single();

    if (car) {
      const captureAmountCents = payPalAmountToCents(captureAmount);

      // Get platform fee from capture supplementary data or calculate
      const { data: feeConfig } = await supabase.rpc('get_platform_fee_percent', {
        p_provider: 'paypal',
      });

      const feePercent = feeConfig || 0.15;
      const platformFeeCents = Math.round(captureAmountCents * feePercent);
      const ownerAmountCents = captureAmountCents - platformFeeCents;

      // Register split payment
      const { error: splitError } = await supabase.rpc('register_payment_split', {
        p_booking_id: booking.id,
        p_provider: 'paypal',
        p_provider_payment_id: captureId,
        p_total_amount_cents: captureAmountCents,
        p_currency: currency,
      });

      if (splitError) {
        console.error('Failed to register split payment:', splitError);

        // Log issue for manual review
        await supabase.from('payment_issues').insert({
          booking_id: booking.id,
          provider_payment_id: captureId,
          issue_type: 'split_payment_registration_failed',
          description: `Failed to register PayPal split payment: ${splitError.message}`,
          severity: 'high',
          metadata: {
            capture_id: captureId,
            order_id: orderId,
            error: splitError.message,
          },
        });
      } else {
        console.log('Split payment registered successfully');
      }
    }
  }

  return {
    booking_id: booking.id,
    capture_id: captureId,
    status: captureStatus,
    amount: captureAmount,
    currency,
  };
}

/**
 * Handle PAYMENT.CAPTURE.DECLINED/DENIED event
 * Payment capture failed
 */
async function handleCaptureFailed(supabase: any, event: PayPalWebhookEvent) {
  const capture = event.resource;
  const captureId = capture.id;
  const captureStatus = capture.status;

  console.log(`Payment capture failed: ${captureId}, status: ${captureStatus}`);

  // Update payment intent
  const { error: intentError } = await supabase
    .from('payment_intents')
    .update({
      provider_status: captureStatus,
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_capture_id', captureId);

  if (intentError) {
    console.error('Failed to update payment intent:', intentError);
  }

  return { capture_id: captureId, status: captureStatus };
}

/**
 * Handle MERCHANT.ONBOARDING.COMPLETED event
 * Seller completed PayPal onboarding
 */
async function handleMerchantOnboarding(supabase: any, event: PayPalWebhookEvent) {
  const resource = event.resource;
  const merchantId = resource.merchant_id;
  const trackingId = resource.tracking_id;

  console.log(`Merchant onboarding completed: ${merchantId}, tracking: ${trackingId}`);

  // Update onboarding record
  const { data: onboarding, error: onboardingError } = await supabase
    .from('paypal_seller_onboarding')
    .update({
      status: 'completed',
      merchant_id_in_paypal: merchantId,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tracking_id', trackingId)
    .select('user_id')
    .single();

  if (onboardingError || !onboarding) {
    console.error('Failed to update onboarding record:', onboardingError);
    return { merchant_id: merchantId, status: 'error' };
  }

  // Update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      paypal_merchant_id: merchantId,
      paypal_connected: true,
      paypal_onboarding_completed_at: new Date().toISOString(),
      marketplace_approved_paypal: true, // Auto-approve for now
    })
    .eq('id', onboarding.user_id);

  if (profileError) {
    console.error('Failed to update profile:', profileError);
  }

  console.log(`Profile ${onboarding.user_id} updated with PayPal merchant ID`);

  return { merchant_id: merchantId, user_id: onboarding.user_id, status: 'completed' };
}
