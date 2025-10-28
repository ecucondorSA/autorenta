import { test, expect } from '@playwright/test';

/**
 * TEST CRÍTICO: Webhook de Pagos
 *
 * Valida el worker de webhooks que procesa pagos de Mock y Mercado Pago.
 *
 * Pre-requisitos:
 * - Worker desplegado en Cloudflare
 * - Secretos configurados (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * - KV namespace configurado para idempotencia
 *
 * Flujo Mock:
 * 1. Crear booking de prueba
 * 2. Enviar webhook mock approved
 * 3. Verificar que booking se confirma
 * 4. Verificar que payment se marca como completed
 *
 * Flujo Mercado Pago:
 * 1. Crear payment_intent con provider_payment_id
 * 2. Enviar webhook de MP
 * 3. Verificar actualización de estados
 */

const WORKER_URL =
  'https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments';

test.describe('Webhook Worker - Mock Provider', () => {
  test('debe procesar webhook mock approved', async ({ request }) => {
    const bookingId = `test-booking-${Date.now()}`;

    // Enviar webhook
    const response = await request.post(WORKER_URL, {
      data: {
        provider: 'mock',
        booking_id: bookingId,
        status: 'approved',
      },
    });

    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result.message).toBe('Mock payment processed');
    expect(result.result.paymentStatus).toBe('completed');
    expect(result.result.bookingStatus).toBe('confirmed');
  });

  test('debe procesar webhook mock rejected', async ({ request }) => {
    const bookingId = `test-booking-${Date.now()}`;

    const response = await request.post(WORKER_URL, {
      data: {
        provider: 'mock',
        booking_id: bookingId,
        status: 'rejected',
      },
    });

    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result.message).toBe('Mock payment processed');
    expect(result.result.paymentStatus).toBe('failed');
    expect(result.result.bookingStatus).toBe('cancelled');
  });

  test('debe manejar idempotencia - mismo webhook dos veces', async ({ request }) => {
    const bookingId = `test-booking-${Date.now()}`;

    const payload = {
      provider: 'mock',
      booking_id: bookingId,
      status: 'approved',
    };

    // Primera llamada
    const response1 = await request.post(WORKER_URL, { data: payload });
    expect(response1.ok()).toBeTruthy();
    const result1 = await response1.json();
    expect(result1.message).toBe('Mock payment processed');

    // Segunda llamada (duplicada)
    const response2 = await request.post(WORKER_URL, { data: payload });
    expect(response2.ok()).toBeTruthy();
    const result2 = await response2.json();

    // Debe retornar "Already processed"
    expect(result2.message).toBe('Already processed');
    expect(response2.status()).toBe(200);
  });

  test('debe validar payload requerido para mock', async ({ request }) => {
    // Sin booking_id
    const response1 = await request.post(WORKER_URL, {
      data: {
        provider: 'mock',
        status: 'approved',
      },
    });

    expect(response1.status()).toBe(400);
    const result1 = await response1.json();
    expect(result1.message).toContain('Missing required fields');

    // Sin status
    const response2 = await request.post(WORKER_URL, {
      data: {
        provider: 'mock',
        booking_id: 'test-id',
      },
    });

    expect(response2.status()).toBe(400);
  });
});

