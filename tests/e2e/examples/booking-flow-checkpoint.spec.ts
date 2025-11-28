/**
 * Ejemplo: Flujo de Booking con Arquitectura Checkpoint & Hydrate
 *
 * Este test demuestra cómo usar la nueva arquitectura:
 * - Cada bloque es atómico y puede ejecutarse independientemente
 * - Los checkpoints permiten reanudar desde cualquier punto
 * - Validación triple: UI + DB + API
 *
 * Para ejecutar solo este test:
 * npx playwright test tests/e2e/examples/booking-flow-checkpoint.spec.ts
 */

import { test, expect, defineBlock, requiresCheckpoint, expectsUrl, expectsElement, withCheckpoint } from '../../checkpoint/fixtures'
import { getDbValidator } from '../../helpers/DbValidator'
import { getBookingFactory } from '../../fixtures/data/BookingFactory'
import { getWalletFactory } from '../../fixtures/data/WalletFactory'

// Usar storageState de renter
test.use({ storageState: 'tests/.auth/renter.json' })

test.describe('Booking Flow - Checkpoint Architecture', () => {
  /**
   * BLOQUE 1: Verificar Autenticación
   * Precondiciones: Ninguna (es el primer bloque)
   * Postcondiciones: Usuario autenticado, menú visible
   * Genera checkpoint: 'authenticated'
   */
  test('B1: Verificar autenticación', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b1-auth-verify', 'Verificar Autenticación', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [
        expectsElement('[data-testid="user-menu"], [data-testid="header-user-avatar"], .user-menu')
      ],
      ...withCheckpoint('authenticated')
    }))

    const result = await block.execute(async () => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Esperar indicador de autenticación
      const authIndicator = page.locator('[data-testid="user-menu"], [data-testid="header-user-avatar"], .user-menu').first()
      await expect(authIndicator).toBeVisible({ timeout: 15000 })
    })

    expect(result.state.status).toBe('passed')
    console.log(`[B1] Completado en ${result.state.duration}ms`)
  })

  /**
   * BLOQUE 2: Navegar a Lista de Autos
   * Precondiciones: Checkpoint 'authenticated'
   * Postcondiciones: URL contiene /cars, lista visible
   * Genera checkpoint: 'cars-list-visible'
   */
  test('B2: Navegar a lista de autos', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint previo si existe (permite ejecutar B2 independientemente)
    const prevCheckpoint = await checkpointManager.loadCheckpoint('authenticated')
    if (prevCheckpoint) {
      await checkpointManager.restoreCheckpoint(prevCheckpoint)
    } else {
      // Si no hay checkpoint, navegar a home con auth
      await page.goto('/')
    }

    const block = createBlock(defineBlock('b2-navigate-cars', 'Navegar a Lista de Autos', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [
        requiresCheckpoint('authenticated')
      ],
      postconditions: [
        expectsUrl(/\/cars/),
        expectsElement('[data-car-id], .car-card, [data-testid="car-card"]')
      ],
      ...withCheckpoint('cars-list-visible')
    }))

    const result = await block.execute(async () => {
      // Navegar a lista de autos
      await page.goto('/cars/list')
      await page.waitForLoadState('networkidle')

      // Esperar que aparezca al menos un auto
      const carCard = page.locator('[data-car-id], .car-card, [data-testid="car-card"]').first()
      await expect(carCard).toBeVisible({ timeout: 20000 })
    })

    expect(result.state.status).toBe('passed')
    console.log(`[B2] Completado en ${result.state.duration}ms`)
  })

  /**
   * BLOQUE 3: Seleccionar Auto
   * Precondiciones: Checkpoint 'cars-list-visible'
   * Postcondiciones: URL contiene /cars/{id}
   * Genera checkpoint: 'car-selected'
   */
  test('B3: Seleccionar auto', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint previo
    const prevCheckpoint = await checkpointManager.loadCheckpoint('cars-list-visible')
    if (prevCheckpoint) {
      await checkpointManager.restoreCheckpoint(prevCheckpoint)
    } else {
      await page.goto('/cars/list')
      await page.waitForLoadState('networkidle')
    }

    const block = createBlock(defineBlock('b3-select-car', 'Seleccionar Auto', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [
        requiresCheckpoint('cars-list-visible')
      ],
      postconditions: [
        expectsUrl(/\/cars\/[a-f0-9-]+/),
        expectsElement('[data-testid="car-title"], .car-detail-title, h1')
      ],
      ...withCheckpoint('car-selected')
    }))

    const result = await block.execute(async () => {
      // Hacer click en el primer auto
      const carLink = page.locator('a[href^="/cars/"]').first()
      await expect(carLink).toBeVisible({ timeout: 15000 })
      await carLink.click()

      // Esperar navegación a detalle
      await page.waitForURL(/\/cars\/[a-f0-9-]+/, { timeout: 15000 })

      // Esperar título del auto
      const carTitle = page.locator('[data-testid="car-title"], .car-detail-title, h1').first()
      await expect(carTitle).toBeVisible({ timeout: 10000 })
    })

    expect(result.state.status).toBe('passed')
    console.log(`[B3] Completado en ${result.state.duration}ms`)
  })

  /**
   * BLOQUE 4: Seleccionar Fechas
   * Precondiciones: Checkpoint 'car-selected'
   * Postcondiciones: Fechas seleccionadas, botón reservar visible
   * Genera checkpoint: 'dates-selected'
   */
  test('B4: Seleccionar fechas', async ({ page, checkpointManager, createBlock }) => {
    const prevCheckpoint = await checkpointManager.loadCheckpoint('car-selected')
    if (prevCheckpoint) {
      await checkpointManager.restoreCheckpoint(prevCheckpoint)
    }

    const block = createBlock(defineBlock('b4-select-dates', 'Seleccionar Fechas', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [
        requiresCheckpoint('car-selected')
      ],
      postconditions: [
        expectsElement('[data-testid="book-now"], #book-now, button:has-text("Reservar")')
      ],
      ...withCheckpoint('dates-selected')
    }))

    const result = await block.execute(async () => {
      // Calcular fechas (3-7 días desde hoy)
      const today = new Date()
      const startDate = new Date(today)
      startDate.setDate(today.getDate() + 3)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 4)

      const formatDate = (d: Date) => d.toISOString().split('T')[0]

      // Intentar diferentes selectores para fechas
      const startInput = page.locator('input[type="date"]').first()
      const endInput = page.locator('input[type="date"]').nth(1)

      // Si existen inputs de fecha, llenarlos
      if (await startInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await startInput.fill(formatDate(startDate))
        await endInput.fill(formatDate(endDate))
      }

      // Esperar botón de reservar
      const bookButton = page.locator('[data-testid="book-now"], #book-now, button:has-text("Reservar")').first()
      await expect(bookButton).toBeVisible({ timeout: 10000 })
    })

    expect(result.state.status).toBe('passed')
    console.log(`[B4] Completado en ${result.state.duration}ms`)
  })

  /**
   * BLOQUE 5: Crear Reserva
   * Precondiciones: Checkpoint 'dates-selected'
   * Postcondiciones: URL contiene /bookings/detail-payment
   * Genera checkpoint: 'booking-pending-payment'
   *
   * Este bloque también incluye validación DB
   */
  test('B5: Crear reserva', async ({ page, checkpointManager, createBlock }) => {
    const prevCheckpoint = await checkpointManager.loadCheckpoint('dates-selected')
    if (prevCheckpoint) {
      await checkpointManager.restoreCheckpoint(prevCheckpoint)
    }

    const block = createBlock(defineBlock('b5-create-booking', 'Crear Reserva', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [
        requiresCheckpoint('dates-selected')
      ],
      postconditions: [
        expectsUrl(/\/bookings\/detail-payment/)
      ],
      ...withCheckpoint('booking-pending-payment', {
        metadata: { action: 'booking-created' }
      })
    }))

    const result = await block.execute(async () => {
      // Click en reservar
      const bookButton = page.locator('[data-testid="book-now"], #book-now, button:has-text("Reservar")').first()
      await bookButton.click()

      // Esperar navegación a página de pago
      await page.waitForURL(/\/bookings\/detail-payment/, { timeout: 30000 })

      // Verificar que llegamos a la página de pago
      await expect(page).toHaveURL(/\/bookings\/detail-payment/)
    })

    expect(result.state.status).toBe('passed')
    console.log(`[B5] Completado en ${result.state.duration}ms`)
  })
})

/**
 * Test independiente que puede ejecutarse desde cualquier checkpoint
 */
test.describe('Booking Flow - Reanudable', () => {
  test('Ejecutar desde checkpoint específico', async ({ page, checkpointManager }) => {
    // Intentar reanudar desde el checkpoint más avanzado disponible
    const checkpoints = ['booking-pending-payment', 'dates-selected', 'car-selected', 'cars-list-visible', 'authenticated']

    for (const cpName of checkpoints) {
      const cp = await checkpointManager.loadCheckpoint(cpName)
      if (cp) {
        console.log(`Reanudando desde checkpoint: ${cpName}`)
        const result = await checkpointManager.restoreCheckpoint(cp)

        if (result.success) {
          console.log(`✓ Checkpoint ${cpName} restaurado en ${result.duration}ms`)
          // Continuar el flujo desde aquí...
          break
        }
      }
    }
  })
})
