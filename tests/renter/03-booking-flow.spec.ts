import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../checkpoint/fixtures'

/**
 * Renter Booking Flow Test
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 2 bloques atómicos:
 * B1: Navegar a detalle y abrir wizard
 * B2: Completar wizard de reserva
 *
 * Prioridad: P0 (Critical Flow)
 */

test.use({ storageState: 'tests/.auth/renter.json' })

test.describe('Renter Booking Flow - Checkpoint Architecture', () => {

  test('B1: Navegar a detalle y abrir wizard', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-booking-detail', 'Navegar a detalle de auto', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('booking-wizard-open')
    }))

    const result = await block.execute(async () => {
      // Navegar a detalle de auto
      await page.goto('/cars/e2e-car-economy-000-000000000001')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Verificar que estamos en la página correcta
      await expect(page.locator('h1')).toContainText('Toyota Corolla')
      console.log('✅ Car detail page loaded')

      // Click en Reservar
      const reserveButton = page.getByRole('button', { name: 'Reservar' })
      await expect(reserveButton).toBeVisible({ timeout: 10000 })
      await reserveButton.click()
      console.log('✅ Reserve button clicked')

      return { detailLoaded: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Completar wizard de reserva', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint
    const prev = await checkpointManager.loadCheckpoint('booking-wizard-open')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/cars/e2e-car-economy-000-000000000001')
      await page.waitForTimeout(2000)
      await page.getByRole('button', { name: 'Reservar' }).click()
    }

    const block = createBlock(defineBlock('b2-booking-wizard', 'Completar wizard', {
      priority: 'P0',
      estimatedDuration: 60000,
      preconditions: [requiresCheckpoint('booking-wizard-open')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Step 1: Dates
      const datesStep = page.locator('app-booking-dates-step')
      if (await datesStep.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ Step 1: Dates')
        await page.getByRole('button', { name: 'Siguiente' }).click()
        await page.waitForTimeout(1000)
      }

      // Step 2: Insurance
      const insuranceStep = page.locator('app-booking-insurance-step')
      if (await insuranceStep.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ Step 2: Insurance')
        await page.getByRole('button', { name: 'Siguiente' }).click()
        await page.waitForTimeout(1000)
      }

      // Step 3: Extras
      const extrasStep = page.locator('app-booking-extras-step')
      if (await extrasStep.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ Step 3: Extras')
        await page.getByRole('button', { name: 'Siguiente' }).click()
        await page.waitForTimeout(1000)
      }

      // Step 4: Driver
      const driverStep = page.locator('app-booking-driver-step')
      if (await driverStep.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ Step 4: Driver')
        await page.getByRole('button', { name: 'Siguiente' }).click()
        await page.waitForTimeout(1000)
      }

      // Step 5: Payment
      const paymentStep = page.locator('app-booking-payment-step')
      if (await paymentStep.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ Step 5: Payment')
        // Seleccionar Wallet si disponible
        const walletOption = page.locator('ion-radio', { hasText: 'Wallet AutoRenta' })
        if (await walletOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await walletOption.click()
        }
        await page.getByRole('button', { name: 'Siguiente' }).click()
        await page.waitForTimeout(1000)
      }

      // Step 6: Review
      const reviewStep = page.locator('app-booking-review-step')
      if (await reviewStep.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ Step 6: Review')
        await page.getByRole('button', { name: 'Confirmar Reserva' }).click()
        await page.waitForTimeout(3000)
      }

      // Verificar éxito
      await expect(page).toHaveURL(/.*\/bookings\/.*/, { timeout: 15000 })
      const successMessage = page.locator('text=Reserva confirmada')
      const isSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false)

      if (isSuccess) {
        console.log('✅ Booking confirmed successfully!')
      }

      return { bookingConfirmed: isSuccess }
    })

    expect(result.state.status).toBe('passed')
  })
})
