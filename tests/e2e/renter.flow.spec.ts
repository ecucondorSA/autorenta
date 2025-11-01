
import { test, expect } from '@playwright/test';
import { BookingResponseSchema } from '../../functions/contracts/booking.schemas';
import mpPreferenceApproved from '../fixtures/mp_preference_approved.json';
import mpPaymentApproved from '../fixtures/mp_payment_approved.json';

test.describe('Renter end-to-end flow', () => {
  test('discover → select → book → pay → receipt → review', async ({ page, request }) => {
    // 1) Descubrir/filtrar autos
    await page.goto('/cars?city=CABA');
    await page.getByPlaceholder('Buscar por modelo o marca').fill('Gol');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: /Volkswagen Gol/i })).toBeVisible();

    // 2) Detalle + fechas + precio dinámico
    await page.getByRole('link', { name: /Volkswagen Gol/i }).click();
    await page.getByTestId('date-from').fill('2025-11-10');
    await page.getByTestId('date-to').fill('2025-11-12');
    await page.getByRole('button', { name: /calcular precio/i }).click();
    await expect(page.getByTestId('price-total')).toContainText('$');

    // 3) Login/registro rápido (si tu app lo pide)
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.getByPlaceholder('Email').fill('renter+test@autorent.ar');
    await page.getByPlaceholder('Contraseña').fill('Secret.123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText(/hola/i)).toBeVisible();

    // 4) Crear booking (contrato backend)
    await page.route('**/api/v1/bookings', async route => {
      const req = await route.request().postDataJSON();
      // retorna booking preliminar con estado "pending_payment"
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          booking_id: '7a6e1b15-2b78-4f8c-a78f-4d6f8a5f9e00',
          status: 'pending_payment',
          car_id: req.car_id,
          renter_id: 'f7d8eaf0-28eb-4b5f-9f01-3b5f0cbd9ab1',
          amount_cents: 250000,
          currency: 'ARS',
          created_at: new Date().toISOString()
        })
      });
    });

    await page.getByRole('button', { name: /reservar/i }).click();
    const bookingSummary = page.getByTestId('booking-summary');
    await expect(bookingSummary).toContainText('pending_payment');

    // 5) Crear preferencia de pago (interceptar MercadoPago)
    await page.route('**/api/v1/payments/create_preference', route => {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(mpPreferenceApproved)
      });
    });
    await page.getByRole('button', { name: /pagar/i }).click();

    // 6) Redirección a MP → simulamos retorno "aprobado"
    await page.waitForURL(/checkout\/redirect/);
    // La UI normalmente espera webhook; disparamos “manual” el webhook:
    const webhookRes = await request.post('/api/webhooks/mercadopago', {
      data: mpPaymentApproved, headers: { 'x-idempotency-key': String(mpPaymentApproved.data.id) }
    });
    expect(webhookRes.status()).toBe(200);

    // 7) Ver recibo/confirmación
    await page.goto('/bookings/7a6e1b15-2b78-4f8c-a78f-4d6f8a5f9e00/receipt');
    await expect(page.getByText(/pago confirmado/i)).toBeVisible();
    await expect(page.getByTestId('booking-status')).toHaveText(/confirmed/i);

    // 8) Post-checkout: solicitar review
    await page.goto('/bookings/7a6e1b15-2b78-4f8c-a78f-4d6f8a5f9e00/review');
    await page.getByLabel('Calificación').click({ position: { x: 100, y: 10 } }); // 5 estrellas
    await page.getByPlaceholder('Deja tu comentario').fill('Excelente experiencia');
    await page.getByRole('button', { name: /enviar reseña/i }).click();
    await expect(page.getByText(/¡gracias por tu reseña!/i)).toBeVisible();

    // 9) (Opc) validar contrato de booking final (fetch a tu API y Zod)
    const finalBooking = await request.get('/api/v1/bookings/7a6e1b15-2b78-4f8c-a78f-4d6f8a5f9e00');
    const json = await finalBooking.json();
    BookingResponseSchema.parse(json); // rompe si el contrato cambió
  });
});
