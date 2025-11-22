import { expect, test } from '@playwright/test';

/**
 * Smoke Tests para Edge Functions de Mercado Pago
 *
 * Estos tests verifican que las Edge Functions deployadas respondan correctamente.
 */

const SUPABASE_URL = 'https://pisqjmoklivzpwufhscx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

test.describe('Edge Functions - Mercado Pago', () => {

  test('mercadopago-create-preference - debe responder sin error 500', async ({ request }) => {
    const response = await request.post(
      `${SUPABASE_URL}/functions/v1/mercadopago-create-preference`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          transaction_id: `test-${Date.now()}`,
          amount: 100,
          description: 'Test deposit'
        }
      }
    );

    // Debe responder (puede ser 400 por validación, pero no 500)
    expect(response.status()).toBeLessThan(500);
    console.log(`mercadopago-create-preference: ${response.status()}`);
  });

  test('mercadopago-create-booking-preference - debe responder sin error 500', async ({ request }) => {
    const response = await request.post(
      `${SUPABASE_URL}/functions/v1/mercadopago-create-booking-preference`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          booking_id: 'test-booking-id',
          use_split_payment: false
        }
      }
    );

    // Debe responder (puede ser 400 por validación, pero no 500)
    expect(response.status()).toBeLessThan(500);
    console.log(`mercadopago-create-booking-preference: ${response.status()}`);
  });

  test('mercadopago-process-booking-payment - debe responder sin error 500', async ({ request }) => {
    const response = await request.post(
      `${SUPABASE_URL}/functions/v1/mercadopago-process-booking-payment`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          payment_id: 'test-payment-id',
          booking_id: 'test-booking-id'
        }
      }
    );

    // Debe responder (puede ser 400 por validación, pero no 500)
    expect(response.status()).toBeLessThan(500);
    console.log(`mercadopago-process-booking-payment: ${response.status()}`);
  });

  test('mercadopago-process-deposit-payment - debe responder sin error 500', async ({ request }) => {
    const response = await request.post(
      `${SUPABASE_URL}/functions/v1/mercadopago-process-deposit-payment`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          payment_id: 'test-payment-id',
          transaction_id: 'test-transaction-id'
        }
      }
    );

    // Debe responder (puede ser 400 por validación, pero no 500)
    expect(response.status()).toBeLessThan(500);
    console.log(`mercadopago-process-deposit-payment: ${response.status()}`);
  });
});
