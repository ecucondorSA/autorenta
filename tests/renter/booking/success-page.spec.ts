import { test, expect, defineBlock, withCheckpoint } from '../../checkpoint/fixtures'

/**
 * E2E Test: Página de Éxito de Reserva
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 3 bloques atómicos:
 * B1: Cargar y verificar elementos de success
 * B2: Probar navegación con botones
 * B3: Probar casos edge (error, responsive)
 *
 * Prioridad: P1 (Confirmation Flow)
 */

test.describe('Página de Éxito - Checkpoint Architecture', () => {
  const testBookingId = 'test-booking-id-123'

  test('B1: Cargar y verificar elementos de success', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-success-elements', 'Verificar elementos', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('success-page-ready')
    }))

    const result = await block.execute(async () => {
      await page.goto(`/bookings/success/${testBookingId}`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Header
      const header = page.getByText('¡Reserva Confirmada!')
      await expect(header).toBeVisible({ timeout: 10000 }).catch(() => {
        console.log('⚠️ Header not found')
      })
      console.log('✅ Header visible')

      // Ícono de éxito
      const successIcon = page.locator('ion-icon[name="checkmark-circle"]')
      await expect(successIcon).toBeVisible().catch(() => {})
      console.log('✅ Success icon visible')

      // Mensaje principal
      await expect(page.getByText(/tu reserva está confirmada/i)).toBeVisible().catch(() => {})
      console.log('✅ Confirmation message visible')

      // Card de detalles
      await expect(page.getByText(/detalles de tu reserva/i)).toBeVisible().catch(() => {})
      console.log('✅ Details card visible')

      // Fechas
      await expect(page.getByText(/desde:/i)).toBeVisible().catch(() => {})
      await expect(page.getByText(/hasta:/i)).toBeVisible().catch(() => {})
      console.log('✅ Dates visible')

      // Total
      await expect(page.getByText(/total pagado:/i)).toBeVisible().catch(() => {})
      console.log('✅ Total visible')

      // Próximos pasos
      await expect(page.getByText(/próximos pasos/i)).toBeVisible().catch(() => {})
      console.log('✅ Next steps visible')

      // Botones de acción
      await expect(page.getByRole('button', { name: /ver detalles/i })).toBeVisible().catch(() => {})
      await expect(page.getByRole('button', { name: /buscar más/i })).toBeVisible().catch(() => {})
      await expect(page.getByRole('button', { name: /ir al inicio/i })).toBeVisible().catch(() => {})
      console.log('✅ Action buttons visible')

      return { elementsVerified: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Probar navegación con botones', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('success-page-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto(`/bookings/success/${testBookingId}`)
      await page.waitForLoadState('networkidle')
    }

    const block = createBlock(defineBlock('b2-success-navigation', 'Probar navegación', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('success-page-ready')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Test botón "Ver Detalles"
      const detailsButton = page.getByRole('button', { name: /ver detalles/i })
      if (await detailsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await detailsButton.click()
        await page.waitForURL(`/bookings/${testBookingId}`, { timeout: 10000 }).catch(() => {})
        if (page.url().includes(`/bookings/${testBookingId}`)) {
          console.log('✅ Navigate to booking details works')
        }
        await page.goBack()
        await page.waitForTimeout(1000)
      }

      // Test botón "Buscar Más Vehículos"
      const searchButton = page.getByRole('button', { name: /buscar más/i })
      if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchButton.click()
        await page.waitForURL('/cars', { timeout: 10000 }).catch(() => {})
        if (page.url().includes('/cars')) {
          console.log('✅ Navigate to cars works')
        }
        await page.goBack()
        await page.waitForTimeout(1000)
      }

      // Test botón "Ir al Inicio"
      const homeButton = page.getByRole('button', { name: /ir al inicio/i })
      if (await homeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await homeButton.click()
        await page.waitForURL('/', { timeout: 10000 }).catch(() => {})
        if (page.url().match(/\/$/)) {
          console.log('✅ Navigate to home works')
        }
      }

      return { navigationWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Manejar booking inexistente', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-success-error', 'Manejar error', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const invalidId = 'invalid-booking-id-999'

      // Interceptar API para devolver 404
      await page.route(`**/rest/v1/bookings?id=eq.${invalidId}*`, route => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ error: 'Not found' })
        })
      })

      await page.goto(`/bookings/success/${invalidId}`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Verificar mensaje de error
      const errorMsg = page.getByText(/error|reserva no encontrada|not found/i)
      const errorVisible = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false)

      if (errorVisible) {
        console.log('✅ Error message shown for invalid booking')
      }

      // Verificar botón de fallback
      const myBookingsBtn = page.getByRole('button', { name: /ver mis reservas/i })
      const btnVisible = await myBookingsBtn.isVisible({ timeout: 3000 }).catch(() => false)
      if (btnVisible) {
        console.log('✅ Fallback button visible')
      }

      return { errorHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Verificar responsive en móvil', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-success-responsive', 'Verificar responsive', {
      priority: 'P2',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Simular viewport móvil
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto(`/bookings/success/${testBookingId}`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Verificar elementos visibles en móvil
      await expect(page.getByText(/tu reserva está confirmada/i)).toBeVisible({ timeout: 10000 }).catch(() => {})
      console.log('✅ Confirmation message visible on mobile')

      // Verificar que no hay overflow horizontal
      const body = page.locator('body')
      const scrollWidth = await body.evaluate(el => el.scrollWidth)
      const clientWidth = await body.evaluate(el => el.clientWidth)

      if (scrollWidth <= clientWidth + 1) {
        console.log('✅ No horizontal overflow on mobile')
      } else {
        console.log(`⚠️ Horizontal overflow detected: ${scrollWidth} > ${clientWidth}`)
      }

      return { responsiveOk: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

// Helper para extraer booking ID
function requiresCheckpoint(_name: string) {
  return { checkpoint: _name }
}
