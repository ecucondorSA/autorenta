import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: Payment Flow Smoke Tests
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 9 bloques atómicos:
 * B1: Verificar carga de booking-payment page
 * B2: Verificar carga de booking-pending page
 * B3: Validar fondos en payment-method-buttons
 * B4: Verificar carga de MercadoPago SDK
 * B5: Verificar navegación entre páginas de pago
 * B6: Verificar error handling
 * B7: Verificar componente payment-method-buttons
 * B8: Verificar wallet-balance-card
 *
 * Prioridad: P1 (Payment Smoke Tests)
 */

test.describe('Payment Flow Smoke Tests - Checkpoint Architecture', () => {

  test('B1: Verificar carga de booking-payment page', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-smoke-booking-payment', 'Booking payment page', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('smoke-booking-payment-loaded')
    }))

    const result = await block.execute(async () => {
      // Mock de datos necesarios
      await page.route('**/api/bookings/**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'test-booking-123',
            car_id: 'test-car-id',
            status: 'pending_payment',
            total_amount: 20000,
            deposit_amount: 10000,
            car: {
              id: 'test-car-id',
              title: 'Test Car',
              brand: 'Toyota',
              model: 'Corolla',
              year: 2020,
              images: ['https://example.com/car.jpg']
            }
          })
        })
      })

      await page.route('**/api/wallet/balance', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            available: 50000,
            locked: 0
          })
        })
      })

      await page.goto('/bookings/test-booking-123/payment?paymentMethod=wallet')

      await expect(page.getByRole('heading', { name: /completar pago/i })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/test car/i)).toBeVisible()
      await expect(page.getByText(/wallet autorenta/i)).toBeVisible()
      console.log('✅ Booking payment page carga correctamente')

      return { pageLoaded: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Verificar carga de booking-pending page', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-smoke-booking-pending', 'Booking pending page', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.route('**/api/bookings/**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'test-booking-123',
            status: 'pending_payment',
            payment_status: 'pending',
            total_amount: 20000,
            deposit_amount: 10000
          })
        })
      })

      await page.goto('/bookings/test-booking-123/pending')

      await expect(page.getByRole('heading', { name: /procesando tu pago/i })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/verificación/i)).toBeVisible()
      await expect(page.getByText(/no cierres esta ventana/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /ver detalles de la reserva/i })).toBeVisible()
      console.log('✅ Booking pending page carga correctamente')

      return { pendingPageLoaded: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Validar fondos en payment-method-buttons', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-smoke-validate-funds', 'Validar fondos', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.route('**/api/wallet/balance', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            available: 1000,
            locked: 0
          })
        })
      })

      await page.route('**/api/cars/**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'test-car-id',
            title: 'Test Car',
            daily_rate: 10000,
            deposit_amount: 20000
          })
        })
      })

      await page.goto('/cars/test-car-id')

      const dateRangePicker = page.locator('app-date-range-picker')
      await dateRangePicker.click()
      await page.getByRole('button', { name: /siguiente día/i }).first().click()
      await page.getByRole('button', { name: /siguiente día/i }).nth(2).click()

      const walletButton = page.getByRole('button', { name: /wallet autorenta/i })
      await expect(walletButton).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(/fondos insuficientes/i)).toBeVisible({ timeout: 5000 })

      const cardButton = page.getByRole('button', { name: /tarjeta de crédito/i })
      await expect(cardButton).toBeVisible()
      await expect(page.getByText(/⭐.*recomendado/i).first()).toBeVisible()
      console.log('✅ Validación de fondos funcionando')

      return { fundsValidated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Verificar carga de MercadoPago SDK', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-smoke-mp-sdk', 'MercadoPago SDK', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.route('**/api/bookings/**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'test-booking-123',
            status: 'pending_payment',
            total_amount: 20000,
            deposit_amount: 10000
          })
        })
      })

      await page.goto('/bookings/test-booking-123/payment?paymentMethod=credit_card')

      await page.waitForSelector('link[rel="preconnect"][href*="mercadopago"]', { timeout: 5000 })

      await page.waitForFunction(() => {
        return (window as any).MercadoPago !== undefined
      }, { timeout: 15000 })

      await expect(page.locator('app-mercadopago-card-form')).toBeVisible({ timeout: 10000 })
      console.log('✅ MercadoPago SDK cargado correctamente')

      return { sdkLoaded: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Verificar navegación entre páginas de pago', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-smoke-payment-navigation', 'Navegación pagos', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.route('**/api/**', route => {
        const url = route.request().url()

        if (url.includes('/bookings/') && !url.includes('/payment')) {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              id: 'test-booking-123',
              status: 'pending_payment',
              total_amount: 20000
            })
          })
        } else if (url.includes('/wallet/balance')) {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ available: 50000 })
          })
        } else if (url.includes('/cars/')) {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              id: 'test-car-id',
              title: 'Test Car'
            })
          })
        } else {
          route.continue()
        }
      })

      await page.goto('/cars/test-car-id')
      expect(page.url()).toContain('/cars/test-car-id')

      await page.goto('/bookings/test-booking-123/payment')
      expect(page.url()).toContain('/payment')

      const backButton = page.getByRole('button', { name: /volver/i })
      if (await backButton.isVisible()) {
        await backButton.click()
        await page.waitForURL(/\/cars\//, { timeout: 5000 })
      }
      console.log('✅ Navegación entre páginas funcionando')

      return { navigationWorking: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Verificar error handling', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b6-smoke-error-handling', 'Error handling', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.route('**/api/bookings/**', route => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ error: 'Booking not found' })
        })
      })

      await page.goto('/bookings/non-existent-booking/payment')

      await Promise.race([
        expect(page.getByText(/error/i)).toBeVisible({ timeout: 5000 }),
        expect(page.getByText(/no encontrad/i)).toBeVisible({ timeout: 5000 }),
        page.waitForURL(/^(?!.*payment).*$/, { timeout: 5000 })
      ])
      console.log('✅ Error handling funcionando')

      return { errorHandlingWorking: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Payment Components Smoke Tests - Checkpoint Architecture', () => {

  test('B7: Verificar componente payment-method-buttons', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b7-smoke-payment-buttons', 'Payment method buttons', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars/test-car-id')

      await expect(page.getByRole('button', { name: /tarjeta de crédito/i })).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('button', { name: /wallet autorenta/i })).toBeVisible({ timeout: 5000 })
      await expect(page.locator('svg').first()).toBeVisible()
      console.log('✅ Payment method buttons renderizados')

      return { buttonsRendered: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B8: Verificar wallet-balance-card', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b8-smoke-wallet-balance', 'Wallet balance card', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.route('**/api/wallet/balance', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            available: 75000,
            locked: 25000
          })
        })
      })

      await page.route('**/api/bookings/**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'test-booking-123',
            status: 'pending_payment'
          })
        })
      })

      await page.goto('/bookings/test-booking-123/payment?paymentMethod=wallet')

      await expect(page.getByText(/balance disponible.*\$750/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/bloqueado.*\$250/i)).toBeVisible({ timeout: 5000 })
      console.log('✅ Wallet balance card muestra valores correctos')

      return { balanceCardCorrect: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
