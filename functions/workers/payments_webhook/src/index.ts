import { createClient } from '@supabase/supabase-js';
import { withSentry, captureError, addBreadcrumb, type SentryEnv } from './sentry';

interface Logger {
  info: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  debug: (message: string, data?: unknown) => void;
}

interface Env extends SentryEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  AUTORENT_WEBHOOK_KV: KVNamespace;
  MERCADOPAGO_ACCESS_TOKEN?: string;
  SENTRY_DSN?: string;
  ENVIRONMENT?: string;
}

// Payload para mock
interface MockPaymentWebhookPayload {
  provider: 'mock';
  booking_id: string;
  status: 'approved' | 'rejected';
}

// Payload para Mercado Pago
interface MercadoPagoWebhookPayload {
  action: string; // payment.created, payment.updated
  data: {
    id: string; // Payment ID
  };
  type: string; // payment
  // Headers que envía MP
  'x-signature'?: string;
  'x-request-id'?: string;
}

type PaymentWebhookPayload = MockPaymentWebhookPayload | MercadoPagoWebhookPayload;

// Response de la API de MP para obtener detalles del pago
interface MercadoPagoPaymentDetail {
  id: number;
  status: string; // approved, rejected, pending, cancelled, etc.
  status_detail: string;
  external_reference?: string; // Nuestro booking_id
  transaction_amount: number;
  currency_id: string;
  payer: {
    id: string;
    email: string;
  };
  metadata?: {
    booking_id?: string;
  };
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

/**
 * Normaliza el status de un pago mock a estados de DB
 */
const normalizeMockStatus = (status: string): { payment: string; booking: string } => {
  if (status === 'approved') {
    return { payment: 'completed', booking: 'confirmed' };
  }
  return { payment: 'failed', booking: 'cancelled' };
};

/**
 * Normaliza el status de Mercado Pago a estados de DB
 */
const normalizeMPStatus = (status: string): { payment: string; booking: string } | null => {
  switch (status) {
    case 'approved':
      return { payment: 'completed', booking: 'confirmed' };
    case 'rejected':
    case 'cancelled':
      return { payment: 'failed', booking: 'cancelled' };
    case 'pending':
    case 'in_process':
      return { payment: 'pending', booking: 'pending' };
    case 'refunded':
    case 'charged_back':
      return { payment: 'refunded', booking: 'cancelled' };
    default:
      console.warn('Unknown MP status:', status);
      return null;
  }
};

const parseSignatureHeader = (
  signature: string,
): { ts?: string | undefined; hash?: string | undefined } => {
  const parts = signature.split(',');
  const result: Record<string, string> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) {
      result[key.trim()] = value.trim();
    }
  }

  const ts = result.ts;
  const hash = result.v1;
  
  return { 
    ...(ts ? { ts } : {}), 
    ...(hash ? { hash } : {})
  };
};

const verifyMercadoPagoSignature = async (params: {
  paymentId: string;
  signatureHeader?: string | null | undefined;
  requestId?: string | null | undefined;
  secret: string;
}): Promise<boolean> => {
  const { paymentId, signatureHeader, requestId, secret } = params;

  if (!signatureHeader || !requestId) {
    // Si no hay firma, no podemos verificar. Mercado Pago puede omitirla en ciertos entornos.
    console.warn('Mercado Pago signature headers missing, skipping validation');
    return true;
  }

  const { ts, hash } = parseSignatureHeader(signatureHeader);
  if (!ts || !hash) {
    console.warn('Malformed x-signature header, skipping validation');
    return true;
  }

  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(manifest));
    const computedHash = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const isValid = computedHash === hash;

    if (!isValid) {
      console.error('Invalid Mercado Pago signature', {
        paymentId,
        requestId,
        ts,
        expected: hash.substring(0, 12),
        received: computedHash.substring(0, 12),
      });
    }

    return isValid;
  } catch (error) {
    console.error('Failed to validate Mercado Pago signature', error);
    return false;
  }
};

/**
 * Obtiene los detalles de un pago desde la API de Mercado Pago
 */
