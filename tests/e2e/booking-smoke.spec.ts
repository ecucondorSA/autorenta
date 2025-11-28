import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'
import { SEED_USERS } from '../helpers/test-data'

/**
 * E2E Test: Booking Smoke
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 1 bloque atómico:
 * B1: Renter abre detalle de auto y ve CTA reservar
 *
 * Priority: P0 (Smoke Critical)
 */

const FALLBACK_RENTER = {
  email: 'test-renter@autorenta.com',
  password: 'TestPassword123!',
}

test.describe('Booking smoke - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    const profileLink = page.locator('a[href="/profile"], [data-testid="user-menu"]')
    if (await profileLink.first().isVisible({ timeout: 1500 }).catch(() => false)) return

    await page.goto('/auth/login')
    await page.waitForLoadState('domcontentloaded')

    await page
      .getByRole('textbox', { name: /email|correo/i })
      .fill(SEED_USERS?.renter?.email ?? FALLBACK_RENTER.email)
    await page
      .getByRole('textbox', { name: /contraseña|password/i })
      .fill(SEED_USERS?.renter?.password ?? FALLBACK_RENTER.password)

    await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click()
    await page.waitForURL(/(cars|wallet|profile|bookings)/, { timeout: 15000 })
  })

  test('B1: Renter abre detalle y ve reservar CTA', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-booking-smoke-reserve-cta', 'Reservar CTA visible', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('booking-smoke-ready')
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars')
      await page.waitForLoadState('domcontentloaded')

      const carCard = page.locator('[data-car-id], app-car-card, [data-testid="car-card"]').first()
      await expect(carCard).toBeVisible({ timeout: 20000 })

      await carCard.click()
      await page.waitForURL(/\/cars\/.+/, { timeout: 15000 })
      await page.waitForLoadState('domcontentloaded')

      const reserveButton = page.getByRole('button', { name: /reservar|solicitar|booking|confirmar/i }).first()
      await expect(reserveButton).toBeVisible({ timeout: 10000 })
      console.log('✅ Botón reservar visible')

      return { reserveButtonVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
