/**
 * @fileoverview Supabase Edge Function: process-payment-queue
 * @version 12
 * @frozen 2026-01-09
 *
 * ⚠️  FROZEN CODE - DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION
 *
 * Procesa la cola de capturas de pagos pre-autorizados.
 * Usa fetch() directo a MercadoPago API - NO usar SDK.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_API_BASE = 'https://api.mercadopago.com/v1';

/**
 * Capture a pre-authorized payment using MercadoPago REST API directly.
 * Avoids SDK dependency which has Node.js compatibility issues in Deno.
 */
async function capturePayment(paymentId: string, amount: number): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(`${MP_API_BASE}/payments/${paymentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `capture-${paymentId}-${Date.now()}`,
      },
      body: JSON.stringify({
        capture: true,
        transaction_amount: amount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || `HTTP ${response.status}`, data };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Fetch pending items from queue
  // Schema: payment_captures_queue.booking_id → payment_intents.booking_id → provider_intent_id
  const { data: pendingItems, error: fetchError } = await supabase
    .from('payment_captures_queue')
    .select('*')
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

      // Get Payment Intent by booking_id to find MP Payment ID
      const { data: intent, error: intentError } = await supabase
        .from('payment_intents')
        .select('provider_intent_id, status')
        .eq('booking_id', item.booking_id)
        .eq('is_preauth', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (intentError || !intent?.provider_intent_id) {
        throw new Error(`No authorized payment intent found for booking ${item.booking_id}`);
      }

      const mpPaymentId = intent.provider_intent_id;
      const amount = item.amount_cents / 100; // Convert to float

      console.log(`Capturing payment ${mpPaymentId} for amount ${amount}`);

      // 2. Call MercadoPago Capture via REST API
      const captureResult = await capturePayment(mpPaymentId, amount);

      if (!captureResult.success) {
        throw new Error(captureResult.error || 'Capture failed');
      }

      // 3. Update Queue & Intent
      await supabase
        .from('payment_captures_queue')
        .update({
          status: 'completed',
          error_log: { capture_response: captureResult.data }
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

      results.push({ id: item.id, status: 'failed', error: err instanceof Error ? err.message : err });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
