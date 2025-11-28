import { test, expect, Page, defineBlock, requiresCheckpoint, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: Flujo Unificado de Pago - Nueva Página booking-payment
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 5 bloques atómicos:
 * B1: Pago con wallet con fondos suficientes
 * B2: Mostrar opciones cuando wallet sin fondos
 * B3: Procesar pago con tarjeta SDK inline
 * B4: Manejar cambio de método de pago
 * B5: Página pending y polling de estado
 *
 * Prioridad: P0 (Unified Payment Flow)
 */

/**
 * Helper: Setup payment mocks
 */
async function setupPaymentMocks(page: Page): Promise<void> {
  await page.route('**/api/bookings', route => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        body: JSON.stringify({
          id: 'test-booking-' + Date.now(),
          status: 'pending_payment',
          car_id: 'test-car-id',
          total_amount: 20000,
          deposit_amount: 10000,
        })
      })
    } else {
      route.continue()
    }
  })

  await page.route('**/api/wallet/balance', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        available: 50000,
        locked: 0,
        total: 50000
      })
    })
  })
}

/**
 * Helper: Fill card form fields
 */
async function fillCardFormFields(
  page: Page,
  data: {
    cardNumber: string
    cardholderName: string
    expirationDate: string
    securityCode: string
    docNumber: string
    docType: string
  }
): Promise<void> {
  await page.waitForSelector('iframe[name*="mp"]', { timeout: 10000 })

  const cardNumberFrame = page.frameLocator('iframe[name*="cardNumber"]').first()
  await cardNumberFrame.locator('input').fill(data.cardNumber)

  const cardholderNameFrame = page.frameLocator('iframe[name*="cardholderName"]').first()
  await cardholderNameFrame.locator('input').fill(data.cardholderName)

  const expirationFrame = page.frameLocator('iframe[name*="expiration"]').first()
  await expirationFrame.locator('input').fill(data.expirationDate)

  const securityCodeFrame = page.frameLocator('iframe[name*="securityCode"]').first()
  await securityCodeFrame.locator('input').fill(data.securityCode)

  await page.selectOption('select[name="docType"]', data.docType)
  await page.fill('input[name="docNumber"]', data.docNumber)
  await page.waitForTimeout(1000)
}

