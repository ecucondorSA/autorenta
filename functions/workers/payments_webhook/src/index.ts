import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  AUTORENT_WEBHOOK_KV: KVNamespace;
}

// Payload para mock
interface MockPaymentWebhookPayload {
  provider: 'mock';
  booking_id: string;
  status: 'approved' | 'rejected';
}

// Payload para Mercado Pago
interface MercadoPagoWebhookPayload {
  provider: 'mercadopago';
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
): Promise<Response> => {
  console.log('Processing mock webhook for booking:', payload.booking_id);

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
  payload: MercadoPagoWebhookPayload,
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  env: Env,
): Promise<Response> => {
  console.log('Processing Mercado Pago webhook:', {
    action: payload.action,
    type: payload.type,
    paymentId: payload.data.id,
  });

  // Solo procesar eventos de pago
  if (payload.type !== 'payment') {
    console.log('Ignoring non-payment event:', payload.type);
    return jsonResponse({ message: 'Event type not supported' }, { status: 200 });
  }

  // Solo procesar creación y actualización
  if (!['payment.created', 'payment.updated'].includes(payload.action)) {
    console.log('Ignoring action:', payload.action);
    return jsonResponse({ message: 'Action not supported' }, { status: 200 });
  }

  const paymentId = payload.data.id;

  // Idempotency check
  const dedupeKey = `webhook:mp:${paymentId}:${payload.action}`;
  const existing = await env.AUTORENT_WEBHOOK_KV.get(dedupeKey);

  if (existing === 'processed') {
    console.log('Payment already processed:', paymentId);
    return jsonResponse({ message: 'Already processed' }, { status: 200 });
  }

  if (existing === 'processing') {
    return jsonResponse({ message: 'Processing in progress' }, { status: 202 });
  }

  // Set processing lock
  await env.AUTORENT_WEBHOOK_KV.put(dedupeKey, 'processing', { expirationTtl: 60 });

  try {
    // 1. Buscar el payment_intent asociado a este payment ID
    const { data: intentData, error: intentError } = await supabase
      .from('payment_intents')
      .select('*, booking_id')
      .eq('provider_payment_id', paymentId)
      .single();

    if (intentError || !intentData) {
      console.error('Payment intent not found for payment ID:', paymentId, intentError);
      // No throw - puede ser un pago que no es nuestro
      await env.AUTORENT_WEBHOOK_KV.put(dedupeKey, 'processed', {
        expirationTtl: 60 * 60 * 24 * 30,
      });
      return jsonResponse({ message: 'Payment intent not found' }, { status: 200 });
    }

    const bookingId = intentData.booking_id;

    // 2. Obtener access token del locador (necesario para consultar API de MP)
    // TODO: En producción, obtener el access_token del owner de la booking
    // Por ahora, usaremos un approach alternativo sin necesitar el token

    // 3. Alternativa: Actualizar basado en el metadata que enviamos en la creación del payment
    // Por ahora, asumimos que el webhook incluye external_reference con el booking_id
    // o que ya tenemos la relación en payment_intents

    // 4. Consultar la API de MP para obtener el estado del pago
    // NOTA: Esto requiere el access token del vendedor
    // Para MVP, podemos usar public key y asumir que el webhook es legítimo
    // En producción, SIEMPRE verificar la firma del webhook

    // Por ahora, marcaremos como completado basándonos en la acción
    // TODO: Implementar validación de firma x-signature
    const status = payload.action === 'payment.created' ? 'approved' : 'pending';
    const normalized = normalizeMPStatus(status);

    if (!normalized) {
      throw new Error('Cannot normalize MP status');
    }

    // 5. Actualizar payment
    const { error: paymentError } = await supabase.from('payments').upsert(
      {
        booking_id: bookingId,
        provider: 'mercadopago',
        status: normalized.payment,
        provider_payment_id: paymentId,
      },
      { onConflict: 'booking_id' },
    );

    if (paymentError) {
      console.error('Payment update failed:', paymentError);
      throw new Error('Error updating payment');
    }

    // 6. Actualizar booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: normalized.booking })
      .eq('id', bookingId);

    if (bookingError) {
      console.error('Booking update failed:', bookingError);
      throw new Error('Error updating booking');
    }

    // 7. Actualizar payment intent
    const { error: intentUpdateError } = await supabase
      .from('payment_intents')
      .update({ status: normalized.payment })
      .eq('id', intentData.id);

    if (intentUpdateError) {
      console.error('Intent update failed:', intentUpdateError);
      throw new Error('Error updating payment intent');
    }

    // Mark as processed
    await env.AUTORENT_WEBHOOK_KV.put(dedupeKey, 'processed', {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    });

    console.log('MP payment processed successfully:', {
      paymentId,
      bookingId,
      status: normalized,
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
    // Clear lock on error
    await env.AUTORENT_WEBHOOK_KV.delete(dedupeKey);
    throw error;
  }
};

/**
 * Worker principal
 */
const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Solo acepta POST en /webhooks/payments
    if (request.method !== 'POST' || url.pathname !== '/webhooks/payments') {
      return jsonResponse({ message: 'Not found' }, { status: 404 });
    }

    let payload: PaymentWebhookPayload;

    try {
      payload = (await request.json()) as PaymentWebhookPayload;
    } catch (error) {
      console.error('Invalid JSON:', error);
      return jsonResponse({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    // Validar que tenga provider
    if (!payload.provider) {
      return jsonResponse({ message: 'Missing provider field' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient(env);

    try {
      // Rutear según el provider
      if (payload.provider === 'mock') {
        // Validar campos requeridos para mock
        if (!payload.booking_id || !payload.status) {
          return jsonResponse({ message: 'Missing required fields for mock' }, { status: 400 });
        }
        return await processMockWebhook(payload, supabase, env);
      } else if (payload.provider === 'mercadopago') {
        // Validar campos requeridos para MP
        if (!payload.action || !payload.type || !payload.data?.id) {
          return jsonResponse({ message: 'Missing required fields for Mercado Pago' }, { status: 400 });
        }
        return await processMercadoPagoWebhook(payload, supabase, env);
      } else {
        return jsonResponse({ message: 'Unsupported provider' }, { status: 400 });
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      return jsonResponse(
        {
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 },
      );
    }
  },
};

export default worker;