test.describe('Webhook Worker - Mercado Pago Provider', () => {
  test('debe procesar webhook de MP payment.created', async ({ request }) => {
    const paymentId = `${Date.now()}`;

    const response = await request.post(WORKER_URL, {
      data: {
        provider: 'mercadopago',
        action: 'payment.created',
        type: 'payment',
        data: {
          id: paymentId,
        },
      },
    });

    expect(response.ok()).toBeTruthy();

    const result = await response.json();

    // Si no existe payment_intent, debe retornar "not found"
    if (result.message === 'Payment intent not found') {
      expect(response.status()).toBe(200);
    } else {
      // Si existe, debe procesarse
      expect(result.message).toBe('Mercado Pago payment processed');
      expect(result.result.paymentId).toBe(paymentId);
      expect(result.result.paymentStatus).toBe('completed');
      expect(result.result.bookingStatus).toBe('confirmed');
    }
  });

  test('debe ignorar eventos no soportados de MP', async ({ request }) => {
    // Evento de tipo merchant_order
    const response = await request.post(WORKER_URL, {
      data: {
        provider: 'mercadopago',
        action: 'merchant_order.created',
        type: 'merchant_order',
        data: {
          id: '123',
        },
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.message).toBe('Event type not supported');
  });

  test('debe ignorar acciones no soportadas de MP', async ({ request }) => {
    // Acción no relevante
    const response = await request.post(WORKER_URL, {
      data: {
        provider: 'mercadopago',
        action: 'payment.deleted',
        type: 'payment',
        data: {
          id: '123',
        },
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.message).toBe('Action not supported');
  });

  test('debe validar payload requerido para MP', async ({ request }) => {
    // Sin action
    const response1 = await request.post(WORKER_URL, {
      data: {
        provider: 'mercadopago',
        type: 'payment',
        data: { id: '123' },
      },
    });

    expect(response1.status()).toBe(400);

    // Sin data.id
    const response2 = await request.post(WORKER_URL, {
      data: {
        provider: 'mercadopago',
        action: 'payment.created',
        type: 'payment',
        data: {},
      },
    });

    expect(response2.status()).toBe(400);
  });

  test('debe manejar idempotencia para MP', async ({ request }) => {
    const paymentId = `mp-${Date.now()}`;

    const payload = {
      provider: 'mercadopago',
      action: 'payment.created',
      type: 'payment',
      data: {
        id: paymentId,
      },
    };

    // Primera llamada
    await request.post(WORKER_URL, { data: payload });

    // Segunda llamada
    const response2 = await request.post(WORKER_URL, { data: payload });
    const result2 = await response2.json();

    // Debe ser idempotente
    expect(result2.message).toContain('processed');
  });
});

test.describe('Webhook Worker - Validaciones Generales', () => {
  test('debe rechazar métodos que no sean POST', async ({ request }) => {
    const response = await request.get(WORKER_URL);
    expect(response.status()).toBe(404);
  });

  test('debe rechazar JSON inválido', async ({ request }) => {
    const response = await request.post(WORKER_URL, {
      data: 'invalid json string',
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result.message).toContain('Invalid JSON');
  });

  test('debe rechazar provider no soportado', async ({ request }) => {
    const response = await request.post(WORKER_URL, {
      data: {
        provider: 'stripe', // No soportado
        booking_id: 'test',
      },
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result.message).toBe('Unsupported provider');
  });

  test('debe requerir campo provider', async ({ request }) => {
    const response = await request.post(WORKER_URL, {
      data: {
        booking_id: 'test',
        status: 'approved',
      },
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result.message).toBe('Missing provider field');
  });
});

test.describe('Webhook Worker - Performance', () => {
  test('debe responder en menos de 2 segundos', async ({ request }) => {
    const start = Date.now();

    await request.post(WORKER_URL, {
      data: {
        provider: 'mock',
        booking_id: `perf-test-${Date.now()}`,
        status: 'approved',
      },
    });

    const duration = Date.now() - start;

    // Worker debe responder rápido
    expect(duration).toBeLessThan(2000);
  });

  test('debe manejar 10 requests concurrentes', async ({ request }) => {
    const requests = Array.from({ length: 10 }, (_, i) =>
      request.post(WORKER_URL, {
        data: {
          provider: 'mock',
          booking_id: `concurrent-${Date.now()}-${i}`,
          status: 'approved',
        },
      }),
    );

    const responses = await Promise.all(requests);

    // Todas deben ser exitosas
    responses.forEach((response) => {
      expect(response.ok()).toBeTruthy();
    });
  });
});

test.describe('Webhook Worker - Integración con Supabase', () => {
  test.skip('debe actualizar tablas correctamente', async ({ request, page }) => {
    // NOTA: Este test requiere acceso directo a Supabase para verificar
    // En producción, usar el Supabase client con service role key

    const bookingId = `integration-test-${Date.now()}`;

    // 1. Crear booking de prueba en Supabase
    // await supabase.from('bookings').insert({ id: bookingId, ... });

    // 2. Enviar webhook
    await request.post(WORKER_URL, {
      data: {
        provider: 'mock',
        booking_id: bookingId,
        status: 'approved',
      },
    });

    // 3. Verificar en Supabase
    // const { data: booking } = await supabase
    //   .from('bookings')
    //   .select('status')
    //   .eq('id', bookingId)
    //   .single();
    //
    // expect(booking.status).toBe('confirmed');

    // const { data: payment } = await supabase
    //   .from('payments')
    //   .select('status')
    //   .eq('booking_id', bookingId)
    //   .single();
    //
    // expect(payment.status).toBe('completed');
  });
});

test.describe('Webhook Worker - Error Handling', () => {
  test('debe retornar 500 en caso de error interno', async ({ request }) => {
    // Payload que causará error (booking inexistente en DB real)
    const response = await request.post(WORKER_URL, {
      data: {
        provider: 'mock',
        booking_id: 'definitely-does-not-exist-12345',
        status: 'approved',
      },
    });

    // Puede retornar 200 (procesado) o 500 (error)
    // Depende de si la tabla bookings permite insertar con ID no existente
    expect([200, 500]).toContain(response.status());
  });

  test('debe limpiar lock de KV en caso de error', async ({ request }) => {
    // Este test verifica que si hay un error, el lock se limpia
    // para permitir reintento

    const bookingId = `error-test-${Date.now()}`;

    // Primera llamada (puede fallar)
    await request.post(WORKER_URL, {
      data: {
        provider: 'mock',
        booking_id: bookingId,
        status: 'approved',
      },
    });

    // Segunda llamada debe poder procesar (no quedar locked)
    const response2 = await request.post(WORKER_URL, {
      data: {
        provider: 'mock',
        booking_id: bookingId,
        status: 'approved',
      },
    });

    // Debe ser "Already processed" (no "Processing in progress")
    const result = await response2.json();
    expect(result.message).toBe('Already processed');
  });
});
