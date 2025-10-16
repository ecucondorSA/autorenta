import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  AUTORENT_WEBHOOK_KV: KVNamespace;
}

interface PaymentWebhookPayload {
  provider: 'mock';
  booking_id: string;
  status: 'approved' | 'rejected';
}

const jsonResponse = (data: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=UTF-8',
    },
    ...init,
  });

const getSupabaseAdminClient = (env: Env) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials are missing.');
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (input, init) => fetch(input, init),
    },
  });
};

const normalizeStatus = (status: PaymentWebhookPayload['status']): { payment: string; booking: string } => {
  if (status === 'approved') {
    return { payment: 'completed', booking: 'confirmed' };
  }
  return { payment: 'failed', booking: 'cancelled' };
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== 'POST' || url.pathname !== '/webhooks/payments') {
      return jsonResponse({ message: 'Not found' }, { status: 404 });
    }

    let payload: PaymentWebhookPayload;

    try {
      payload = (await request.json()) as PaymentWebhookPayload;
    } catch (error) {
      return jsonResponse({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!payload.booking_id || payload.provider !== 'mock') {
      return jsonResponse({ message: 'Invalid payload structure' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient(env);

    // Idempotency check using Cloudflare KV
    const dedupeKey = `webhook:${payload.booking_id}:${payload.status}`;
    const existing = await env.AUTORENT_WEBHOOK_KV.get(dedupeKey);

    if (existing === 'processed') {
      // Already processed, return success to prevent retries
      return jsonResponse({ message: 'Already processed' }, { status: 200 });
    }

    if (existing === 'processing') {
      // Another worker is processing this event
      return jsonResponse({ message: 'Processing in progress' }, { status: 202 });
    }

    // Set processing lock (expires in 60 seconds)
    await env.AUTORENT_WEBHOOK_KV.put(dedupeKey, 'processing', { expirationTtl: 60 });

    const { payment, booking } = normalizeStatus(payload.status);

    const paymentsResult = await supabase
      .from('payments')
      .upsert(
        {
          booking_id: payload.booking_id,
          provider: payload.provider,
          status: payment,
        },
        { onConflict: 'booking_id' },
      )
      .select('*')
      .single();

    try {
      if (paymentsResult.error) {
        console.error('Payments update failed', paymentsResult.error);
        throw new Error('Error updating payment');
      }

      const bookingUpdate = await supabase
        .from('bookings')
        .update({ status: booking })
        .eq('id', payload.booking_id);

      if (bookingUpdate.error) {
        console.error('Booking update failed', bookingUpdate.error);
        throw new Error('Error updating booking');
      }

      const intentsUpdate = await supabase
        .from('payment_intents')
        .update({ status: payment })
        .eq('booking_id', payload.booking_id);

      if (intentsUpdate.error) {
        console.error('Payment intent update failed', intentsUpdate.error);
        throw new Error('Error updating payment intent');
      }

      // Mark as processed (expires after 30 days)
      await env.AUTORENT_WEBHOOK_KV.put(dedupeKey, 'processed', {
        expirationTtl: 60 * 60 * 24 * 30,
      });

      return jsonResponse({
        message: 'Payment processed',
        result: {
          paymentStatus: payment,
          bookingStatus: booking,
        },
      });
    } catch (error) {
      // Clear the processing lock to allow retries
      await env.AUTORENT_WEBHOOK_KV.delete(dedupeKey);
      return jsonResponse(
        { message: error instanceof Error ? error.message : 'Server error' },
        { status: 500 }
      );
    }
  },
};

export default worker;
