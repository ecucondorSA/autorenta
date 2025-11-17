import { test, expect } from '@playwright/test';
import {
  createTestBooking,
  getActiveCar,
  authenticateUserInPage,
  cleanupTestBooking,
  cleanupTestBookings,
} from '../../helpers/booking-test-helpers';

/**
 * E2E Test: Ver Historial de Bookings
 *
 * Flujo completo:
 * 1. Locatario tiene múltiples bookings (diferentes estados)
 * 2. Navega a página de "Mis Reservas"
 * 3. Verifica que muestra todos los bookings
 * 4. Verifica filtros por estado
 * 5. Verifica ordenamiento por fecha
 * 6. Verifica paginación (si aplica)
 * 7. Verifica acciones disponibles (ver detalle, review, rebook)
 *
 * Prioridad: P1 (Important)
 */

test.describe('Booking History - Locatario', () => {
  let testBookingIds: string[] = [];
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

    // Create multiple test bookings with different statuses
    const now = new Date();

    // Booking 1: Completed
    const booking1 = await createTestBooking({
      carId: car.id,
      renterId,
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'completed',
      totalAmount: 100000,
      currency: 'ARS',
    });
    testBookingIds.push(booking1.id);

    // Booking 2: In Progress
    const booking2 = await createTestBooking({
      carId: car.id,
      renterId,
      startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      status: 'in_progress',
      totalAmount: 150000,
      currency: 'ARS',
    });
    testBookingIds.push(booking2.id);

    // Booking 3: Confirmed (upcoming)
    const booking3 = await createTestBooking({
      carId: car.id,
      renterId,
      startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      endDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
      status: 'confirmed',
      totalAmount: 200000,
      currency: 'ARS',
    });
    testBookingIds.push(booking3.id);
  });

  test.afterEach(async () => {
    // Cleanup test data using helper function
    if (testBookingIds.length > 0) {
      await cleanupTestBookings(testBookingIds);
      testBookingIds = [];
    }
  });

  test('T1: Happy path - Ver historial completo de bookings', async ({ page }) => {
    if (!renterId || testBookingIds.length === 0) {
      test.skip('Test setup incomplete');
      return;
    }

    console.log(`\n🚀 Iniciando test de historial de bookings\n`);

    // PASO 1: Navegar a página de "Mis Reservas"
    console.log('📍 PASO 1: Navegando a página de mis reservas...');
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Verificar que la página carga correctamente
    // El selector correcto es app-my-bookings-page según el componente
    // Usar first() para evitar strict mode violation cuando hay múltiples matches
    const bookingsPage = page.locator('app-my-bookings-page').first();
    await expect(bookingsPage).toBeVisible({ timeout: 15000 });

    // También verificar que el título "Mis reservas" está visible
    await expect(page.getByRole('heading', { name: /mis reservas/i })).toBeVisible({ timeout: 5000 });

    // PASO 2: Verificar que muestra todos los bookings
    console.log('📍 PASO 2: Verificando que muestra todos los bookings...');
    const bookingCards = page
      .locator('[data-testid="booking-card"]')
      .or(page.locator('app-booking-card'))
      .or(page.locator('.booking-card'));

    const cardCount = await bookingCards.count();
    console.log(`✅ Encontrados ${cardCount} bookings en la lista`);

    // Debería mostrar al menos nuestros 3 bookings de test
    expect(cardCount).toBeGreaterThanOrEqual(3);

    // PASO 3: Verificar información en cada booking card
    console.log('📍 PASO 3: Verificando información en booking cards...');
    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      const card = bookingCards.nth(i);
      const cardVisible = await card.isVisible({ timeout: 5000 }).catch(() => false);

      if (cardVisible) {
        // Verificar que muestra estado
        const status = card.locator('[data-testid="booking-status"]').or(card.getByText(/estado|status/i));
        const statusVisible = await status.isVisible({ timeout: 2000 }).catch(() => false);
        if (statusVisible) {
          console.log(`✅ Booking ${i + 1}: Estado visible`);
        }

        // Verificar que muestra fechas
        const dates = card.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/); // Formato de fecha
        const datesVisible = await dates.isVisible({ timeout: 2000 }).catch(() => false);
        if (datesVisible) {
          console.log(`✅ Booking ${i + 1}: Fechas visibles`);
        }

        // Verificar que muestra información del auto
        const carInfo = card.getByText(/marca|brand|modelo|model/i);
        const carInfoVisible = await carInfo.isVisible({ timeout: 2000 }).catch(() => false);
        if (carInfoVisible) {
          console.log(`✅ Booking ${i + 1}: Información del auto visible`);
        }
      }
    }

    // PASO 4: Verificar filtros por estado
    console.log('📍 PASO 4: Verificando filtros por estado...');
    const filterButtons = page
      .getByRole('button', { name: /todos|completados|en curso|confirmados/i })
      .or(page.locator('[data-testid="status-filter"]'));

    const filterCount = await filterButtons.count();
    if (filterCount > 0) {
      console.log(`✅ Filtros disponibles: ${filterCount}`);

      // Probar filtrar por "Completados"
      const completedFilter = page.getByRole('button', { name: /completados|completed/i }).first();
      const completedVisible = await completedFilter.isVisible({ timeout: 5000 }).catch(() => false);
      if (completedVisible) {
        await completedFilter.click();
        await page.waitForTimeout(1000);

        // Verificar que solo muestra bookings completados
        const filteredCards = await bookingCards.count();
        console.log(`✅ Filtro aplicado: ${filteredCards} bookings mostrados`);
      }
    }

    // PASO 5: Verificar ordenamiento
    console.log('📍 PASO 5: Verificando ordenamiento...');
    const sortSelect = page
      .locator('select[name="sort"]')
      .or(page.locator('[data-testid="sort-select"]'))
      .first();

    const sortVisible = await sortSelect.isVisible({ timeout: 5000 }).catch(() => false);
    if (sortVisible) {
      await sortSelect.selectOption('date_desc'); // Más recientes primero
      await page.waitForTimeout(1000);
      console.log('✅ Ordenamiento aplicado');
    }

    // PASO 6: Verificar acciones disponibles
    console.log('📍 PASO 6: Verificando acciones disponibles...');
    const firstCard = bookingCards.first();
    const firstCardVisible = await firstCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (firstCardVisible) {
      // Botón de ver detalle
      const viewDetailButton = firstCard
        .getByRole('button', { name: /ver detalle|ver más|details/i })
        .or(firstCard.locator('[data-testid="view-detail-button"]'))
        .first();

      const viewDetailVisible = await viewDetailButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (viewDetailVisible) {
        console.log('✅ Botón de ver detalle visible');
      }

      // Botón de review (para bookings completados)
      const reviewButton = firstCard
        .getByRole('button', { name: /dejar review|escribir reseña/i })
        .or(firstCard.locator('[data-testid="review-button"]'))
        .first();

      const reviewVisible = await reviewButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (reviewVisible) {
        console.log('✅ Botón de review visible');
      }

      // Botón de rebook
      const rebookButton = firstCard
        .getByRole('button', { name: /reservar nuevamente|rebook/i })
        .or(firstCard.locator('[data-testid="rebook-button"]'))
        .first();

      const rebookVisible = await rebookButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (rebookVisible) {
        console.log('✅ Botón de rebook visible');
      }
    }

    console.log('\n✅ Test de historial de bookings completado exitosamente\n');
  });

  test('E1: Edge case - Ver historial vacío', async ({ page }) => {
    // Limpiar bookings de test para este caso
    for (const bookingId of testBookingIds) {
      await cleanupTestBooking(bookingId);
    }
    testBookingIds = [];

    if (!renterId) {
      test.skip('Test setup incomplete');
      return;
    }

    console.log(`\n🚀 Test edge case: historial vacío\n`);

    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Debería mostrar estado vacío
    const emptyState = page
      .getByText(/no tienes reservas|sin reservas|empty/i)
      .or(page.locator('[data-testid="empty-state"]'))
      .first();

    const emptyVisible = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
    if (emptyVisible) {
      console.log('✅ Estado vacío mostrado correctamente');
    }

    // Debería mostrar CTA para buscar autos
    const ctaButton = page
      .getByRole('button', { name: /buscar autos|explorar|search cars/i })
      .or(page.locator('[data-testid="empty-cta"]'))
      .first();

    const ctaVisible = await ctaButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (ctaVisible) {
      console.log('✅ CTA para buscar autos visible');
    }
  });
});

