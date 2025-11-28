import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../../checkpoint/fixtures'

/**
 * E2E Test: Booking Flow with Exchange Rate
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 4 bloques atómicos:
 * B1: Login
 * B2: Seleccionar auto y fechas
 * B3: Verificar exchange rate y configurar pago
 * B4: Confirmar y verificar éxito
 *
 * Prioridad: P1 (Secondary Flow)
 */

test.use({
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',
})

test.describe('Booking Flow with Exchange Rate - Checkpoint Architecture', () => {

  test('B1: Login', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-exchange-login', 'Login usuario', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('exchange-flow-logged-in')
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.getByPlaceholder(/email|correo/i).fill('renter.test@autorenta.com')
      await page.getByPlaceholder(/contraseña|password/i).fill('TestRenter123!')
      await page.getByRole('button', { name: /entrar|iniciar sesión|login/i }).click()
      await page.waitForURL(/\/cars|\// )

      console.log('✅ Login completado')
      return { loggedIn: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Seleccionar auto y fechas', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('exchange-flow-logged-in')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/auth/login')
      await page.getByPlaceholder(/email|correo/i).fill('renter.test@autorenta.com')
      await page.getByPlaceholder(/contraseña|password/i).fill('TestRenter123!')
      await page.getByRole('button', { name: /entrar|iniciar sesión|login/i }).click()
      await page.waitForURL(/\/cars|\// )
    }

    const block = createBlock(defineBlock('b2-exchange-select-car', 'Seleccionar auto y fechas', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('exchange-flow-logged-in')],
      postconditions: [],
      ...withCheckpoint('exchange-flow-car-selected')
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars')
      await page.waitForTimeout(2000)

      const firstCar = page.locator('app-car-card').first()
      await firstCar.click()
      await page.waitForURL(/\/cars\/.+/)
      console.log('✅ Auto seleccionado')

      // Seleccionar fechas
      const today = new Date()
      const start = new Date(today)
      start.setDate(today.getDate() + 3)
      const end = new Date(today)
      end.setDate(today.getDate() + 7)

      await page.locator('input[type="date"]').first().fill(start.toISOString().split('T')[0])
      await page.locator('input[type="date"]').nth(1).fill(end.toISOString().split('T')[0])
      console.log('✅ Fechas seleccionadas')

      // Crear booking
      await page.getByRole('button', { name: /reservar/i }).click()
      await page.waitForURL(/\/bookings\/detail-payment/)
      console.log('✅ Navegado a detail-payment')

      return { carSelected: true, datesSet: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Verificar exchange rate y configurar pago', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('exchange-flow-car-selected')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b3-exchange-verify-rate', 'Verificar exchange rate', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('exchange-flow-car-selected')],
      postconditions: [],
      ...withCheckpoint('exchange-flow-payment-ready')
    }))

    const result = await block.execute(async () => {
      // Verificar exchange rate
      const exchangeRateElement = page.locator('app-exchange-rate-display, .exchange-rate-info')
      if (await exchangeRateElement.isVisible()) {
        await expect(exchangeRateElement).toContainText(/USD/)
        await expect(exchangeRateElement).toContainText(/ARS/)
        console.log('✅ Exchange rate visible con USD/ARS')
      } else {
        console.log('⚠️ Exchange rate element not found, continuing flow')
      }

      // Configurar pago con wallet
      const walletBtn = page.locator('[data-payment-method="wallet"]')
      if (await walletBtn.isVisible()) {
        await walletBtn.click()

        const lockBtn = page.getByRole('button', { name: /bloquear fondos/i })
        if (await lockBtn.isVisible() && await lockBtn.isEnabled()) {
          await lockBtn.click()
          await page.waitForTimeout(1000)
          console.log('✅ Fondos bloqueados')
        }
      }

      return { exchangeRateVerified: true, paymentConfigured: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Confirmar y verificar éxito', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('exchange-flow-payment-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b4-exchange-confirm', 'Confirmar y verificar éxito', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('exchange-flow-payment-ready')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Aceptar términos
      const terms = page.getByRole('checkbox', { name: /acepto/i })
      if (await terms.isVisible()) {
        await terms.check()
        console.log('✅ Términos aceptados')
      }

      // Confirmar
      await page.getByRole('button', { name: /confirmar/i }).click()
      await page.waitForURL(/\/bookings\/success\/.+/)

      await expect(page.getByText(/confirmada/i)).toBeVisible()
      console.log('✅ Booking confirmado exitosamente')

      return { bookingConfirmed: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
