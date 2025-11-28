import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'
import type { Page } from '@playwright/test'

/**
 * E2E Test Suite: Booking Flow - Wallet Payment
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Generated from PRD: docs/prd/booking-flow-locatario.md
 * Priority: P0 (Critical - Core Business Flow)
 *
 * Flujo en 5 bloques atómicos:
 * B1: Happy path - Booking completo con wallet
 * B2: Saldo insuficiente
 * B3: Reservar propio auto (edge case)
 * B4: Cálculo dinámico de precios
 * B5: Ver detalles de reserva
 *
 * Prerequisites:
 * - User authenticated with role "locatario" or "ambos"
 * - User has wallet balance >$20,000
 * - At least one active car published by different user
 */

const TEST_CONFIG = {
  CAR_MIN_PRICE: 5000,
  WALLET_BALANCE: 25000,
  BOOKING_DAYS: 3,
  EXPECTED_TOTAL: 18500
}

test.describe('Booking Flow - Wallet Payment (Locatario) - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('app-splash-loader')
      .waitFor({ state: 'detached', timeout: 10000 })
      .catch(() => {})
  })

  test('B1: Booking completo con wallet payment', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-booking-wallet-success', 'Booking wallet exitoso', {
      priority: 'P0',
      estimatedDuration: 60000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('booking-wallet-complete')
    }))

    const result = await block.execute(async () => {
      // Step 1: Browse cars
      await expect(page).toHaveURL(/\/(cars)?$/)
      const map = page.locator('#map, .mapboxgl-map').first()
      await expect(map).toBeVisible({ timeout: 10000 })

      // Step 2: Select car
      const carCard = page.locator('[data-testid="car-card"]').first()
      const carMarker = page.locator('.mapboxgl-marker').first()

      if (await carCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await carCard.click()
      } else if (await carMarker.isVisible({ timeout: 5000 }).catch(() => false)) {
        await carMarker.click()
      } else {
        throw new Error('No cars available to select')
      }

      await page.waitForURL(/\/cars\/[a-z0-9-]+$/, { timeout: 10000 })

      // Step 3: Click Reservar
      const reserveButton = page.getByRole('button', { name: /reservar/i })
      await expect(reserveButton).toBeVisible({ timeout: 5000 })
      await reserveButton.click()

      // Step 4: Select dates
      const datePicker = page.locator('[data-testid="date-picker"], ion-modal').first()
      await expect(datePicker).toBeVisible({ timeout: 5000 })

      const confirmDatesButton = page.getByRole('button', { name: /continuar|confirmar/i })
      await confirmDatesButton.click()

      // Step 5: Verify price breakdown
      await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 10000 })
      const priceBreakdown = page.locator('[data-testid="price-breakdown"]')
      await expect(priceBreakdown).toBeVisible({ timeout: 5000 })

      const totalPrice = page.locator('[data-testid="total-price"]')
      const totalText = await totalPrice.textContent()
      expect(totalText).toMatch(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/)

      // Step 6: Select wallet payment
      const walletPaymentOption = page.locator('input[type="radio"][value="wallet"]')
      await walletPaymentOption.check()

      const walletBalance = page.locator('[data-testid="wallet-balance"]')
      await expect(walletBalance).toBeVisible()

      // Step 7: Confirm payment
      const payButton = page.getByRole('button', { name: /pagar/i })
      await expect(payButton).toBeEnabled()
      await payButton.click()

      // Step 8: Wait for confirmation
      await page.waitForURL(/\/bookings\/[a-z0-9-]+$/, { timeout: 15000 })

      const successMessage = page.locator('[role="alert"], .success-toast')
      await expect(successMessage).toContainText(/confirmada|exitosa/i, { timeout: 5000 })

      const statusBadge = page.locator('[data-testid="booking-status"]')
      await expect(statusBadge).toContainText(/confirmada/i)

      // Step 9: Verify in Mis Reservas
      await page.goto('/bookings')
      await page.waitForLoadState('networkidle')

      const bookingList = page.locator('[data-testid="booking-card"]').first()
      await expect(bookingList).toBeVisible({ timeout: 5000 })
      await expect(bookingList).toContainText(/confirmada/i)
      console.log('✅ Booking con wallet completado')

      return { bookingCompleted: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Error por saldo insuficiente', async ({ page, createBlock }) => {
    test.skip(!process.env.TEST_LOW_BALANCE_USER, 'Requires low balance test user')

    const block = createBlock(defineBlock('b2-booking-insufficient-balance', 'Saldo insuficiente', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const walletPaymentOption = page.locator('input[type="radio"][value="wallet"]')
      await walletPaymentOption.check()

      const errorMessage = page.locator('[role="alert"]')
      await expect(errorMessage).toContainText(/saldo insuficiente/i)

      const payButton = page.getByRole('button', { name: /pagar/i })
      await expect(payButton).toBeDisabled()

      const depositButton = page.getByRole('button', { name: /depositar/i })
      await expect(depositButton).toBeVisible()
      console.log('✅ Error de saldo insuficiente mostrado')

      return { insufficientBalanceShown: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Prevenir reserva de propio auto', async ({ page, createBlock }) => {
    test.skip(!process.env.TEST_CAR_OWNER_USER, 'Requires car owner test user')

    const block = createBlock(defineBlock('b3-booking-own-car-blocked', 'Bloquear reserva propia', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const reserveButton = page.getByRole('button', { name: /reservar/i })

      const buttonExists = await reserveButton.count()
      if (buttonExists > 0) {
        await expect(reserveButton).toBeDisabled()
      }

      await page.goto('/bookings/create?car_id=own-car-id')

      const errorMessage = page.locator('[role="alert"]')
      await expect(errorMessage).toContainText(/no puedes reservar tu propio auto/i)

      await expect(page).toHaveURL(/\/cars/)
      console.log('✅ Reserva de auto propio bloqueada')

      return { ownCarBlocked: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Cálculo dinámico de precios', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-booking-price-calculation', 'Cálculo de precios', {
      priority: 'P1',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars')

      const reserveButton = page.getByRole('button', { name: /reservar/i })
      await reserveButton.click()

      const totalPrice = page.locator('[data-testid="total-price"]')
      await expect(totalPrice).toContainText(/6[.,]500/)

      await expect(totalPrice).toContainText(/18[.,]500/)
      await expect(totalPrice).toContainText(/40[.,]500/)
      console.log('✅ Cálculo de precios verificado')

      return { priceCalculationWorking: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Ver detalles de reserva confirmada', async ({ page, createBlock }) => {
    test.skip(!process.env.TEST_EXISTING_BOOKING_ID, 'Requires existing booking')

    const block = createBlock(defineBlock('b5-booking-view-details', 'Ver detalles reserva', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const bookingId = process.env.TEST_EXISTING_BOOKING_ID

      await page.goto(`/bookings/${bookingId}`)
      await page.waitForLoadState('networkidle')

      const bookingDetail = page.locator('[data-testid="booking-detail"]')
      await expect(bookingDetail).toBeVisible()

      const statusBadge = page.locator('[data-testid="booking-status"]')
      await expect(statusBadge).toContainText(/confirmada/i)

      const carInfo = page.locator('[data-testid="car-info"]')
      await expect(carInfo).toBeVisible()

      const bookingDates = page.locator('[data-testid="booking-dates"]')
      await expect(bookingDates).toBeVisible()

      const contactButton = page.getByRole('button', { name: /contactar|mensaje/i })
      await expect(contactButton).toBeVisible()
      console.log('✅ Detalles de reserva visibles')

      return { detailsVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

async function selectDates(page: Page, startDate: Date, endDate: Date): Promise<void> {
  const startDateButton = page.locator(`[data-date="${startDate.toISOString().split('T')[0]}"]`)
  await startDateButton.click()

  const endDateButton = page.locator(`[data-date="${endDate.toISOString().split('T')[0]}"]`)
  await endDateButton.click()
}

function formatPrice(price: number): string {
  return price.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS'
  })
}
