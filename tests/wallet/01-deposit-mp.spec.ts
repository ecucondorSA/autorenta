import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../checkpoint/fixtures'
import { WalletPage } from '../pages/wallet/WalletPage'
import { WALLET_AMOUNTS } from '../helpers/test-data'

/**
 * E2E Test: Wallet Deposit via MercadoPago
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 10 bloques atómicos:
 * B1: Verificar UI de wallet
 * B2: Navegar a página de depósito
 * B3: Validar requisitos de monto
 * B4: Crear preferencia de MercadoPago
 * B5: Completar flujo de depósito con mock
 * B6: Manejar pago pendiente
 * B7: Manejar pago rechazado
 * B8: Mostrar historial de transacciones
 * B9: Prevenir depósitos concurrentes
 * B10: Manejar errores de red
 *
 * Prioridad: P0 (Critical Payment Flow)
 */

interface DepositContext {
  walletPage?: WalletPage
  initialBalance?: number
}

const ctx: DepositContext = {}

test.describe('Wallet Deposit MercadoPago - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    ctx.walletPage = new WalletPage(page)
    await ctx.walletPage.goto()
    ctx.initialBalance = await ctx.walletPage.getBalance()
  })

  test('B1: Verificar UI de wallet', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-deposit-wallet-ui', 'Verificar UI wallet', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('deposit-wallet-ui-verified')
    }))

    const result = await block.execute(async () => {
      if (!ctx.walletPage || ctx.initialBalance === undefined) {
        return { skipped: true, reason: 'wallet page not initialized' }
      }

      await expect(ctx.walletPage.balanceDisplay).toBeVisible()
      await expect(ctx.walletPage.depositButton).toBeVisible()
      await expect(ctx.walletPage.withdrawButton).toBeVisible()

      expect(ctx.initialBalance).toBeGreaterThan(0)
      console.log(`✅ Wallet UI verificada, balance: ${ctx.initialBalance}`)

      return { uiVerified: true, balance: ctx.initialBalance }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Navegar a página de depósito', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('deposit-wallet-ui-verified')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b2-deposit-navigate', 'Navegar a depósito', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [requiresCheckpoint('deposit-wallet-ui-verified')],
      postconditions: [],
      ...withCheckpoint('deposit-page-loaded')
    }))

    const result = await block.execute(async () => {
      if (!ctx.walletPage) {
        return { skipped: true, reason: 'wallet page not initialized' }
      }

      await ctx.walletPage.clickDeposit()

      await expect(page.getByTestId('deposit-form')).toBeVisible()
      await expect(page.getByTestId('amount-input')).toBeVisible()
      await expect(page.getByTestId('deposit-submit')).toBeVisible()
      console.log('✅ Página de depósito cargada')

      return { depositPageLoaded: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Validar requisitos de monto', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-deposit-validate-amount', 'Validar montos', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.walletPage) {
        return { skipped: true, reason: 'wallet page not initialized' }
      }

      await ctx.walletPage.clickDeposit()

      const testCases = [
        { amount: '0', error: 'monto mínimo' },
        { amount: '-100', error: 'monto positivo' },
        { amount: '500', error: 'mínimo 1000' },
        { amount: '1000000', error: 'máximo' },
      ]

      for (const { amount, error } of testCases) {
        await page.getByTestId('amount-input').fill(amount)
        await page.getByTestId('deposit-submit').click()

        await expect(page.getByTestId('amount-error')).toContainText(error, {
          ignoreCase: true,
        })

        await page.getByTestId('amount-input').clear()
        console.log(`✅ Validación correcta para monto: ${amount}`)
      }

      return { validationsPassed: testCases.length }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Crear preferencia de MercadoPago', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-deposit-create-preference', 'Crear preferencia MP', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('mp-preference-created')
    }))

    const result = await block.execute(async () => {
      if (!ctx.walletPage) {
        return { skipped: true, reason: 'wallet page not initialized' }
      }

      await ctx.walletPage.clickDeposit()

      const depositAmount = WALLET_AMOUNTS?.small || 10000

      await page.getByTestId('amount-input').fill(depositAmount.toString())
      await page.getByTestId('deposit-submit').click()

      await expect(page.getByTestId('creating-preference')).toBeVisible()

      const initPointButton = page.getByTestId('mercadopago-init-point')
      await expect(initPointButton).toBeVisible({ timeout: 10000 })

      const href = await initPointButton.getAttribute('href')
      expect(href).toMatch(/^https:\/\/(www\.)?mercadopago\.com/)
      console.log('✅ Preferencia de MercadoPago creada')

      return { preferenceCreated: true, initPointUrl: href }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Completar flujo de depósito con mock', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-deposit-complete-flow', 'Flujo completo mock', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.walletPage || ctx.initialBalance === undefined) {
        return { skipped: true, reason: 'wallet page not initialized' }
      }

      await ctx.walletPage.clickDeposit()

      const depositAmount = WALLET_AMOUNTS?.small || 10000

      await page.getByTestId('amount-input').fill(depositAmount.toString())
      await page.getByTestId('deposit-submit').click()

      const initPointButton = page.getByTestId('mercadopago-init-point')
      await expect(initPointButton).toBeVisible({ timeout: 10000 })

      const transactionId = await page.getAttribute('[data-transaction-id]', 'data-transaction-id')
      expect(transactionId).toBeTruthy()

      // Simular webhook de MercadoPago
      const response = await page.request.post('/api/webhooks/mercadopago', {
        data: {
          action: 'payment.created',
          data: {
            id: `mock-payment-${Date.now()}`,
          },
        },
      })

      expect(response.ok()).toBeTruthy()
      console.log('✅ Webhook simulado enviado')

      await ctx.walletPage.goto()
      await ctx.walletPage.assertBalance(ctx.initialBalance + depositAmount)
      await ctx.walletPage.assertTransactionVisible('deposit', depositAmount)
      console.log('✅ Depósito completado y verificado')

      return { depositCompleted: true, amount: depositAmount }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Manejar pago pendiente', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b6-deposit-pending', 'Pago pendiente', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.walletPage || ctx.initialBalance === undefined) {
        return { skipped: true, reason: 'wallet page not initialized' }
      }

      await ctx.walletPage.clickDeposit()
      await page.getByTestId('amount-input').fill('15000')
      await page.getByTestId('deposit-submit').click()

      await page.request.post('/api/webhooks/mercadopago', {
        data: {
          action: 'payment.updated',
          data: {
            id: `mock-payment-pending-${Date.now()}`,
            status: 'pending',
          },
        },
      })

      await ctx.walletPage.goto()
      await ctx.walletPage.assertBalance(ctx.initialBalance)

      const pendingTransaction = page.locator('[data-testid="transaction-item"][data-status="pending"]').first()
      await expect(pendingTransaction).toBeVisible()
      console.log('✅ Pago pendiente manejado correctamente')

      return { pendingHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B7: Manejar pago rechazado', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b7-deposit-rejected', 'Pago rechazado', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.walletPage || ctx.initialBalance === undefined) {
        return { skipped: true, reason: 'wallet page not initialized' }
      }

      await ctx.walletPage.clickDeposit()
      await page.getByTestId('amount-input').fill('20000')
      await page.getByTestId('deposit-submit').click()

      await page.request.post('/api/webhooks/mercadopago', {
        data: {
          action: 'payment.updated',
          data: {
            id: `mock-payment-rejected-${Date.now()}`,
            status: 'rejected',
          },
        },
      })

      await ctx.walletPage.goto()
      await ctx.walletPage.assertBalance(ctx.initialBalance)
      await expect(page.getByTestId('deposit-error-notification')).toBeVisible()
      console.log('✅ Pago rechazado manejado correctamente')

      return { rejectedHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B8: Mostrar historial de transacciones', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b8-deposit-history', 'Historial transacciones', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.walletPage) {
        return { skipped: true, reason: 'wallet page not initialized' }
      }

      await ctx.walletPage.goto()
      await expect(ctx.walletPage.transactionList).toBeVisible()

      await ctx.walletPage.filterByType('deposit')

      const depositItems = page.locator('[data-testid="transaction-item"][data-type="deposit"]')
      const count = await depositItems.count()

      if (count > 0) {
        const firstDeposit = depositItems.first()
        await expect(firstDeposit.getByTestId('transaction-amount')).toBeVisible()
        await expect(firstDeposit.getByTestId('transaction-date')).toBeVisible()
        await expect(firstDeposit.getByTestId('transaction-status')).toBeVisible()
      }

      console.log(`✅ Historial mostrado con ${count} depósitos`)
      return { historyDisplayed: true, depositCount: count }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B9: Prevenir depósitos concurrentes', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b9-deposit-concurrent', 'Prevenir concurrentes', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.walletPage) {
        return { skipped: true, reason: 'wallet page not initialized' }
      }

      await ctx.walletPage.clickDeposit()
      await page.getByTestId('amount-input').fill('10000')
      await page.getByTestId('deposit-submit').click()

      await expect(page.getByTestId('creating-preference')).toBeVisible()

      const submitButton = page.getByTestId('deposit-submit')
      await expect(submitButton).toBeDisabled()
      console.log('✅ Depósitos concurrentes prevenidos')

      return { concurrentPrevented: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B10: Manejar errores de red', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b10-deposit-network-error', 'Error de red', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.walletPage) {
        return { skipped: true, reason: 'wallet page not initialized' }
      }

      await ctx.walletPage.clickDeposit()

      await page.route('**/api/wallet/deposit', (route) => {
        route.abort('failed')
      })

      await page.getByTestId('amount-input').fill('10000')
      await page.getByTestId('deposit-submit').click()

      await expect(page.getByTestId('deposit-error')).toBeVisible()
      await expect(page.getByTestId('deposit-error')).toContainText('Error de conexión')
      console.log('✅ Error de red manejado correctamente')

      return { networkErrorHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
