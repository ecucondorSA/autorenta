import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createMercadoPagoClient, getPaymentClient } from '../_shared/mercadopago-sdk.ts';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Fetch pending items from queue (Locking typically done via SQL, simplified here)
  // We process 10 items at a time
  const { data: pendingItems, error: fetchError } = await supabase
    .from('payment_captures_queue')
    .select('*, bookings(payment_intent_id)')
    .eq('status', 'pending')
    .limit(10);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError }), { status: 500 });
  }

  if (!pendingItems || pendingItems.length === 0) {
    return new Response(JSON.stringify({ message: 'No pending captures' }), { status: 200 });
  }

  const results = [];

  for (const item of pendingItems) {
    try {
      // Mark as processing
      await supabase
        .from('payment_captures_queue')
        .update({ status: 'processing', processed_at: new Date().toISOString() })
        .eq('id', item.id);

      const booking = item.bookings;

      // Get Payment Intent ID from booking (the pre-auth)
      // Note: In booking flow v2, this might be stored in 'payment_intent_id' or we might look up 'payment_intents' table.
      // Assuming bookings.payment_intent_id links to payment_intents.id

      if (!booking?.payment_intent_id) {
        throw new Error('Booking has no linked payment intent');
      }

      // Get MP Payment ID from Payment Intent
      const { data: intent } = await supabase
        .from('payment_intents')
        .select('mp_payment_id')
        .eq('id', booking.payment_intent_id)
        .single();

      if (!intent?.mp_payment_id) {
        throw new Error('Payment Intent has no MercadoPago Payment ID');
      }

      const mpPaymentId = intent.mp_payment_id;
      const amount = item.amount_cents / 100; // Convert to float

      // 2. Call MercadoPago Capture
      const mp = createMercadoPagoClient(MERCADOPAGO_ACCESS_TOKEN);
      const payment = getPaymentClient(mp);

      console.log(`Capturing payment ${mpPaymentId} for amount ${amount}`);

      // Execute capture
      const captureResult = await payment.capture({
        id: mpPaymentId,
        transaction_amount: amount,
        capture: true
      });

      // 3. Update Queue & Intent
      await supabase
        .from('payment_captures_queue')
        .update({
          status: 'completed',
          error_log: { capture_response: captureResult }
        })
        .eq('id', item.id);

      results.push({ id: item.id, status: 'success' });

    } catch (err) {
      console.error(`Error processing item ${item.id}:`, err);

      await supabase
        .from('payment_captures_queue')
        .update({
          status: 'failed',
          error_log: { error: err instanceof Error ? err.message : err }
        })
        .eq('id', item.id);

      results.push({ id: item.id, status: 'failed', error: err });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