test.describe('Flujo Unificado de Pago - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    await setupPaymentMocks(page)
  })

  test('B1: Pago con wallet con fondos suficientes', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-unified-wallet-sufficient', 'Wallet con fondos', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('unified-wallet-payment-done')
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars/test-car-id')
      await expect(page.getByRole('heading', { name: /detalles/i })).toBeVisible({ timeout: 10000 })

      const dateRangePicker = page.locator('app-date-range-picker')
      await dateRangePicker.click()
      await page.getByRole('button', { name: /siguiente día/i }).first().click()
      await page.getByRole('button', { name: /siguiente día/i }).nth(2).click()

      await page.evaluate(() => {
        sessionStorage.setItem('wallet_balance', JSON.stringify({
          available: 50000,
          locked: 0
        }))
      })

      const walletButton = page.getByRole('button', { name: /wallet autorenta/i })
      await expect(walletButton).toBeVisible()
      await expect(page.getByText(/balance disponible.*\$500/i)).toBeVisible()
      await expect(page.getByText(/fondos suficientes/i)).toBeVisible()

      await walletButton.click()

      await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 15000 })

      await expect(page.getByRole('heading', { name: /completar pago/i })).toBeVisible()
      await expect(page.getByText(/wallet autorenta/i)).toBeVisible()
      await expect(page.getByText(/balance disponible/i)).toBeVisible()

      const confirmButton = page.getByRole('button', { name: /confirmar y bloquear fondos/i })
      await expect(confirmButton).toBeEnabled()
      await confirmButton.click()

      await expect(page.getByText(/procesando tu pago/i)).toBeVisible({ timeout: 3000 })

      await page.waitForURL(/\/bookings\/[a-z0-9-]+\/success/, { timeout: 15000 })
      await expect(page.getByText(/pago procesado exitosamente/i)).toBeVisible()

      console.log('✅ Pago con wallet completado exitosamente')
      return { walletPaymentSuccess: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Mostrar opciones cuando wallet sin fondos', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-unified-wallet-insufficient', 'Wallet sin fondos', {
      priority: 'P0',
      estimatedDuration: 25000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('unified-wallet-options-shown')
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars/test-car-id')
      await expect(page.getByRole('heading', { name: /detalles/i })).toBeVisible({ timeout: 10000 })

      const dateRangePicker = page.locator('app-date-range-picker')
      await dateRangePicker.click()
      await page.getByRole('button', { name: /siguiente día/i }).first().click()
      await page.getByRole('button', { name: /siguiente día/i }).nth(2).click()

      await page.evaluate(() => {
        sessionStorage.setItem('wallet_balance', JSON.stringify({
          available: 5000,
          locked: 0
        }))
      })

      const walletButton = page.getByRole('button', { name: /wallet autorenta/i })
      await expect(walletButton).toBeVisible()
      await expect(page.getByText(/fondos insuficientes/i)).toBeVisible()

      await walletButton.click()

      await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 15000 })

      await expect(page.getByRole('heading', { name: /opciones de pago disponibles/i })).toBeVisible()
      await expect(page.getByText(/tu wallet no tiene fondos suficientes/i)).toBeVisible()

      await expect(page.getByRole('button', { name: /usar saldo actual/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /depositar fondos en wallet/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /pagar con tarjeta/i })).toBeVisible()

      const useSaldoBtn = page.getByRole('button', { name: /usar saldo actual/i })
      await expect(useSaldoBtn).toBeDisabled()

      const payWithCardBtn = page.getByRole('button', { name: /pagar con tarjeta/i })
      await payWithCardBtn.click()

      await expect(page.locator('app-mercadopago-card-form')).toBeVisible({ timeout: 5000 })

      console.log('✅ Opciones mostradas cuando wallet sin fondos')
      return { optionsShown: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Procesar pago con tarjeta SDK inline', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-unified-card-sdk', 'Tarjeta SDK inline', {
      priority: 'P0',
      estimatedDuration: 40000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars/test-car-id')
      await expect(page.getByRole('heading', { name: /detalles/i })).toBeVisible({ timeout: 10000 })

      const dateRangePicker = page.locator('app-date-range-picker')
      await dateRangePicker.click()
      await page.getByRole('button', { name: /siguiente día/i }).first().click()
      await page.getByRole('button', { name: /siguiente día/i }).nth(2).click()

      const cardButton = page.getByRole('button', { name: /tarjeta de crédito/i })
      await cardButton.click()

      await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 15000 })

      await expect(page.getByRole('heading', { name: /pagar con tarjeta/i })).toBeVisible()
      await expect(page.locator('app-mercadopago-card-form')).toBeVisible({ timeout: 5000 })

      await page.waitForFunction(() => {
        return (window as any).MercadoPago !== undefined
      }, { timeout: 10000 })

      await fillCardFormFields(page, {
        cardNumber: '4509 9535 6623 3704',
        cardholderName: 'APRO',
        expirationDate: '11/25',
        securityCode: '123',
        docNumber: '12345678',
        docType: 'DNI',
      })

      const payButton = page.getByRole('button', { name: /pagar/i })
      await expect(payButton).toBeEnabled()
      await payButton.click()

      await expect(page.getByText(/procesando tu pago/i)).toBeVisible({ timeout: 3000 })

      await page.waitForTimeout(2000)
      expect(page.url()).not.toMatch(/mercadopago\.com/)

      await Promise.race([
        page.waitForURL(/\/bookings\/[a-z0-9-]+\/success/, { timeout: 15000 }),
        page.waitForURL(/\/bookings\/[a-z0-9-]+\/pending/, { timeout: 15000 }),
      ])

      const currentUrl = page.url()
      if (currentUrl.includes('/success')) {
        await expect(page.getByText(/pago aprobado/i)).toBeVisible()
      } else if (currentUrl.includes('/pending')) {
        await expect(page.getByText(/procesando tu pago/i)).toBeVisible()
        await expect(page.getByText(/verificación/i)).toBeVisible()
      }

      console.log('✅ Pago con tarjeta SDK inline procesado')
      return { cardPaymentProcessed: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Manejar cambio de método de pago', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-unified-change-method', 'Cambiar método', {
      priority: 'P1',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars/test-car-id')
      await page.evaluate(() => {
        sessionStorage.setItem('wallet_balance', JSON.stringify({
          available: 5000,
          locked: 0
        }))
      })

      const dateRangePicker = page.locator('app-date-range-picker')
      await dateRangePicker.click()
      await page.getByRole('button', { name: /siguiente día/i }).first().click()
      await page.getByRole('button', { name: /siguiente día/i }).nth(2).click()
      await page.getByRole('button', { name: /wallet autorenta/i }).click()

      await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 15000 })
      await expect(page.getByRole('heading', { name: /opciones de pago/i })).toBeVisible()

      const depositButton = page.getByRole('button', { name: /depositar fondos/i })
      await depositButton.click()

      await page.waitForURL(/\/wallet\/deposit/, { timeout: 10000 })
      expect(page.url()).toContain('returnUrl')
      expect(page.url()).toContain('amount')

      await page.goBack()

      await expect(page.getByRole('heading', { name: /opciones de pago/i })).toBeVisible()

      const cardButton = page.getByRole('button', { name: /pagar con tarjeta/i })
      await cardButton.click()

      await expect(page.locator('app-mercadopago-card-form')).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('heading', { name: /pagar con tarjeta/i })).toBeVisible()

      console.log('✅ Cambio de método de pago funcionando')
      return { methodChangeWorking: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Página pending y polling de estado', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-unified-pending-polling', 'Pending y polling', {
      priority: 'P1',
      estimatedDuration: 45000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.route('**/api/payments/**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            status: 'in_process',
            payment_id: 'test-payment-123'
          })
        })
      })

      await page.goto('/cars/test-car-id')
      const dateRangePicker = page.locator('app-date-range-picker')
      await dateRangePicker.click()
      await page.getByRole('button', { name: /siguiente día/i }).first().click()
      await page.getByRole('button', { name: /siguiente día/i }).nth(2).click()
      await page.getByRole('button', { name: /tarjeta de crédito/i }).click()

      await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 15000 })

      await fillCardFormFields(page, {
        cardNumber: '4509 9535 6623 3704',
        cardholderName: 'APRO',
        expirationDate: '11/25',
        securityCode: '123',
        docNumber: '12345678',
        docType: 'DNI',
      })

      await page.getByRole('button', { name: /pagar/i }).click()

      await page.waitForURL(/\/bookings\/[a-z0-9-]+\/pending/, { timeout: 15000 })

      await expect(page.getByRole('heading', { name: /procesando tu pago/i })).toBeVisible()
      await expect(page.getByText(/verificación/i)).toBeVisible()
      await expect(page.getByText(/verificación.*\/30/i)).toBeVisible()
      await expect(page.locator('.animate-pulse')).toBeVisible()

      let pollCount = 0
      await page.route('**/api/bookings/**', route => {
        pollCount++
        if (pollCount >= 2) {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              id: 'booking-123',
              payment_status: 'approved',
              status: 'confirmed'
            })
          })
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              id: 'booking-123',
              payment_status: 'pending',
              status: 'pending_payment'
            })
          })
        }
      })

      await page.waitForURL(/\/bookings\/[a-z0-9-]+\/success/, { timeout: 30000 })
      await expect(page.getByText(/pago aprobado/i)).toBeVisible()

      console.log('✅ Página pending y polling funcionando')
      return { pendingPollingWorking: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
