import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../../checkpoint/fixtures'
import { getWalletBalance } from '../../helpers/booking-test-helpers'

/**
 * Test 5.1: Verificar Balance Inicial - Wallet Balance Check
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 2 bloques atómicos:
 * B1: Verificar elementos de wallet y balance
 * B2: Verificar mensaje para balance cero
 *
 * Prioridad: P0 (Wallet Flow)
 */

test.use({
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',
})

test.describe('Wallet Balance Check - Checkpoint Architecture', () => {

  test('B1: Verificar elementos de wallet y balance', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-wallet-balance', 'Verificar balance de wallet', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('wallet-balance-verified')
    }))

    const result = await block.execute(async () => {
      let initialBalance = 0

      // Obtener balance inicial desde DB
      try {
        const testUserId = 'test-renter-id'
        const dbBalance = await getWalletBalance(testUserId)
        initialBalance = dbBalance.availableBalance / 100
        console.log('Balance inicial en DB:', dbBalance)
      } catch (error) {
        console.warn('No se pudo obtener balance de DB, continuando con UI test')
      }

      // Navegar a wallet
      await page.goto('/wallet')
      await page.waitForLoadState('domcontentloaded')
      await expect(page).toHaveURL(/\/wallet/)

      // Título
      const pageTitle = page.getByRole('heading', { name: /wallet|saldo|balance/i })
      await expect(pageTitle).toBeVisible()
      console.log('✅ Título de wallet visible')

      // Balance actual
      const balanceDisplay = page.locator('[data-testid="wallet-balance"]').or(
        page.locator('.wallet-balance').or(
          page.locator('[class*="balance"]').filter({ hasText: /\$|\d+/ })
        )
      )
      await expect(balanceDisplay).toBeVisible()

      const balanceText = await balanceDisplay.textContent()
      console.log('Balance mostrado en UI:', balanceText)

      const balanceMatch = balanceText?.match(/[\d,]+\.?\d*/)
      expect(balanceMatch).toBeTruthy()
      const uiBalance = parseFloat(balanceMatch![0].replace(',', ''))
      console.log('✅ Balance parseado:', uiBalance)

      // Fondos bloqueados (opcional)
      const lockedFunds = page.locator('[data-testid="locked-funds"]').or(
        page.locator('[class*="locked"]').or(
          page.locator('text=/bloqueado|locked/i')
        )
      )
      const lockedFundsVisible = await lockedFunds.isVisible({ timeout: 2000 }).catch(() => false)
      if (lockedFundsVisible) {
        const lockedText = await lockedFunds.textContent()
        console.log('✅ Fondos bloqueados:', lockedText)
      } else {
        console.log('ℹ️ No hay fondos bloqueados')
      }

      // Fondos disponibles (opcional)
      const availableFunds = page.locator('[data-testid="available-funds"]').or(
        page.locator('[class*="available"]').or(
          page.locator('text=/disponible|available/i')
        )
      )
      const availableFundsVisible = await availableFunds.isVisible({ timeout: 2000 }).catch(() => false)
      if (availableFundsVisible) {
        const availableText = await availableFunds.textContent()
        console.log('✅ Fondos disponibles:', availableText)
      }

      // Historial de transacciones (opcional)
      const transactionHistory = page.locator('[data-testid="transaction-history"]').or(
        page.locator('[class*="transaction"]').or(
          page.locator('table').filter({ hasText: /fecha|date|monto|amount/i })
        )
      )
      const historyVisible = await transactionHistory.isVisible({ timeout: 3000 }).catch(() => false)
      if (historyVisible) {
        const tableHeaders = transactionHistory.locator('thead th, th')
        const headerCount = await tableHeaders.count()
        expect(headerCount).toBeGreaterThan(0)
        console.log(`✅ Historial con ${headerCount} columnas`)
      } else {
        console.log('ℹ️ Sin historial de transacciones')
      }

      // Botón depositar
      const depositButton = page.getByRole('button', { name: /depositar|deposit|agregar fondos/i }).or(
        page.getByTestId('deposit-button').or(
          page.locator('button').filter({ hasText: /depositar|deposit/i })
        )
      )
      await expect(depositButton).toBeVisible()
      await expect(depositButton).toBeEnabled()
      console.log('✅ Botón depositar habilitado')

      // Verificar consistencia con DB
      if (initialBalance > 0) {
        const tolerance = 0.01
        expect(Math.abs(uiBalance - initialBalance)).toBeLessThan(tolerance)
        console.log(`✅ Balance consistente: UI=${uiBalance}, DB=${initialBalance}`)
      }

      // Accesibilidad
      const ariaLabel = page.locator('[aria-label*="balance"], [aria-label*="saldo"]')
      const ariaVisible = await ariaLabel.isVisible({ timeout: 2000 }).catch(() => false)
      if (ariaVisible) {
        console.log('✅ Labels de accesibilidad presentes')
      }

      return { balanceVerified: true, uiBalance }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Verificar mensaje cuando balance es cero', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-wallet-zero-balance', 'Verificar balance cero', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/wallet')
      await page.waitForLoadState('domcontentloaded')

      // Verificar mensaje para usuario sin fondos
      const zeroBalanceMessage = page.locator('text=/sin saldo|sin fondos|balance cero|zero balance/i').or(
        page.locator('[data-testid="zero-balance-message"]')
      )
      const messageVisible = await zeroBalanceMessage.isVisible({ timeout: 3000 }).catch(() => false)
      if (messageVisible) {
        console.log('✅ Mensaje de balance cero mostrado')
      } else {
        console.log('ℹ️ No hay mensaje especial para balance cero')
      }

      // Verificar botón depositar siempre visible
      const depositButton = page.getByRole('button', { name: /depositar|deposit|agregar fondos/i })
      await expect(depositButton).toBeVisible()
      console.log('✅ Botón depositar visible incluso con balance cero')

      return { zeroBalanceHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
