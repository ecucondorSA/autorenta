import { Env } from './types';

type HandlerScope = 'booking_create' | 'payment_webhook';

interface IdempotentPayload {
  ok: boolean;
  bookingId?: string;
  paymentId?: string;
  scope: HandlerScope;
}

/**
 * Cloudflare Worker helper showcasing idempotent handling.
 * Bindings expected:
 *  - KV_IDEMP: KV namespace for idempotency cache
 *  - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY if you call Supabase within the handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const idempotencyKey = request.headers.get('Idempotency-Key') ?? crypto.randomUUID();
    const scope = (request.headers.get('X-Idempotency-Scope') ?? 'booking_create') as HandlerScope;

    const cached = await env.KV_IDEMP.get(idempotencyKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotent': 'HIT',
        },
      });
    }

    // Capture request body for downstream usage (e.g., booking details or PSP webhook)
    const rawBody = await request.text();

    // TODO: process booking or webhook here. For example:
    // const result = await handleBooking(JSON.parse(rawBody), env);
    // Ensure that the handler is itself side-effect safe and returns stable payloads.
    const responsePayload: IdempotentPayload = {
      ok: true,
      scope,
      // bookingId / paymentId go here when available
    };

    const responseBody = JSON.stringify(responsePayload);
    await env.KV_IDEMP.put(idempotencyKey, responseBody, {
      expirationTtl: 3600,
    });

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotent': 'MISS',
        'Idempotency-Key': idempotencyKey,
      },
    });
  },
};
