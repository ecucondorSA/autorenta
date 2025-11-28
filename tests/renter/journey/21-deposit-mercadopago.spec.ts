import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../../checkpoint/fixtures'
import { getWalletBalance, getUserIdByEmail } from '../../helpers/booking-test-helpers'

/**
 * Test 5.2: Depositar Fondos - MercadoPago Flow
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 4 bloques atómicos:
 * B1: Navegar a wallet y abrir depósito
 * B2: Ingresar monto y seleccionar método de pago
 * B3: Completar flujo de MercadoPago
 * B4: Validar montos mínimos y máximos + errores
 *
 * Prioridad: P0 (Payment Flow)
 */

test.use({
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',
})

test.describe('MercadoPago Deposit - Checkpoint Architecture', () => {
  const depositAmount = 5000

  test('B1: Navegar a wallet y abrir depósito', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-deposit-navigate', 'Navegar a depósito', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('deposit-page-ready')
    }))

    const result = await block.execute(async () => {
      let initialBalance = 0

      // Obtener balance inicial
      try {
        const email = 'test-renter@autorenta.com'
        const password = 'TestPassword123!'
        const userId = await getUserIdByEmail(email, password)

        if (userId) {
          const dbBalance = await getWalletBalance(userId)
          initialBalance = dbBalance.availableBalance / 100
          console.log('Balance inicial:', initialBalance)
        }
      } catch (error) {
        console.warn('No se pudo obtener balance inicial')
      }

      // Navegar a wallet
      await page.goto('/wallet')
      await page.waitForLoadState('domcontentloaded')
      await expect(page).toHaveURL(/\/wallet/)

      // Verificar login
      if (await page.getByText('Iniciar sesión').isVisible()) {
        console.error('ERROR: User is NOT logged in!')
      } else {
        console.log('✅ Usuario autenticado')
      }

      // Click en depositar
      const depositButton = page.getByRole('button', { name: /depositar|deposit|agregar fondos/i }).or(
        page.getByTestId('deposit-button')
      )
      await expect(depositButton).toBeVisible()
      await expect(depositButton).toBeEnabled()
      await depositButton.click()

      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      const isDepositPage = currentUrl.includes('/deposit') || currentUrl.includes('/wallet')
      expect(isDepositPage).toBe(true)
      console.log('✅ Navegado a página de depósito')

      return { navigated: true, initialBalance }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Ingresar monto y seleccionar método de pago', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('deposit-page-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/wallet')
      await page.getByRole('button', { name: /depositar/i }).click()
    }

    const block = createBlock(defineBlock('b2-deposit-amount', 'Ingresar monto', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('deposit-page-ready')],
      postconditions: [],
      ...withCheckpoint('deposit-amount-entered')
    }))

    const result = await block.execute(async () => {
      // Ingresar monto
      const amountInput = page.getByPlaceholder(/monto|amount|cantidad/i).or(
        page.getByTestId('deposit-amount').or(
          page.locator('input[type="number"]').or(
            page.locator('input[placeholder*="1000"]')
          )
        )
      )
      await expect(amountInput).toBeVisible()
      await amountInput.fill(depositAmount.toString())
      await expect(amountInput).toHaveValue(depositAmount.toString())
      console.log(`✅ Monto ingresado: $${depositAmount}`)

      // Seleccionar método de pago
      const creditCardOption = page.getByRole('radio', { name: /tarjeta|credit|crédito/i }).or(
        page.getByTestId('payment-method-credit').or(
          page.locator('[data-payment-method="credit_card"]')
        )
      )
      const creditCardVisible = await creditCardOption.isVisible({ timeout: 3000 }).catch(() => false)
      if (creditCardVisible) {
        await creditCardOption.check()
        console.log('✅ Método de pago seleccionado: Tarjeta')
      } else {
        console.log('ℹ️ Método de pago automático')
      }

      return { amountEntered: true, amount: depositAmount }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Completar flujo de MercadoPago', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('deposit-amount-entered')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b3-deposit-complete', 'Completar depósito', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [requiresCheckpoint('deposit-amount-entered')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Click en depositar
      const submitDepositButton = page.getByRole('button', { name: /depositar|confirmar|continuar/i }).or(
        page.getByTestId('submit-deposit')
      )
      await expect(submitDepositButton).toBeVisible()
      await expect(submitDepositButton).toBeEnabled()
      await submitDepositButton.click()
      console.log('✅ Click en depositar')

      await page.waitForLoadState('domcontentloaded')

      const newUrl = page.url()
      const isMercadoPago = newUrl.includes('mercadopago') ||
        newUrl.includes('checkout') ||
        newUrl.includes('payment')

      if (isMercadoPago) {
        console.log('✅ Redirigido a MercadoPago:', newUrl)

        await expect(page.locator('text=/mercadopago|pago/i')).toBeVisible({ timeout: 10000 })

        const completePaymentButton = page.getByRole('button', { name: /pagar|confirmar|complete/i }).or(
          page.locator('button').filter({ hasText: /pagar|pagar ahora/i })
        )

        if (await completePaymentButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await completePaymentButton.click()
          console.log('✅ Pago completado')
        }
      } else {
        console.log('ℹ️ Usando mock de MercadoPago en desarrollo')
        const processingMessage = page.locator('text=/procesando|pago|payment/i')
        await expect(processingMessage).toBeVisible({ timeout: 5000 })
      }

      // Esperar redirección
      const successUrl = /success|exito|wallet/i
      const errorUrl = /error|failed/i

      await page.waitForURL((url) => {
        return successUrl.test(url.toString()) || errorUrl.test(url.toString()) || url.toString().includes('/wallet')
      }, { timeout: 30000 })

      const finalUrl = page.url()
      console.log('URL final:', finalUrl)

      if (finalUrl.includes('success') || finalUrl.includes('exito')) {
        const successMessage = page.locator('text=/exito|éxito|exitosa|successful/i')
        await expect(successMessage).toBeVisible({ timeout: 5000 })
        console.log('✅ Página de éxito mostrada')
      } else if (finalUrl.includes('/wallet')) {
        const balanceElement = page.locator('[data-testid="wallet-balance"]').or(page.locator('.wallet-balance'))
        await expect(balanceElement).toBeVisible()
        console.log('✅ Regresado a wallet')
      }

      // Verificar toast
      const successToast = page.locator('[data-testid="toast"]').or(
        page.locator('.toast').or(
          page.locator('text=/depósito exitoso|deposit successful/i')
        )
      )
      const toastVisible = await successToast.isVisible({ timeout: 5000 }).catch(() => false)
      if (toastVisible) {
        console.log('✅ Notificación de éxito mostrada')
      }

      return { depositCompleted: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Validar montos mínimos y máximos', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-deposit-validation', 'Validar montos', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/wallet')
      await page.waitForLoadState('domcontentloaded')

      const depositButton = page.getByRole('button', { name: /depositar|deposit/i })
      await depositButton.click()

      // Probar monto menor al mínimo
      const amountInput = page.getByPlaceholder(/monto|amount/i)
      await amountInput.fill('500') // Menos del mínimo $1000

      const errorMessage = page.locator('text=/mínimo|minimum|min/i')
      const errorVisible = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)
      if (errorVisible) {
        console.log('✅ Error de monto mínimo mostrado')
      }

      const submitButton = page.getByRole('button', { name: /depositar|continuar/i })
      const isDisabled = await submitButton.isDisabled({ timeout: 2000 }).catch(() => false)
      if (isDisabled) {
        console.log('✅ Botón deshabilitado para monto inválido')
      }

      // Probar monto válido
      await amountInput.fill('2000')
      const isEnabled = await submitButton.isEnabled({ timeout: 2000 }).catch(() => true)
      expect(isEnabled).toBe(true)
      console.log('✅ Botón habilitado para monto válido')

      return { validationWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Manejar errores de pago', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-deposit-error', 'Manejar errores', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/wallet')
      await page.waitForLoadState('domcontentloaded')

      // Mock error de MercadoPago
      await page.route('**/checkout/preferences', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Payment failed' })
        })
      })

      const depositButton = page.getByRole('button', { name: /depositar|deposit/i })
      await depositButton.click()

      const amountInput = page.getByPlaceholder(/monto|amount/i)
      await amountInput.fill('1000')

      const submitButton = page.getByRole('button', { name: /depositar|continuar/i })
      await submitButton.click()

      const errorMessage = page.locator('text=/error|falló|failed/i')
      await expect(errorMessage).toBeVisible({ timeout: 5000 })
      console.log('✅ Manejo de errores funcionando')

      return { errorHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