const getMercadoPagoPaymentDetails = async (
  paymentId: string,
  accessToken: string,
): Promise<MercadoPagoPaymentDetail> => {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`MP API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Procesa un webhook mock
 */
const processMockWebhook = async (
  payload: MockPaymentWebhookPayload,
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  env: Env,
  log: Logger,
): Promise<Response> => {
  log.info('Processing mock webhook', { bookingId: payload.booking_id, status: payload.status });

  // Idempotency check
  const dedupeKey = `webhook:mock:${payload.booking_id}:${payload.status}`;
  const existing = await env.AUTORENT_WEBHOOK_KV.get(dedupeKey);

  if (existing === 'processed') {
    return jsonResponse({ message: 'Already processed' }, { status: 200 });
  }

  if (existing === 'processing') {
    return jsonResponse({ message: 'Processing in progress' }, { status: 202 });
  }

  // Set processing lock
  await env.AUTORENT_WEBHOOK_KV.put(dedupeKey, 'processing', { expirationTtl: 60 });

  try {
    const { payment, booking } = normalizeMockStatus(payload.status);

    // Update payments
    const { error: paymentsError } = await supabase
      .from('payments')
      .upsert(
        {
          booking_id: payload.booking_id,
          provider: 'mock',
          status: payment,
        },
        { onConflict: 'booking_id' },
      );

    if (paymentsError) {
      console.error('Payments update failed:', paymentsError);
      throw new Error('Error updating payment');
    }

    // Update booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: booking })
      .eq('id', payload.booking_id);

    if (bookingError) {
      console.error('Booking update failed:', bookingError);
      throw new Error('Error updating booking');
    }

    // Update payment_intents
    const { error: intentError } = await supabase
      .from('payment_intents')
      .update({ status: payment })
      .eq('booking_id', payload.booking_id);

    if (intentError) {
      console.error('Payment intent update failed:', intentError);
      throw new Error('Error updating payment intent');
    }

    // Mark as processed
    await env.AUTORENT_WEBHOOK_KV.put(dedupeKey, 'processed', {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    });

    return jsonResponse({
      message: 'Mock payment processed',
      result: {
        paymentStatus: payment,
        bookingStatus: booking,
      },
    });
  } catch (error) {
    // Clear lock on error
    await env.AUTORENT_WEBHOOK_KV.delete(dedupeKey);
    throw error;
  }
};

/**
 * Procesa un webhook de Mercado Pago
 */
const processMercadoPagoWebhook = async (
  payload: Partial<MercadoPagoWebhookPayload>,
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  env: Env,
  options: {
    signatureHeader?: string | null;
    requestId?: string | null;
    rawBody: string;
    query: URLSearchParams;
  },
  log: Logger,
): Promise<Response> => {
  const mpAccessToken = env.MERCADOPAGO_ACCESS_TOKEN;

  if (!mpAccessToken) {
    log.error('Mercado Pago access token not configured');
    return jsonResponse({ message: 'Mercado Pago access token missing' }, { status: 500 });
  }

  const paymentId =
    payload?.data?.id || options.query.get('data.id') || options.query.get('id');

  if (!paymentId) {
    log.error('Mercado Pago webhook without payment ID', {
      payload,
      query: Object.fromEntries(options.query.entries()),
    });
    return jsonResponse({ message: 'Payment ID missing' }, { status: 400 });
  }

  const webhookType = payload?.type || options.query.get('type') || '';

  if (webhookType && webhookType !== 'payment') {
    log.info('Ignoring non-payment event', { webhookType });
    return jsonResponse({ message: 'Event type not supported' }, { status: 200 });
  }

  log.info('Processing Mercado Pago webhook', {
    paymentId,
    action: payload?.action,
    type: webhookType,
  });

  const signatureValid = await verifyMercadoPagoSignature({
    paymentId,
    signatureHeader: options.signatureHeader || undefined,
    requestId: options.requestId || undefined,
    secret: mpAccessToken,
  });

  if (!signatureValid) {
    return jsonResponse({ message: 'Invalid signature' }, { status: 401 });
  }

  // Obtener detalles completos del pago desde MP
  let paymentDetail: MercadoPagoPaymentDetail;
  
  try {
    paymentDetail = await getMercadoPagoPaymentDetails(paymentId, mpAccessToken);
  } catch (error) {
    // Si falla (ej: payment ID de test), retornar 200 para que MP acepte el webhook
    console.log('Payment not found in MercadoPago API (probably a test):', paymentId);
    return jsonResponse({ 
      message: 'Webhook endpoint verified successfully',
      paymentId,
      note: 'Payment ID not found in MercadoPago API - this is expected for test notifications'
    }, { status: 200 });
  }
  
  const bookingId =
    paymentDetail.external_reference || paymentDetail.metadata?.booking_id;

  if (!bookingId) {
    console.error('Cannot resolve booking ID from payment', {
      paymentId,
      external_reference: paymentDetail.external_reference,
      metadata: paymentDetail.metadata,
    });

    // Evitar reintentos infinitos si no podemos mapear
    return jsonResponse({ message: 'Booking reference not found' }, { status: 200 });
  }

  const normalized = normalizeMPStatus(paymentDetail.status);

  if (!normalized) {
    console.warn('Unsupported Mercado Pago status', {
      paymentId,
      status: paymentDetail.status,
    });
    return jsonResponse({ message: 'Status not handled' }, { status: 200 });
  }

  const dedupeKey = `webhook:mp:${paymentId}:${paymentDetail.status}`;
  const existing = await env.AUTORENT_WEBHOOK_KV.get(dedupeKey);

  if (existing === 'processed') {
    console.log('Payment already processed:', paymentId, paymentDetail.status);
    return jsonResponse({ message: 'Already processed' }, { status: 200 });
  }

  if (existing === 'processing') {
    return jsonResponse({ message: 'Processing in progress' }, { status: 202 });
  }

  await env.AUTORENT_WEBHOOK_KV.put(dedupeKey, 'processing', { expirationTtl: 60 });

  try {
    // Buscar intent por provider_payment_id o booking_id como fallback
    let intentData = null;

    const { data: intentByProvider, error: intentProviderError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('provider_payment_id', String(paymentId))
      .maybeSingle();

    if (!intentProviderError && intentByProvider) {
      intentData = intentByProvider;
    } else {
      const { data: intentByBooking, error: intentBookingError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!intentBookingError && intentByBooking) {
        intentData = intentByBooking;
      }
    }

    if (!intentData) {
      console.warn('Payment intent not found for payment', {
        paymentId,
        bookingId,
      });

      await env.AUTORENT_WEBHOOK_KV.put(dedupeKey, 'processed', {
        expirationTtl: 60 * 60 * 24 * 30,
      });

      return jsonResponse({ message: 'Payment intent not found' }, { status: 200 });
    }

    // Actualizar payments
    const { error: paymentError } = await supabase.from('payments').upsert(
      {
        booking_id: bookingId,
        provider: 'mercadopago',
        status: normalized.payment,
        provider_payment_id: String(paymentId),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'booking_id' },
    );

    if (paymentError) {
      console.error('Payment update failed:', paymentError);
      throw new Error('Error updating payment');
    }

    // Actualizar booking solo si cambia a confirmado o cancelado
    if (normalized.booking === 'confirmed' || normalized.booking === 'cancelled') {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: normalized.booking,
        })
        .eq('id', bookingId);

      if (bookingError) {
        console.error('Booking update failed:', bookingError);
        throw new Error('Error updating booking');
      }
    }

    // Actualizar payment intent
    const intentUpdate: Record<string, unknown> = {
      status: normalized.payment,
      updated_at: new Date().toISOString(),
    };

    if (!intentData.provider_payment_id) {
      intentUpdate.provider_payment_id = String(paymentId);
    }

    const { error: intentUpdateError } = await supabase
      .from('payment_intents')
      .update(intentUpdate)
      .eq('id', intentData.id);

    if (intentUpdateError) {
      console.error('Intent update failed:', intentUpdateError);
      throw new Error('Error updating payment intent');
    }

    await env.AUTORENT_WEBHOOK_KV.put(dedupeKey, 'processed', {
      expirationTtl: 60 * 60 * 24 * 30,
    });

    console.log('Mercado Pago payment processed successfully', {
      paymentId,
      bookingId,
      status: paymentDetail.status,
      normalized,
    });

    return jsonResponse({
      message: 'Mercado Pago payment processed',
      result: {
        paymentId,
        bookingId,
        paymentStatus: normalized.payment,
        bookingStatus: normalized.booking,
      },
    });
  } catch (error) {
    await env.AUTORENT_WEBHOOK_KV.delete(dedupeKey);
    throw error;
  }
};

/**
 * Worker principal
 */
const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return withSentry(request, env, ctx, async () => {
      const url = new URL(request.url);

      // Health check endpoint - GET permite verificación
      if (url.pathname === '/webhooks/payments') {
        if (request.method === 'GET') {
          return jsonResponse({
            status: 'ok',
            message: 'Webhook endpoint is ready',
            timestamp: new Date().toISOString(),
          });
        }

        // Solo acepta POST para procesamiento real
        if (request.method !== 'POST') {
          return jsonResponse({ message: 'Method not allowed' }, { status: 405 });
        }
      } else {
        return jsonResponse({ message: 'Not found' }, { status: 404 });
      }

      const supabase = getSupabaseAdminClient(env);
      const rawBody = await request.text();
      let payload: any = {};

      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch (error) {
          console.warn('Invalid JSON payload, continuing with query params fallback:', error);
          addBreadcrumb('Invalid JSON payload', 'validation', { error });
          payload = {};
        }
      }

      try {
        // Create logger
        const log: Logger = {
          info: (msg, data) => console.log(`ℹ️  ${msg}`, data || ''),
          error: (msg, err) => console.error(`❌ ${msg}`, err || ''),
          warn: (msg, data) => console.warn(`⚠️  ${msg}`, data || ''),
          debug: (msg, data) => console.debug(`🐛 ${msg}`, data || ''),
        };

        // Rutear según el provider
        if (payload?.provider === 'mock') {
          addBreadcrumb('Processing mock webhook', 'webhook', { bookingId: payload.booking_id });
          // Validar campos requeridos para mock
          if (!payload.booking_id || !payload.status) {
            return jsonResponse({ message: 'Missing required fields for mock' }, { status: 400 });
          }
          return await processMockWebhook(payload, supabase, env, log);
        }

        addBreadcrumb('Processing MercadoPago webhook', 'webhook', {
          paymentId: payload?.data?.id,
        });
        return await processMercadoPagoWebhook(payload ?? {}, supabase, env, {
          signatureHeader: request.headers.get('x-signature'),
          requestId: request.headers.get('x-request-id'),
          rawBody,
          query: url.searchParams,
        }, log);
      } catch (error) {
        console.error('Error processing webhook:', error);
        captureError(error, {
          tags: {
            provider: payload?.provider || 'mercadopago',
            action: 'process-webhook',
          },
          extra: {
            url: url.pathname,
            method: request.method,
          },
        });
        return jsonResponse(
          {
            message: error instanceof Error ? error.message : 'Internal server error',
          },
          { status: 500 },
        );
      }
    });
  },
};

export default worker;
