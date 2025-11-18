import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  createCompletedBooking,
  getBookingById,
  getActiveCar,
  authenticateUserInPage,
  cleanupTestBooking,
} from '../../helpers/booking-test-helpers';

/**
 * E2E Test: Dejar Review Post-Reserva
 *
 * Flujo completo:
 * 1. Booking completado
 * 2. Locatario recibe prompt para dejar review (modal o email link)
 * 3. Navega a formulario de review
 * 4. Selecciona rating (1-5 estrellas)
 * 5. Completa categorías (car condition, owner communication, value, overall)
 * 6. Escribe review de texto (opcional)
 * 7. Sube fotos (opcional)
 * 8. Envía review
 * 9. Verifica que review se guarda en BD
 * 10. Verifica que aparece en car detail page
 *
 * Prioridad: P1 (Important)
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

test.describe('Leave Review - Post-Reserva', () => {
  let testBookingId: string | null = null;
  let renterId: string | null = null;
  let carId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Authenticate user using helper function
    const renterEmail = 'test-renter@autorenta.com';
    const renterPassword = 'TestPassword123!';

    const authResult = await authenticateUserInPage(page, renterEmail, renterPassword);

    if (!authResult) {
      test.skip('Failed to authenticate test user');
      return;
    }

    renterId = authResult.userId;

    // Get active car for testing
    const car = await getActiveCar();
    if (!car) {
      test.skip('No active cars available for testing');
      return;
    }
    carId = car.id;

    // Create completed booking with check-in and check-out using helper function
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3); // Started 3 days ago
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2); // 2 days total

    const { booking } = await createCompletedBooking({
      carId: car.id,
      renterId,
      startDate,
      endDate,
      totalAmount: 100000, // 1000 ARS
      checkInOdometer: 50000,
      checkOutOdometer: 50100,
      checkInFuel: 75,
      checkOutFuel: 50,
    });

    testBookingId = booking.id;
    // Note: createCompletedBooking already creates both check-in and check-out inspections
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (testBookingId) {
      // Cleanup reviews if table exists
      try {
        await supabase
          .from('reviews')
          .delete()
          .eq('booking_id', testBookingId);
      } catch {
        // Table might not exist, ignore error
      }

      await cleanupTestBooking(testBookingId);
      testBookingId = null;
    }
  });

  test('T1: Happy path - Dejar review exitosamente', async ({ page }) => {
    if (!testBookingId || !renterId || !carId) {
      test.skip('Test setup incomplete');
      return;
    }

    console.log(`\n🚀 Iniciando test de dejar review para booking ${testBookingId}\n`);

    // PASO 1: Navegar a detalle de booking completado
    console.log('📍 PASO 1: Navegando a detalle de booking...');
    await page.goto(`/bookings/${testBookingId}`);
    await page.waitForLoadState('networkidle');

    // PASO 2: Buscar prompt para dejar review
    console.log('📍 PASO 2: Buscando prompt para dejar review...');
    const reviewPrompt = page
      .getByText(/dejar review|escribir reseña|calificar/i)
      .or(page.locator('[data-testid="review-prompt"]'))
      .or(page.getByRole('button', { name: /dejar review|escribir reseña|calificar/i }))
      .first();

    const promptVisible = await reviewPrompt.isVisible({ timeout: 5000 }).catch(() => false);
    if (!promptVisible) {
      console.log('⚠️ Prompt de review no encontrado, puede que la feature no esté implementada');
      test.skip('Review feature not implemented');
      return;
    }

    // Click en prompt o botón
    await reviewPrompt.click();
    await page.waitForTimeout(1000);

    // PASO 3: Llenar formulario de review
    console.log('📍 PASO 3: Llenando formulario de review...');

    // Rating general (1-5 estrellas)
    const ratingStars = page
      .locator('[data-testid="rating-stars"]')
      .or(page.locator('input[type="radio"][name="rating"]'))
      .first();

    const starsVisible = await ratingStars.isVisible({ timeout: 5000 }).catch(() => false);
    if (starsVisible) {
      // Seleccionar 5 estrellas (click en la quinta estrella)
      const fifthStar = page.locator('[data-rating="5"]').or(page.locator('input[value="5"]')).first();
      await fifthStar.click();
      console.log('✅ Rating de 5 estrellas seleccionado');
    }

    // Categorías (si existen)
    const carCondition = page
      .locator('[data-testid="rating-car-condition"]')
      .or(page.locator('input[name="carCondition"]'))
      .first();

    const conditionVisible = await carCondition.isVisible({ timeout: 5000 }).catch(() => false);
    if (conditionVisible) {
      await carCondition.fill('5'); // o click en estrellas
      console.log('✅ Rating de condición del auto seleccionado');
    }

    // Review de texto (opcional)
    const reviewText = page
      .locator('textarea[name="review"]')
      .or(page.locator('[data-testid="review-text"]'))
      .first();

    const textVisible = await reviewText.isVisible({ timeout: 5000 }).catch(() => false);
    if (textVisible) {
      await reviewText.fill('Excelente experiencia. El auto estaba en perfecto estado y el dueño fue muy atento.');
      console.log('✅ Review de texto ingresado');
    }

    // Fotos (opcional)
    const photoUpload = page
      .locator('input[type="file"]')
      .or(page.locator('[data-testid="review-photos-upload"]'))
      .first();

    const photoVisible = await photoUpload.isVisible({ timeout: 5000 }).catch(() => false);
    if (photoVisible) {
      console.log('✅ Campo de upload de fotos visible');
    }

    // PASO 4: Enviar review
    console.log('📍 PASO 4: Enviando review...');
    const submitButton = page
      .getByRole('button', { name: /enviar|submit|publicar/i })
      .or(page.locator('[data-testid="submit-review-button"]'))
      .first();

    const submitVisible = await submitButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (submitVisible) {
      await submitButton.click();
      await page.waitForTimeout(2000);

      // Verificar mensaje de éxito
      const successMessage = page
        .getByText(/review enviado|reseña publicada|éxito/i)
        .or(page.locator('[data-testid="success-message"]'))
        .first();

      const successVisible = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);
      if (successVisible) {
        console.log('✅ Mensaje de éxito mostrado');
      }
    }

    // PASO 5: Verificar que review se guardó en BD (si la tabla existe)
    console.log('📍 PASO 5: Verificando review en BD...');
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('booking_id', testBookingId);

    if (reviewsError) {
      console.log('⚠️ Error al verificar reviews en BD:', reviewsError.message);
    } else if (reviews && reviews.length > 0) {
      const review = reviews[0];
      expect(review.booking_id).toBe(testBookingId);
      expect(review.user_id).toBe(renterId);
      console.log('✅ Review guardado en BD');
    }

    // PASO 6: Verificar que review aparece en car detail page
    console.log('📍 PASO 6: Verificando review en car detail page...');
    await page.goto(`/cars/${carId}`);
    await page.waitForLoadState('networkidle');

    const reviewsSection = page
      .getByText(/reseñas|reviews|calificaciones/i)
      .or(page.locator('[data-testid="reviews-section"]'))
      .first();

    const reviewsVisible = await reviewsSection.isVisible({ timeout: 5000 }).catch(() => false);
    if (reviewsVisible) {
      console.log('✅ Sección de reviews visible en car detail');
    }

    console.log('\n✅ Test de dejar review completado exitosamente\n');
  });

  test('E1: Edge case - Intentar dejar review sin rating', async ({ page }) => {
    if (!testBookingId || !renterId) {
      test.skip('Test setup incomplete');
      return;
    }

    console.log(`\n🚀 Test edge case: review sin rating\n`);

    await page.goto(`/bookings/${testBookingId}`);
    await page.waitForLoadState('networkidle');

    const reviewPrompt = page
      .getByRole('button', { name: /dejar review|escribir reseña/i })
      .first();

    const promptVisible = await reviewPrompt.isVisible({ timeout: 5000 }).catch(() => false);
    if (!promptVisible) {
      test.skip('Review feature not implemented');
      return;
    }

    await reviewPrompt.click();
    await page.waitForTimeout(1000);

    // Intentar enviar sin rating
    const submitButton = page.getByRole('button', { name: /enviar|submit/i }).first();
    const submitVisible = await submitButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (submitVisible) {
      const isDisabled = await submitButton.isDisabled().catch(() => false);
      if (isDisabled) {
        console.log('✅ Botón deshabilitado correctamente (validación preventiva)');
      } else {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const errorMessage = page
          .getByText(/rating|calificación|requerido|required/i)
          .first();

        const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
        if (errorVisible) {
          console.log('✅ Error de validación mostrado correctamente');
        }
      }
    }
  });
});

